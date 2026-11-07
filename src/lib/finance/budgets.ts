import type { TransactionType } from '@/lib/validations/transaction';

// Pure budget calculations (server-side, integer pesos). The 80 % / 100 %
// thresholds live here so the page colours and the dashboard alerts (#29)
// always agree.

export const WARNING_PERCENT = 80;
export const EXCEEDED_PERCENT = 100;

export type BudgetLevel = 'ok' | 'warning' | 'exceeded';

export type BudgetUsage = {
  /** Whole percentage of the limit already spent, rounded down. Can exceed 100. */
  percent: number;
  /** Same value capped at 100, for the progress bar width. */
  barPercent: number;
  /** limit − spent. Negative when the budget was exceeded. */
  remaining: number;
  level: BudgetLevel;
};

type ExpenseRow = { type: TransactionType | string; amount: number; category_id: string | null };

/** Uncategorized expenses are grouped under this key. */
export const NO_CATEGORY = 'none';

function safeAdd(a: number, b: number): number {
  const sum = a + b;
  if (!Number.isSafeInteger(sum))
    throw new RangeError('Total is not a safe integer number of pesos');
  return sum;
}

/** Expenses of the month added up per category (income is ignored). */
export function spentByCategory(transactions: ExpenseRow[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.type !== 'expense') continue;
    const key = transaction.category_id ?? NO_CATEGORY;
    totals.set(key, safeAdd(totals.get(key) ?? 0, transaction.amount));
  }
  return totals;
}

export function getBudgetUsage(spent: number, limit: number): BudgetUsage {
  const percent = limit > 0 ? Math.floor((spent * 100) / limit) : 0;
  const level: BudgetLevel =
    percent >= EXCEEDED_PERCENT ? 'exceeded' : percent >= WARNING_PERCENT ? 'warning' : 'ok';
  return { percent, barPercent: Math.min(percent, 100), remaining: limit - spent, level };
}

export type BudgetsSummary = {
  /** Sum of the limits. */
  budgeted: number;
  /** Spent in categories that have a budget this month. */
  spent: number;
  /** Spent in categories without a budget (including uncategorized). */
  unbudgetedSpent: number;
};

export function summarizeBudgets(
  budgets: { categoryId: string; limitAmount: number }[],
  spent: Map<string, number>,
): BudgetsSummary {
  const budgetedIds = new Set(budgets.map((budget) => budget.categoryId));
  let budgeted = 0;
  let spentInBudgets = 0;
  for (const budget of budgets) {
    budgeted = safeAdd(budgeted, budget.limitAmount);
    spentInBudgets = safeAdd(spentInBudgets, spent.get(budget.categoryId) ?? 0);
  }
  let unbudgetedSpent = 0;
  for (const [categoryId, amount] of spent) {
    if (!budgetedIds.has(categoryId)) unbudgetedSpent = safeAdd(unbudgetedSpent, amount);
  }
  return { budgeted, spent: spentInBudgets, unbudgetedSpent };
}

/** Expense categories that do not have a budget this month yet. */
export function availableCategories<T extends { id: string; type: string }>(
  categories: T[],
  budgetedIds: Iterable<string>,
): T[] {
  const taken = new Set(budgetedIds);
  return categories.filter((category) => category.type === 'expense' && !taken.has(category.id));
}
