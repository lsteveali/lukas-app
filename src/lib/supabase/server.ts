import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { connection } from 'next/server';

import type { Database } from '@/types/database';

import { getSupabaseEnv } from './env';

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Create a new client per request; never share one between requests.
 */
export async function createClient() {
  // Read cookies first: it marks the render as request-time, so prerendering
  // at build time stops here instead of failing on missing env vars.
  const cookieStore = await cookies();
  // supabase-js reads Date.now() when it loads the session (token expiry).
  // Cookies alone still allow a runtime prerender (partialPrefetching), where
  // the current time is not allowed: connection() defers to request time.
  await connection();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot set cookies. Safe to ignore: the proxy
          // (src/proxy.ts) refreshes the session on every request.
        }
      },
    },
  });
}
