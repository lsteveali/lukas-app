import { describe, expect, it, vi } from 'vitest';

vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');

const { config } = await import('./proxy');
const [pattern] = config.matcher;
const matcher = new RegExp(`^${pattern}$`);

describe('proxy matcher', () => {
  it.each([
    '/',
    '/dashboard',
    '/transacciones?mes=2026-11',
    '/grupos/viaje-png',
    '/transacciones/regalo-ico',
    '/auth/callback',
  ])('runs the proxy on %s', (path) => {
    expect(matcher.test(path.split('?')[0] ?? path)).toBe(true);
  });

  it.each(['/_next/static/chunk.js', '/_next/image', '/favicon.ico', '/logo.png', '/icons/a.svg'])(
    'skips the static file %s',
    (path) => {
      expect(matcher.test(path)).toBe(false);
    },
  );
});
