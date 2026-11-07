import { formatCOP } from '@/lib/utils/money';
import { cn } from '@/lib/utils/cn';
import type { TransactionType } from '@/lib/validations/transaction';

/** Expenses in red with "−", income in green with "+". */
export function TransactionAmount({
  type,
  amount,
  className,
}: {
  type: TransactionType;
  amount: number;
  className?: string;
}) {
  const isExpense = type === 'expense';
  return (
    <span
      className={cn(
        'font-semibold whitespace-nowrap tabular-nums',
        isExpense ? 'text-red-600' : 'text-green-700',
        className,
      )}
    >
      <span className="sr-only">{isExpense ? 'Gasto de ' : 'Ingreso de '}</span>
      <span aria-hidden>{isExpense ? '−' : '+'}</span>
      {formatCOP(amount)}
    </span>
  );
}
