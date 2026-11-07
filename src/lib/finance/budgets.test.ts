import { describe, expect, it } from 'vitest';

import {
  availableCategories,
  getBudgetUsage,
  NO_CATEGORY,
  spentByCategory,
  summarizeBudgets,
} from './budgets';

const expense = (amount: number, category_id: string | null) => ({
  type: 'expense',
  amount,
  category_id,
});

describe('spentByCategory', () => {
  it('adds expenses per category and ignores income', () => {
    const spent = spentByCategory([
      expense(10_000, 'food'),
      expense(5_000, 'food'),
      expense(3_000, 'bus'),
      { type: 'income', amount: 1_000_000, category_id: 'salary' },
      expense(2_000, null),
    ]);
    expect(Object.fromEntries(spent)).toEqual({ food: 15_000, bus: 3_000, [NO_CATEGORY]: 2_000 });
  });
});

describe('getBudgetUsage', () => {
  it.each([
    [0, 'ok', 0, 300_000],
    [237_000, 'ok', 79, 63_000],
    [240_000, 'warning', 80, 60_000],
    [297_000, 'warning', 99, 3_000],
    [300_000, 'exceeded', 100, 0],
    [390_000, 'exceeded', 130, -90_000],
  ])('spent %d of 300.000 → %s', (spent, level, percent, remaining) => {
    const usage = getBudgetUsage(spent, 300_000);
    expect(usage).toEqual({
      percent,
      barPercent: Math.min(percent, 100),
      remaining,
      level,
    });
  });

  it('rounds down so 99.9 % is still a warning, not exceeded', () => {
    expect(getBudgetUsage(999, 1_000).level).toBe('warning');
  });

  it('handles a 1 peso limit', () => {
    expect(getBudgetUsage(1, 1)).toMatchObject({ percent: 100, level: 'exceeded', remaining: 0 });
  });
});

describe('summarizeBudgets', () => {
  const spent = spentByCategory([
    expense(180_000, 'food'),
    expense(50_000, 'bus'),
    expense(20_000, 'fun'),
    expense(5_000, null),
  ]);

  it('totals limits and spending in budgeted categories only', () => {
    const summary = summarizeBudgets(
      [
        { categoryId: 'food', limitAmount: 300_000 },
        { categoryId: 'bus', limitAmount: 100_000 },
        { categoryId: 'rent', limitAmount: 800_000 },
      ],
      spent,
    );
    expect(summary).toEqual({ budgeted: 1_200_000, spent: 230_000, unbudgetedSpent: 25_000 });
  });

  it('counts everything as unbudgeted when there are no budgets', () => {
    expect(summarizeBudgets([], spent)).toEqual({
      budgeted: 0,
      spent: 0,
      unbudgetedSpent: 255_000,
    });
  });
});

describe('availableCategories', () => {
  const categories = [
    { id: 'food', type: 'expense' },
    { id: 'bus', type: 'expense' },
    { id: 'salary', type: 'income' },
  ];

  it('keeps expense categories without a budget', () => {
    expect(availableCategories(categories, ['food'])).toEqual([{ id: 'bus', type: 'expense' }]);
  });

  it('returns nothing when every expense category has a budget', () => {
    expect(availableCategories(categories, ['food', 'bus'])).toEqual([]);
  });
});
