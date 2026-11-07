import { ReceiptText } from 'lucide-react';

import { formatShortDate } from '@/lib/utils/dates';
import { formatCOP } from '@/lib/utils/money';

import { EditTransactionDialog } from './EditTransactionDialog';
import { TransactionRowContent } from './TransactionRowContent';
import type { CategoryOption, TransactionListItem } from './types';

type TransactionListProps = {
  transactions: TransactionListItem[];
  categories: CategoryOption[];
  /** Month being viewed (YYYY-MM). */
  currentMonth: string;
  monthLabel: string;
  /** Rendered in the empty state, e.g. the "new transaction" button. */
  emptyAction?: React.ReactNode;
};

export function TransactionList({
  transactions,
  categories,
  currentMonth,
  monthLabel,
  emptyAction,
}: TransactionListProps) {
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
    <ul className="divide-y overflow-hidden rounded-xl border">
      {transactions.map((transaction) => {
        const title = transaction.category?.name ?? 'Sin categoría';
        const date = formatShortDate(transaction.date);
        const kind = transaction.type === 'expense' ? 'gasto' : 'ingreso';
        const label = `Editar ${title}, ${date}, ${kind} de ${formatCOP(transaction.amount)}`;
        return (
          <li key={transaction.id}>
            {/* The whole row opens the edit dialog: easy to tap on a phone. */}
            <EditTransactionDialog
              transaction={transaction}
              categories={categories}
              currentMonth={currentMonth}
              label={label}
            >
              <TransactionRowContent transaction={transaction} />
            </EditTransactionDialog>
          </li>
        );
      })}
    </ul>
  );
}
