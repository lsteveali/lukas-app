export const DEFAULT_AFTER_LOGIN = '/dashboard';

/** Pages that must never be a post-login destination (would loop). */
const AUTH_PAGES = ['/login', '/registro'];

// Placeholder origin used only to check where `next` resolves.
const PROBE_ORIGIN = 'http://localhost';

/**
 * Returns `next` only when it is a same-site path (e.g. `/transacciones?mes=11`).
 * Anything else falls back to /dashboard, so login links cannot redirect users
 * to another site (open redirect). Besides the prefix checks it resolves the
 * value like a browser would: browsers strip tabs/newlines, so `/\t/evil.com`
 * becomes `//evil.com` and must be rejected too.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return DEFAULT_AFTER_LOGIN;
  }

  let url: URL;
  try {
    url = new URL(next, PROBE_ORIGIN);
  } catch {
    return DEFAULT_AFTER_LOGIN;
  }
  if (url.origin !== PROBE_ORIGIN) return DEFAULT_AFTER_LOGIN;
  if (AUTH_PAGES.includes(url.pathname)) return DEFAULT_AFTER_LOGIN;

  return url.pathname + url.search + url.hash;
}
