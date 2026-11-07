import { describe, expect, it } from 'vitest';

import {
  currentMonthInBogota,
  formatMonthLabel,
  formatShortDate,
  isValidIsoDate,
  monthRange,
  parseMonthParam,
  shiftMonth,
  toMonthParam,
  todayInBogota,
} from './dates';

// 2026-11-08 01:30 UTC is still 2026-11-07 20:30 in Bogotá (UTC-5).
const LATE_NIGHT_BOGOTA = new Date('2026-11-08T01:30:00Z');
// New Year's in UTC, still Dec 31 in Bogotá.
const NEW_YEAR_UTC = new Date('2027-01-01T03:00:00Z');

describe('todayInBogota', () => {
  it('uses Bogotá time, not UTC', () => {
    expect(todayInBogota(LATE_NIGHT_BOGOTA)).toBe('2026-11-07');
  });

  it('handles year boundaries', () => {
    expect(todayInBogota(NEW_YEAR_UTC)).toBe('2026-12-31');
    expect(currentMonthInBogota(NEW_YEAR_UTC)).toEqual({ year: 2026, month: 12 });
  });
});

describe('isValidIsoDate', () => {
  it.each(['2026-11-07', '2024-02-29', '2026-12-31'])('accepts %s', (value) => {
    expect(isValidIsoDate(value)).toBe(true);
  });

  it.each(['2026-02-29', '2026-13-01', '2026-11-31', '2026-1-7', '07/11/2026', ''])(
    'rejects %j',
    (value) => {
      expect(isValidIsoDate(value)).toBe(false);
    },
  );
});

describe('parseMonthParam', () => {
  it('reads a valid month', () => {
    expect(parseMonthParam('2026-03', LATE_NIGHT_BOGOTA)).toEqual({ year: 2026, month: 3 });
  });

  it.each([undefined, '', '2026-13', '2026-00', '26-11', 'noviembre', '1999-01'])(
    'falls back to the current Bogotá month for %j',
    (value) => {
      expect(parseMonthParam(value, LATE_NIGHT_BOGOTA)).toEqual({ year: 2026, month: 11 });
    },
  );
});

describe('month helpers', () => {
  it('formats the URL param with two-digit months', () => {
    expect(toMonthParam({ year: 2026, month: 3 })).toBe('2026-03');
  });

  it('shifts across years', () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });

  it('builds an end-exclusive range', () => {
    expect(monthRange({ year: 2026, month: 11 })).toEqual({
      start: '2026-11-01',
      end: '2026-12-01',
    });
    expect(monthRange({ year: 2026, month: 12 })).toEqual({
      start: '2026-12-01',
      end: '2027-01-01',
    });
  });
});

describe('formatting', () => {
  it('labels a month in Spanish', () => {
    expect(formatMonthLabel({ year: 2026, month: 11 })).toBe('noviembre de 2026');
  });

  it('formats the first day of a month without shifting to the previous day', () => {
    expect(formatShortDate('2026-11-01')).toBe('1 de nov');
    expect(formatShortDate('2026-01-31')).toBe('31 de ene');
  });
});
