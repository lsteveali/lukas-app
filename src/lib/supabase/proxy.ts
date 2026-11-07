import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { getAuthRedirect } from '@/lib/auth/routes';
import type { Database } from '@/types/database';

import { getSupabaseEnv } from './env';

/**
 * Refreshes the Supabase auth session, syncs its cookies between the request
 * and the response, and applies the route rules from getAuthRedirect():
 * signed-out users go to /login?next=..., signed-in users leave /login.
 * Called from src/proxy.ts on every matched request.
 */
export async function updateSession(request: NextRequest) {
  const { url, publishableKey } = getSupabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        // Prevent CDNs from caching responses that carry auth cookies.
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Do not add code between createServerClient and getClaims(): it must run
  // first so an expired token is refreshed before anything reads the session.
  const { data } = await supabase.auth.getClaims();

  const target = getAuthRedirect({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    isAuthenticated: Boolean(data?.claims),
  });
  if (!target) return response;

  return redirectKeepingSession(request, response, target);
}

/**
 * Builds a redirect that carries over any cookies and cache headers Supabase
 * set while refreshing the token; dropping them would lose the new session.
 */
function redirectKeepingSession(request: NextRequest, from: NextResponse, target: string) {
  const redirect = NextResponse.redirect(new URL(target, request.url));
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  ['cache-control', 'expires', 'pragma'].forEach((name) => {
    const value = from.headers.get(name);
    if (value) redirect.headers.set(name, value);
  });
  return redirect;
}
