import { headers } from 'next/headers';

/**
 * Origin of the current request (e.g. `http://localhost:3000` or the Vercel
 * domain), used to build auth redirect URLs. Supabase only accepts URLs that
 * are listed in Authentication → URL Configuration → Redirect URLs.
 */
export async function getRequestOrigin(): Promise<string> {
  const headerList = await headers();
  const origin = headerList.get('origin');
  if (origin) return origin;

  const host = headerList.get('x-forwarded-host') ?? headerList.get('host');
  const protocol = headerList.get('x-forwarded-proto') ?? 'https';
  if (!host) throw new Error('Cannot determine request origin: missing Host header.');
  return `${protocol}://${host}`;
}
