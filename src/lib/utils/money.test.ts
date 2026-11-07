import { describe, expect, it } from 'vitest';

import { formatAmountInput, formatCOP, parseCOP } from './money';

// Intl puts a non-breaking space (U+00A0) between "$" and the number.
const NBSP = ' ';

describe('formatCOP', () => {
  it.each([
    [15000, `$${NBSP}15.000`],
    [0, `$${NBSP}0`],
    [500, `$${NBSP}500`],
    [1234567, `$${NBSP}1.234.567`],
    [-2500, `-$${NBSP}2.500`],
  ])('formats %d as %j', (amount, expected) => {
    expect(formatCOP(amount)).toBe(expected);
  });

  it('reads as "$ 15.000" once the non-breaking space is normalized', () => {
    expect(formatCOP(15000).replace(NBSP, ' ')).toBe('$ 15.000');
  });

  it.each([999.6, 0.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'throws for the non-integer or unsafe amount %d',
    (amount) => {
      expect(() => formatCOP(amount)).toThrow(RangeError);
    },
  );
});

describe('parseCOP', () => {
  it.each([
    ['15.000', 15000],
    ['15000', 15000],
    ['$15.000', 15000],
    ['$ 15.000', 15000],
    [`$${NBSP}15.000`, 15000],
    ['  15.000  ', 15000],
    ['1.234.567', 1234567],
    ['500', 500],
    ['0', 0],
  ])('parses %j as %d', (input, expected) => {
    expect(parseCOP(input)).toBe(expected);
  });

  it.each([
    '',
    '   ',
    '$',
    'abc',
    '15 mil',
    '-15.000',
    '15,50',
    '15,000',
    '1.5',
    '15.00',
    '1500.000',
    '.500',
    '15.',
    '15..000',
    '9007199254740993',
  ])('returns null for %j', (input) => {
    expect(parseCOP(input)).toBeNull();
  });

  it.each([0, 1, 999, 1000, 15000, 1234567, Number.MAX_SAFE_INTEGER])(
    'round-trips formatCOP(%d)',
    (amount) => {
      expect(parseCOP(formatCOP(amount))).toBe(amount);
    },
  );
});

describe('formatAmountInput', () => {
  it.each([
    [0, '0'],
    [500, '500'],
    [1000, '1.000'],
    [15000, '15.000'],
    [1234567, '1.234.567'],
  ])('formats %d as %j without the currency sign', (amount, expected) => {
    expect(formatAmountInput(amount)).toBe(expected);
  });

  it.each([1, 999, 1000, 15000, 1_000_000_000])('round-trips %d through parseCOP', (amount) => {
    expect(parseCOP(formatAmountInput(amount))).toBe(amount);
  });

  it('throws for non-integers', () => {
    expect(() => formatAmountInput(10.5)).toThrow(RangeError);
  });
});
