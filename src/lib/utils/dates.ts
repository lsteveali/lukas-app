// Dates are handled as plain `YYYY-MM-DD` strings in the America/Bogota time
// zone (see CLAUDE.md). Never use the server clock's local date: on Vercel it
// is UTC, which is already "tomorrow" after 7 p.m. in Bogotá.

export const APP_TIME_ZONE = 'America/Bogota';

export type YearMonth = { year: number; month: number }; // month: 1-12

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_PARAM = /^(\d{4})-(\d{2})$/;

const pad = (value: number) => String(value).padStart(2, '0');

/** Today's date in Bogotá as `YYYY-MM-DD`. */
export function todayInBogota(now: Date = new Date()): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Current month in Bogotá. */
export function currentMonthInBogota(now: Date = new Date()): YearMonth {
  const [year, month] = todayInBogota(now).split('-').map(Number) as [number, number];
  return { year, month };
}

/** True for a real calendar date written as `YYYY-MM-DD`. */
export function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * Reads the `?mes=YYYY-MM` param. Anything missing or invalid falls back to
 * the current month in Bogotá, so a bad link still shows a sensible page.
 */
export function parseMonthParam(value: string | undefined, now: Date = new Date()): YearMonth {
  const match = value ? MONTH_PARAM.exec(value) : null;
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12) return { year, month };
  }
  return currentMonthInBogota(now);
}

/** `{ year: 2026, month: 11 }` → `"2026-11"`, the format used in the URL. */
export function toMonthParam({ year, month }: YearMonth): string {
  return `${year}-${pad(month)}`;
}

/** Moves a month forward or backward, crossing years as needed. */
export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** Date range for a month, end exclusive: use `date >= start and date < end`. */
export function monthRange(month: YearMonth): { start: string; end: string } {
  const next = shiftMonth(month, 1);
  return {
    start: `${month.year}-${pad(month.month)}-01`,
    end: `${next.year}-${pad(next.month)}-01`,
  };
}

// Calendar dates carry no time, so they are formatted in UTC to avoid
// shifting a day when converting to a timestamp.
const monthLabelFormatter = new Intl.DateTimeFormat('es-CO', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const shortDateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/** `{ year: 2026, month: 11 }` → `"noviembre de 2026"`. */
export function formatMonthLabel({ year, month }: YearMonth): string {
  return monthLabelFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
}

/** `"2026-11-07"` → `"7 de nov"` (es-CO short date, trailing dot removed). */
export function formatShortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number];
  return shortDateFormatter.format(new Date(Date.UTC(y, m - 1, d))).replace('.', '');
}

const longDateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** `"2026-12-31"` → `"31 de dic de 2026"` (short month, with year). */
export function formatLongDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number];
  return longDateFormatter.format(new Date(Date.UTC(y, m - 1, d))).replace('.', '');
}
