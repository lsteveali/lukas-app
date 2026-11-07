import { todayInBogota } from '@/lib/utils/dates';

// Pure goal calculations. Amounts are integer pesos; dates are `YYYY-MM-DD`
// in Bogotá (see CLAUDE.md).

export type GoalProgressInput = {
  saved: number;
  target: number;
  deadline: string | null;
  /** Today as `YYYY-MM-DD`; injectable so tests do not depend on the clock. */
  today?: string;
};

export type DeadlinePlan =
  { status: 'on-track'; monthsLeft: number; perMonth: number } | { status: 'overdue' };

export type GoalProgress = {
  /** Whole percentage, rounded down (99.6 % shows as 99 %). Can exceed 100. */
  percent: number;
  /** Same value capped at 100, for the progress bar width. */
  barPercent: number;
  completed: boolean;
  /** What is still missing, never negative. */
  remaining: number;
  /** Only for goals with a deadline that are not completed yet. */
  plan: DeadlinePlan | null;
};

const monthIndex = (isoDate: string) => {
  const [year, month] = isoDate.split('-').map(Number) as [number, number];
  return year * 12 + (month - 1);
};

/**
 * Calendar months from today to the deadline, counting the current month:
 * Nov 7 → Dec 31 is 2 (November and December); a deadline this month is 1.
 */
export function monthsUntil(today: string, deadline: string): number {
  return monthIndex(deadline) - monthIndex(today) + 1;
}

export function getGoalProgress({
  saved,
  target,
  deadline,
  today = todayInBogota(),
}: GoalProgressInput): GoalProgress {
  const safeSaved = Math.max(saved, 0);
  const percent = target > 0 ? Math.floor((safeSaved * 100) / target) : 0;
  const completed = safeSaved >= target;
  const remaining = Math.max(target - safeSaved, 0);

  let plan: DeadlinePlan | null = null;
  if (deadline && !completed) {
    if (deadline < today) {
      plan = { status: 'overdue' };
    } else {
      const monthsLeft = monthsUntil(today, deadline);
      // Rounded up so saving this much every month does reach the target.
      plan = { status: 'on-track', monthsLeft, perMonth: Math.ceil(remaining / monthsLeft) };
    }
  }

  return { percent, barPercent: Math.min(percent, 100), completed, remaining, plan };
}

export type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  deadline: string | null;
};

/** A row of the goals_with_progress view, as generated (every column nullable). */
export type GoalRow = {
  id: string | null;
  name: string | null;
  target_amount: number | null;
  saved_amount: number | null;
  deadline: string | null;
};

/**
 * Narrows a view row to a Goal. Views are typed with nullable columns even
 * when the underlying table forbids nulls; incomplete rows are dropped.
 */
export function toGoal(row: GoalRow): Goal | null {
  if (!row.id || !row.name || row.target_amount === null) return null;
  return {
    id: row.id,
    name: row.name,
    targetAmount: row.target_amount,
    savedAmount: row.saved_amount ?? 0,
    deadline: row.deadline,
  };
}
