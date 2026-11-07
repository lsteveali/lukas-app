import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { TransactionRowContent } from '@/components/transactions/TransactionRowContent';
import type { TransactionListItem } from '@/components/transactions/types';

type RecentTransactionsProps = {
  transactions: TransactionListItem[];
  /** Month being viewed (YYYY-MM), kept in the "Ver todos" link. */
  monthParam: string;
};

/** Read-only list of the month's latest movements; editing lives in /transacciones. */
export function RecentTransactions({ transactions, monthParam }: RecentTransactionsProps) {
  return (
    <section aria-labelledby="recent-title" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="recent-title" className="text-lg font-semibold">
          Últimos movimientos
        </h2>
        <Link
          href={`/transacciones?mes=${monthParam}`}
          className="inline-flex items-center gap-1 text-sm font-medium underline"
        >
          Ver todos
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <ul className="divide-y overflow-hidden rounded-xl border">
        {transactions.map((transaction) => (
          <li key={transaction.id} className="flex items-center gap-3 p-3">
            <TransactionRowContent transaction={transaction} />
          </li>
        ))}
      </ul>
    </section>
  );
}
