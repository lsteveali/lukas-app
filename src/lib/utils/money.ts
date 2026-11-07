// Money is always an integer number of Colombian pesos (see CLAUDE.md, rule 1).

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/**
 * Formats an integer amount of pesos: 15000 → "$ 15.000".
 * The space after "$" is a non-breaking space (U+00A0) from Intl, so the sign
 * never wraps onto a different line than the number.
 * Throws for non-integers instead of rounding them silently.
 */
export function formatCOP(amount: number): string {
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError(`formatCOP expects a safe integer amount of pesos, got ${amount}`);
  }
  return copFormatter.format(amount);
}

// Either plain digits ("15000") or digits grouped by dots every three ("15.000").
const PLAIN_OR_GROUPED = /^(?:\d+|\d{1,3}(?:\.\d{3})+)$/;
// Leading "$" plus any spaces, including the non-breaking ones Intl outputs.
const CURRENCY_PREFIX = /^\$[\s  ]*/;

/**
 * Parses what a user types as an amount of pesos into an integer.
 * Accepts "15.000", "15000", "$15.000", "$ 15.000" and formatCOP's output.
 * Returns null for anything else (empty, letters, negatives, decimals such as
 * "15,50", or misplaced dots such as "1.5") instead of guessing.
 */
export function parseCOP(input: string): number | null {
  const digits = input.trim().replace(CURRENCY_PREFIX, '');
  if (!PLAIN_OR_GROUPED.test(digits)) return null;

  const amount = Number(digits.replaceAll('.', ''));
  return Number.isSafeInteger(amount) ? amount : null;
}
