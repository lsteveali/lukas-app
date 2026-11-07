export const DEFAULT_AFTER_LOGIN = '/dashboard';

/**
 * Returns `next` only when it is a same-site path (e.g. `/transacciones`).
 * Anything else (absolute URLs, `//evil.com`, `/\evil.com`) falls back to the
 * default, so login links cannot redirect users to another site.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return DEFAULT_AFTER_LOGIN;
  }
  return next;
}
