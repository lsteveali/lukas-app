import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
