import { describe, expect, it } from 'vitest';

import { getAuthRedirect } from './routes';

const signedOut = (pathname: string, search = '') =>
  getAuthRedirect({ pathname, search, isAuthenticated: false });
const signedIn = (pathname: string, search = '') =>
  getAuthRedirect({ pathname, search, isAuthenticated: true });

describe('getAuthRedirect — signed out', () => {
  it.each(['/dashboard', '/transacciones', '/metas', '/grupos/abc', '/una-ruta-nueva'])(
    'sends %s to /login with next',
    (pathname) => {
      expect(signedOut(pathname)).toBe(`/login?next=${encodeURIComponent(pathname)}`);
    },
  );

  it('keeps the query string in next', () => {
    expect(signedOut('/transacciones', '?mes=2026-11')).toBe(
      '/login?next=%2Ftransacciones%3Fmes%3D2026-11',
    );
  });

  it.each(['/', '/login', '/registro', '/auth/callback', '/auth/confirm'])(
    'lets the public route %s through',
    (pathname) => {
      expect(signedOut(pathname)).toBeNull();
    },
  );

  it('does not treat lookalike prefixes as public', () => {
    expect(signedOut('/authors')).toBe('/login?next=%2Fauthors');
    expect(signedOut('/login-extra')).toBe('/login?next=%2Flogin-extra');
  });
});

describe('getAuthRedirect — signed in', () => {
  it.each(['/login', '/registro'])('sends %s to /dashboard', (pathname) => {
    expect(signedIn(pathname)).toBe('/dashboard');
  });

  it('honours a safe next on /login', () => {
    expect(signedIn('/login', '?next=%2Ftransacciones%3Fmes%3D2026-11')).toBe(
      '/transacciones?mes=2026-11',
    );
  });

  it.each(['?next=https://evil.com', '?next=//evil.com', '?next=/%09/evil.com'])(
    'ignores an unsafe next (%s)',
    (search) => {
      expect(signedIn('/login', search)).toBe('/dashboard');
    },
  );

  it.each(['/', '/dashboard', '/transacciones', '/auth/callback'])(
    'lets %s through',
    (pathname) => {
      expect(signedIn(pathname)).toBeNull();
    },
  );
});
