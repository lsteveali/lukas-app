import { formatCOP } from '@/lib/utils/money';
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

// ---------------------------------------------------------------------------
// Alerts (#29)
// ---------------------------------------------------------------------------

const LEVEL_RANK: Record<BudgetLevel, number> = { ok: 0, warning: 1, exceeded: 2 };

export type ThresholdCrossing = {
  level: Exclude<BudgetLevel, 'ok'>;
  /** Percentage used after the change. */
  percent: number;
  /** limit − spent after the change (negative when exceeded). */
  remaining: number;
};

/**
 * Whether a change moved a category's budget into a higher level (below 80 %
 * → 80 %+, or below 100 % → 100 %+). Staying in the same level, or going
 * down, returns null, so the user is warned once, not on every expense.
 * `limit` null means the category has no budget this month: never warns.
 */
export function detectThresholdCrossing({
  spentBefore,
  spentAfter,
  limit,
}: {
  spentBefore: number;
  spentAfter: number;
  limit: number | null;
}): ThresholdCrossing | null {
  if (limit === null || limit <= 0) return null;
  const before = getBudgetUsage(spentBefore, limit);
  const after = getBudgetUsage(spentAfter, limit);
  if (after.level === 'ok' || LEVEL_RANK[after.level] <= LEVEL_RANK[before.level]) return null;
  return { level: after.level, percent: after.percent, remaining: after.remaining };
}

/** Text shown right after saving the expense that crossed a threshold. */
export function crossingMessage(crossing: ThresholdCrossing, categoryName: string): string {
  if (crossing.level === 'exceeded') {
    return crossing.remaining < 0
      ? `Con este gasto te pasaste ${formatCOP(-crossing.remaining)} de tu presupuesto de ${categoryName}.`
      : `Con este gasto llegaste al 100 % de tu presupuesto de ${categoryName}.`;
  }
  return `Con este gasto llegaste al ${crossing.percent} % de tu presupuesto de ${categoryName}.`;
}

export type BudgetAlert = {
  categoryId: string;
  categoryName: string;
  level: Exclude<BudgetLevel, 'ok'>;
  percent: number;
  remaining: number;
  message: string;
};

/**
 * Dashboard alerts for the month: exceeded first (largest overspend first),
 * then warnings (highest percentage first). Categories under 80 % are left out.
 */
export function getBudgetAlerts(
  budgets: { categoryId: string; categoryName: string; limitAmount: number; spent: number }[],
): BudgetAlert[] {
  const alerts: BudgetAlert[] = [];
  for (const budget of budgets) {
    const usage = getBudgetUsage(budget.spent, budget.limitAmount);
    if (usage.level === 'ok') continue;
    const message =
      usage.level === 'exceeded'
        ? usage.remaining < 0
          ? `Te pasaste ${formatCOP(-usage.remaining)} en ${budget.categoryName}`
          : `Llegaste al límite de ${budget.categoryName}`
        : `Llevas el ${usage.percent} % de ${budget.categoryName}, te quedan ${formatCOP(usage.remaining)}`;
    alerts.push({
      categoryId: budget.categoryId,
      categoryName: budget.categoryName,
      level: usage.level,
      percent: usage.percent,
      remaining: usage.remaining,
      message,
    });
  }
  return alerts.sort((a, b) => {
    if (a.level !== b.level) return a.level === 'exceeded' ? -1 : 1;
    return a.level === 'exceeded' ? a.remaining - b.remaining : b.percent - a.percent;
  });
}

/** What a Server Action returns so the UI can show the crossing notice. */
export type BudgetAlertNotice = {
  level: Exclude<BudgetLevel, 'ok'>;
  message: string;
  /** /presupuestos of the expense's month. */
  href: string;
};
