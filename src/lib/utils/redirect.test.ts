import { describe, expect, it } from 'vitest';

import { DEFAULT_AFTER_LOGIN, safeNextPath } from './redirect';

describe('safeNextPath', () => {
  it('keeps same-site paths', () => {
    expect(safeNextPath('/transacciones?mes=2026-11')).toBe('/transacciones?mes=2026-11');
  });

  it.each([null, undefined, '', 'https://evil.com', '//evil.com', '/\\evil.com', 'dashboard'])(
    'falls back to the default for %s',
    (value) => {
      expect(safeNextPath(value)).toBe(DEFAULT_AFTER_LOGIN);
    },
  );
});
