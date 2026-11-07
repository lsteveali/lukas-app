import type { ExpenseSlice } from '@/lib/finance/summary';
import { formatCOP } from '@/lib/utils/money';

const NBSP = ' ';

function formatPercent(slice: ExpenseSlice): string {
  // A real expense rounded to 0 % reads better as "<1 %".
  if (slice.percent === 0 && slice.amount > 0) return `<1${NBSP}%`;
  return `${slice.percent}${NBSP}%`;
}

/** Name, amount and percentage per slice: the accessible version of the donut. */
export function ExpensesLegend({ slices }: { slices: ExpenseSlice[] }) {
  return (
    <ul className="flex w-full flex-col gap-2" aria-label="Gastos por categoría">
      {slices.map((slice) => (
        <li key={slice.key} className="flex items-center gap-3 text-sm">
          <span
            aria-hidden
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: slice.color }}
          />
          <span className="min-w-0 flex-1 truncate">{slice.name}</span>
          <span className="font-medium whitespace-nowrap tabular-nums">
            {formatCOP(slice.amount)}
          </span>
          <span className="w-12 text-right text-muted-foreground tabular-nums">
            {formatPercent(slice)}
          </span>
        </li>
      ))}
    </ul>
  );
}
