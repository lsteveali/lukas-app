import { describe, expect, it } from 'vitest';

import {
  availableCategories,
  crossingMessage,
  detectThresholdCrossing,
  getBudgetAlerts,
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

describe('detectThresholdCrossing (limit 100.000)', () => {
  const cross = (spentBefore: number, spentAfter: number, limit: number | null = 100_000) =>
    detectThresholdCrossing({ spentBefore, spentAfter, limit });

  it('70 → 85: warns (crossed 80 %)', () => {
    expect(cross(70_000, 85_000)).toEqual({ level: 'warning', percent: 85, remaining: 15_000 });
  });

  it('85 → 90: does not warn again (already past 80 %)', () => {
    expect(cross(85_000, 90_000)).toBeNull();
  });

  it('95 → 105: warns with the exceeded level', () => {
    expect(cross(95_000, 105_000)).toEqual({ level: 'exceeded', percent: 105, remaining: -5_000 });
  });

  it('70 → 110: jumps straight to exceeded', () => {
    expect(cross(70_000, 110_000)?.level).toBe('exceeded');
  });

  it('exactly 80 % and exactly 100 % count as crossing', () => {
    expect(cross(79_999, 80_000)?.level).toBe('warning');
    expect(cross(99_999, 100_000)?.level).toBe('exceeded');
  });

  it('105 → 110 or going down does not warn', () => {
    expect(cross(105_000, 110_000)).toBeNull();
    expect(cross(90_000, 70_000)).toBeNull();
    expect(cross(10_000, 50_000)).toBeNull();
  });

  it('a category without a budget never warns', () => {
    expect(cross(0, 1_000_000, null)).toBeNull();
  });
});

describe('crossingMessage', () => {
  it('reports the percentage for a warning', () => {
    expect(crossingMessage({ level: 'warning', percent: 85, remaining: 15_000 }, 'Comida')).toBe(
      'Con este gasto llegaste al 85 % de tu presupuesto de Comida.',
    );
  });

  it('reports the overspend for exceeded', () => {
    expect(crossingMessage({ level: 'exceeded', percent: 105, remaining: -5_000 }, 'Comida')).toBe(
      'Con este gasto te pasaste $ 5.000 de tu presupuesto de Comida.',
    );
  });

  it('says 100 % when it lands exactly on the limit', () => {
    expect(crossingMessage({ level: 'exceeded', percent: 100, remaining: 0 }, 'Ropa')).toBe(
      'Con este gasto llegaste al 100 % de tu presupuesto de Ropa.',
    );
  });
});

describe('getBudgetAlerts', () => {
  const budget = (categoryName: string, limitAmount: number, spent: number) => ({
    categoryId: categoryName.toLowerCase(),
    categoryName,
    limitAmount,
    spent,
  });

  it('lists exceeded first (largest overspend), then warnings (highest %)', () => {
    const alerts = getBudgetAlerts([
      budget('Comida', 300_000, 120_000), // 40 %: no alert
      budget('Transporte', 100_000, 85_000), // 85 %
      budget('Salud', 100_000, 95_000), // 95 %
      budget('Entretenimiento', 50_000, 65_000), // +15.000
      budget('Ropa', 100_000, 140_000), // +40.000
    ]);
    expect(alerts.map((alert) => [alert.categoryName, alert.level])).toEqual([
      ['Ropa', 'exceeded'],
      ['Entretenimiento', 'exceeded'],
      ['Salud', 'warning'],
      ['Transporte', 'warning'],
    ]);
    expect(alerts[0]?.message).toBe('Te pasaste $ 40.000 en Ropa');
    expect(alerts[3]?.message).toBe('Llevas el 85 % de Transporte, te quedan $ 15.000');
  });

  it('returns nothing when every category is under 80 %', () => {
    expect(getBudgetAlerts([budget('Comida', 300_000, 100_000)])).toEqual([]);
  });
});
