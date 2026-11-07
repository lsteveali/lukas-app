import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type CookieToSet = { name: string; value: string; options: Record<string, unknown> };
type CookieMethods = {
  setAll: (cookies: CookieToSet[], headers: Record<string, string>) => void;
};

// Controls what the mocked Supabase client reports for each test.
const state: { claims: object | null; refreshed: CookieToSet[] } = {
  claims: null,
  refreshed: [],
};

vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, { cookies }: { cookies: CookieMethods }) => ({
    auth: {
      getClaims: async () => {
        // Simulate a token refresh writing new cookies during getClaims().
        if (state.refreshed.length > 0) {
          cookies.setAll(state.refreshed, { 'Cache-Control': 'private, no-store' });
        }
        return { data: state.claims ? { claims: state.claims } : null, error: null };
      },
    },
  }),
}));

vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');

const { updateSession } = await import('./proxy');

const request = (path: string) => new NextRequest(new URL(path, 'http://localhost:3000'));

beforeEach(() => {
  state.claims = null;
  state.refreshed = [];
});

describe('updateSession', () => {
  it('redirects signed-out users from a protected route to /login with next', async () => {
    const response = await updateSession(request('/transacciones?mes=2026-11'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?next=%2Ftransacciones%3Fmes%3D2026-11',
    );
  });

  it('lets signed-out users open /login', async () => {
    const response = await updateSession(request('/login'));
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('redirects signed-in users away from /login to a safe next', async () => {
    state.claims = { sub: 'user-1' };
    const response = await updateSession(request('/login?next=%2Fmetas'));
    expect(response.headers.get('location')).toBe('http://localhost:3000/metas');
  });

  it('ignores an external next for signed-in users', async () => {
    state.claims = { sub: 'user-1' };
    const response = await updateSession(request('/registro?next=https://evil.com'));
    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  it('lets signed-in users through to protected routes', async () => {
    state.claims = { sub: 'user-1' };
    const response = await updateSession(request('/dashboard'));
    expect(response.headers.get('location')).toBeNull();
  });

  it('keeps refreshed session cookies and cache headers on the redirect', async () => {
    state.claims = { sub: 'user-1' };
    state.refreshed = [
      { name: 'sb-test-auth-token', value: 'new-token', options: { path: '/', httpOnly: true } },
    ];
    const response = await updateSession(request('/login'));
    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard');
    expect(response.cookies.get('sb-test-auth-token')?.value).toBe('new-token');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
});
