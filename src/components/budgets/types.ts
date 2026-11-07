import type { CategoryOption } from '@/components/transactions/types';

/** A budget of the month, joined with its category and what was spent. */
export type BudgetView = {
  id: string;
  categoryId: string;
  limitAmount: number;
  spent: number;
  category: Pick<CategoryOption, 'name' | 'icon' | 'color'>;
};
