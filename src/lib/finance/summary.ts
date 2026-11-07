import type { TransactionType } from '@/lib/validations/transaction';

// Pure, server-side calculations for the monthly dashboard. Amounts are
// integer pesos (CLAUDE.md, rule 1); percentages are only for display.

export type SummaryTransaction = {
  type: TransactionType;
  amount: number;
  category_id: string | null;
  category: { name: string; color: string | null } | null;
};

export type MonthSummary = { income: number; expense: number; balance: number };

export type ExpenseSlice = {
  key: string;
  name: string;
  color: string;
  amount: number;
  /** Whole-number percentage; all slices add up to exactly 100. */
  percent: number;
};

export const MAX_SLICES = 5;
/** Groups the categories beyond the top slices ("Otros" is a real category). */
export const REST_LABEL = 'Demás categorías';
export const REST_COLOR = '#9CA3AF';
const UNCATEGORIZED_LABEL = 'Sin categoría';
const UNCATEGORIZED_COLOR = '#6B7280';

function safeAdd(a: number, b: number): number {
  const sum = a + b;
  if (!Number.isSafeInteger(sum)) {
    throw new RangeError('Monthly total is not a safe integer number of pesos');
  }
  return sum;
}

export function summarizeMonth(transactions: SummaryTransaction[]): MonthSummary {
  let income = 0;
  let expense = 0;
  for (const transaction of transactions) {
    if (transaction.type === 'income') income = safeAdd(income, transaction.amount);
    else expense = safeAdd(expense, transaction.amount);
  }
  return { income, expense, balance: income - expense };
}

/**
 * Whole-number percentages that add up to exactly 100 (largest remainder
 * method), so the legend never shows 33 % + 33 % + 33 %.
 */
export function wholePercentages(amounts: number[]): number[] {
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  if (total <= 0) return amounts.map(() => 0);

  const exact = amounts.map((amount) => (amount / total) * 100);
  const result = exact.map(Math.floor);
  let remaining = 100 - result.reduce((sum, value) => sum + value, 0);

  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const { index } of byRemainder) {
    if (remaining <= 0) break;
    result[index] = (result[index] ?? 0) + 1;
    remaining -= 1;
  }
  return result;
}

/**
 * Expenses grouped by category, largest first. The top `maxSlices` keep their
 * own slice and colour; the rest are merged into "Demás categorías".
 */
export function expensesByCategory(
  transactions: SummaryTransaction[],
  maxSlices: number = MAX_SLICES,
): ExpenseSlice[] {
  const groups = new Map<string, { name: string; color: string; amount: number }>();
  for (const transaction of transactions) {
    if (transaction.type !== 'expense') continue;
    const key = transaction.category_id ?? 'none';
    const current = groups.get(key) ?? {
      name: transaction.category?.name ?? UNCATEGORIZED_LABEL,
      color: transaction.category?.color ?? UNCATEGORIZED_COLOR,
      amount: 0,
    };
    current.amount = safeAdd(current.amount, transaction.amount);
    groups.set(key, current);
  }

  const sorted = [...groups.entries()]
    .map(([key, group]) => ({ key, ...group }))
    // Largest first; ties by name so the order is stable between renders.
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'es'));

  const top = sorted.slice(0, maxSlices);
  const rest = sorted.slice(maxSlices);
  const slices = rest.length
    ? [
        ...top,
        {
          key: 'rest',
          name: REST_LABEL,
          color: REST_COLOR,
          amount: rest.reduce((sum, group) => safeAdd(sum, group.amount), 0),
        },
      ]
    : top;

  const percents = wholePercentages(slices.map((slice) => slice.amount));
  return slices.map((slice, index) => ({ ...slice, percent: percents[index] ?? 0 }));
}
