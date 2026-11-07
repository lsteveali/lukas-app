import { formatShortDate } from '@/lib/utils/dates';

import { CategoryIcon } from './CategoryIcon';
import { TransactionAmount } from './TransactionAmount';
import type { TransactionListItem } from './types';

/** Icon, category, date · description and amount. Shared by the list and the dashboard. */
export function TransactionRowContent({ transaction }: { transaction: TransactionListItem }) {
  return (
    <>
      <CategoryIcon
        icon={transaction.category?.icon ?? null}
        color={transaction.category?.color ?? null}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">
          {transaction.category?.name ?? 'Sin categoría'}
        </span>
        <span className="block truncate text-sm text-muted-foreground">
          <time dateTime={transaction.date}>{formatShortDate(transaction.date)}</time>
          {transaction.description && <> · {transaction.description}</>}
        </span>
      </span>
      <TransactionAmount type={transaction.type} amount={transaction.amount} />
    </>
  );
}
