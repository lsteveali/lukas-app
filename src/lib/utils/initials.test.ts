import { describe, expect, it } from 'vitest';

import { getInitials } from './initials';

describe('getInitials', () => {
  it.each([
    ['Ana María Gómez', 'AG'],
    ['steve', 'S'],
    ['  Lukas   App  ', 'LA'],
    ['Ángela Núñez', 'ÁN'],
    ['', '?'],
    [null, '?'],
  ])('%j → %j', (name, expected) => {
    expect(getInitials(name)).toBe(expected);
  });
});
