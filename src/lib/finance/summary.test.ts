import { describe, expect, it } from 'vitest';

import {
  expensesByCategory,
  REST_COLOR,
  REST_LABEL,
  summarizeMonth,
  wholePercentages,
  type SummaryTransaction,
} from './summary';

const expense = (
  amount: number,
  id: string | null,
  name = id ?? '',
  color = '#000000',
): SummaryTransaction => ({
  type: 'expense',
  amount,
  category_id: id,
  category: id ? { name, color } : null,
});
const income = (amount: number): SummaryTransaction => ({
  type: 'income',
  amount,
  category_id: 'salary',
  category: { name: 'Salario', color: '#16A34A' },
});

describe('summarizeMonth', () => {
  it('adds income and expenses as integers', () => {
    expect(
      summarizeMonth([income(1_300_000), expense(15_000, 'food'), expense(5_000, 'bus')]),
    ).toEqual({ income: 1_300_000, expense: 20_000, balance: 1_280_000 });
  });

  it('allows a negative balance', () => {
    expect(summarizeMonth([income(100_000), expense(250_000, 'rent')])).toEqual({
      income: 100_000,
      expense: 250_000,
      balance: -150_000,
    });
  });

  it('returns zeros for an empty month', () => {
    expect(summarizeMonth([])).toEqual({ income: 0, expense: 0, balance: 0 });
  });

  it('throws instead of returning an unsafe total', () => {
    expect(() =>
      summarizeMonth([income(Number.MAX_SAFE_INTEGER), income(Number.MAX_SAFE_INTEGER)]),
    ).toThrow(RangeError);
  });
});

describe('wholePercentages', () => {
  it('always adds up to 100', () => {
    expect(wholePercentages([1, 1, 1])).toEqual([34, 33, 33]);
    expect(wholePercentages([2, 1])).toEqual([67, 33]);
  });

  it('can leave a tiny share at 0', () => {
    const result = wholePercentages([999_000, 1_000]);
    expect(result).toEqual([100, 0]);
  });

  it('returns zeros when the total is zero', () => {
    expect(wholePercentages([])).toEqual([]);
    expect(wholePercentages([0, 0])).toEqual([0, 0]);
  });
});

describe('expensesByCategory', () => {
  it('groups by category, ignores income and sorts largest first', () => {
    const slices = expensesByCategory([
      expense(10_000, 'bus', 'Transporte', '#3B82F6'),
      expense(40_000, 'food', 'Comida', '#F97316'),
      expense(50_000, 'bus', 'Transporte', '#3B82F6'),
      income(1_000_000),
    ]);
    expect(slices).toEqual([
      { key: 'bus', name: 'Transporte', color: '#3B82F6', amount: 60_000, percent: 60 },
      { key: 'food', name: 'Comida', color: '#F97316', amount: 40_000, percent: 40 },
    ]);
  });

  it('breaks ties by name so the order is stable', () => {
    const slices = expensesByCategory([
      expense(30_000, 'bus', 'Transporte'),
      expense(30_000, 'food', 'Comida'),
    ]);
    expect(slices.map((slice) => slice.name)).toEqual(['Comida', 'Transporte']);
  });

  it('keeps the top 5 and merges the rest into "Demás categorías"', () => {
    const slices = expensesByCategory([
      expense(70_000, 'a'),
      expense(60_000, 'b'),
      expense(50_000, 'c'),
      expense(40_000, 'd'),
      expense(30_000, 'e'),
      expense(20_000, 'f'),
      expense(10_000, 'g'),
    ]);
    expect(slices.map((slice) => slice.key)).toEqual(['a', 'b', 'c', 'd', 'e', 'rest']);
    expect(slices.at(-1)).toMatchObject({ name: REST_LABEL, color: REST_COLOR, amount: 30_000 });
    expect(slices.reduce((sum, slice) => sum + slice.percent, 0)).toBe(100);
  });

  it('does not add "Demás categorías" with 5 or fewer categories', () => {
    const slices = expensesByCategory(['a', 'b', 'c', 'd', 'e'].map((id) => expense(1_000, id)));
    expect(slices).toHaveLength(5);
    expect(slices.some((slice) => slice.key === 'rest')).toBe(false);
  });

  it('labels expenses without a category', () => {
    expect(expensesByCategory([expense(5_000, null)])).toEqual([
      { key: 'none', name: 'Sin categoría', color: '#6B7280', amount: 5_000, percent: 100 },
    ]);
  });

  it('returns no slices when there are no expenses', () => {
    expect(expensesByCategory([income(500_000)])).toEqual([]);
  });
});
