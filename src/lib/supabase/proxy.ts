import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import type { Database } from '@/types/database';

import { getSupabaseEnv } from './env';

/**
 * Refreshes the Supabase auth session and syncs its cookies between the
 * request and the response. Called from src/proxy.ts on every matched request.
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
  await supabase.auth.getClaims();

  return response;
}
