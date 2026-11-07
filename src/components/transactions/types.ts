import type { TransactionType } from '@/lib/validations/transaction';
import type { Database } from '@/types/database';

type Tables = Database['public']['Tables'];

export type CategoryOption = Pick<
  Tables['categories']['Row'],
  'id' | 'name' | 'icon' | 'color' | 'type'
>;

export type TransactionListItem = Pick<
  Tables['transactions']['Row'],
  'id' | 'amount' | 'date' | 'description' | 'category_id'
> & {
  // The DB column is text with a check constraint; the page narrows it.
  type: TransactionType;
  category: Pick<CategoryOption, 'name' | 'icon' | 'color'> | null;
};
