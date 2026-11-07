import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getBudgetUsage, type BudgetsSummary } from '@/lib/finance/budgets';
import { cn } from '@/lib/utils/cn';
import { formatCOP } from '@/lib/utils/money';

import { BudgetBar } from './BudgetBar';

/** Total budgeted vs spent (budgeted categories only), plus unbudgeted spending. */
export function BudgetSummary({
  summary,
  monthParam,
}: {
  summary: BudgetsSummary;
  monthParam: string;
}) {
  const usage = getBudgetUsage(summary.spent, summary.budgeted);
  const over = usage.remaining < 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen del mes</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p className="flex flex-wrap justify-between gap-x-4 gap-y-1">
          <span>
            Presupuestado <strong className="tabular-nums">{formatCOP(summary.budgeted)}</strong>
          </span>
          <span>
            Gastado <strong className="tabular-nums">{formatCOP(summary.spent)}</strong>
          </span>
        </p>
        <BudgetBar
          label="Uso total de los presupuestos"
          percent={usage.percent}
          barPercent={usage.barPercent}
          level={usage.level}
        />
        <p className={cn(over ? 'font-medium text-red-600' : 'text-muted-foreground')}>
          {over
            ? `Te pasaste ${formatCOP(-usage.remaining)} en total`
            : `Quedan ${formatCOP(usage.remaining)} en total`}
        </p>
        {summary.unbudgetedSpent > 0 && (
          <p className="flex flex-wrap items-center gap-x-2 border-t pt-3 text-muted-foreground">
            <span>
              Gastos en categorías sin presupuesto:{' '}
              <strong className="text-foreground tabular-nums">
                {formatCOP(summary.unbudgetedSpent)}
              </strong>
            </span>
            <Link
              href={`/transacciones?mes=${monthParam}`}
              className="inline-flex items-center gap-1 font-medium text-foreground underline"
            >
              Ver movimientos
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
