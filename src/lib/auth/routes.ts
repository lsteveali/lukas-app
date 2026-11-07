import { safeNextPath } from '@/lib/utils/redirect';

export const LOGIN_PATH = '/login';

/** Pages for signed-out users; signed-in users are sent away from them. */
const AUTH_PAGES = new Set([LOGIN_PATH, '/registro']);

/**
 * Public routes. Everything else requires a session (deny by default), so new
 * routes under the (app) group are protected without being listed here.
 */
function isPublicPath(pathname: string): boolean {
  return (
    pathname === '/' ||
    AUTH_PAGES.has(pathname) ||
    pathname === '/auth' ||
    pathname.startsWith('/auth/')
  );
}

type AuthRedirectInput = {
  pathname: string;
  /** Query string including the leading `?`, or an empty string. */
  search: string;
  isAuthenticated: boolean;
};

/**
 * Decides whether a request must be redirected because of the session state.
 * Returns the redirect target (a same-site path) or null to let it through.
 */
export function getAuthRedirect({
  pathname,
  search,
  isAuthenticated,
}: AuthRedirectInput): string | null {
  if (!isAuthenticated && !isPublicPath(pathname)) {
    const next = encodeURIComponent(pathname + search);
    return `${LOGIN_PATH}?next=${next}`;
  }

  if (isAuthenticated && AUTH_PAGES.has(pathname)) {
    return safeNextPath(new URLSearchParams(search).get('next'));
  }

  return null;
}
