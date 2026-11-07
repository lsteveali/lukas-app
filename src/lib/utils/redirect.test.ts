import { describe, expect, it } from 'vitest';

import { DEFAULT_AFTER_LOGIN, safeNextPath } from './redirect';

describe('safeNextPath', () => {
  it.each(['/dashboard', '/transacciones?mes=2026-11', '/grupos/abc#gastos'])(
    'keeps the same-site path %s',
    (value) => {
      expect(safeNextPath(value)).toBe(value);
    },
  );

  it('keeps encoded slashes as a same-site path', () => {
    expect(safeNextPath('/%2F%2Fevil.com')).toBe('/%2F%2Fevil.com');
  });

  it.each([
    null,
    undefined,
    '',
    'dashboard',
    'https://evil.com',
    'javascript:alert(1)',
    '//evil.com',
    '/\\evil.com',
    '/\t/evil.com',
    '/\n/evil.com',
    '/\r\n/evil.com',
  ])('falls back to the default for %j', (value) => {
    expect(safeNextPath(value)).toBe(DEFAULT_AFTER_LOGIN);
  });

  it.each(['/login', '/registro', '/login?next=/dashboard'])(
    'does not send users back to an auth page (%s)',
    (value) => {
      expect(safeNextPath(value)).toBe(DEFAULT_AFTER_LOGIN);
    },
  );
});
