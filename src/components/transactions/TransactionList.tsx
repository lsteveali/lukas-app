import { ReceiptText } from 'lucide-react';

import { formatShortDate } from '@/lib/utils/dates';

import { CategoryIcon } from './CategoryIcon';
import { TransactionAmount } from './TransactionAmount';
import type { TransactionListItem } from './types';

type TransactionListProps = {
  transactions: TransactionListItem[];
  monthLabel: string;
  /** Rendered in the empty state, e.g. the "new transaction" button. */
  emptyAction?: React.ReactNode;
};

export function TransactionList({ transactions, monthLabel, emptyAction }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-12 text-center">
        <ReceiptText className="size-10 text-muted-foreground" aria-hidden />
        <p className="font-medium">No hay movimientos en {monthLabel}</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Registra tu primer gasto o ingreso del mes para empezar a ver a dónde se van tus lucas.
        </p>
        {emptyAction}
      </div>
    );
  }

  return (
    <ul className="divide-y rounded-xl border">
      {transactions.map((transaction) => {
        const title = transaction.category?.name ?? 'Sin categoría';
        return (
          <li key={transaction.id} className="flex items-center gap-3 p-3">
            <CategoryIcon
              icon={transaction.category?.icon ?? null}
              color={transaction.category?.color ?? null}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{title}</p>
              <p className="truncate text-sm text-muted-foreground">
                <time dateTime={transaction.date}>{formatShortDate(transaction.date)}</time>
                {transaction.description && <> · {transaction.description}</>}
              </p>
            </div>
            <TransactionAmount type={transaction.type} amount={transaction.amount} />
          </li>
        );
      })}
    </ul>
  );
}
