import { AlertTriangle, ArrowRight, OctagonAlert } from 'lucide-react';
import Link from 'next/link';

import type { BudgetAlert } from '@/lib/finance/budgets';
import { cn } from '@/lib/utils/cn';

/**
 * Budgets at 80 % or more this month: exceeded first (red), then warnings
 * (amber). Each one links to /presupuestos of the same month. Renders nothing
 * when there are no alerts.
 */
export function BudgetAlerts({
  alerts,
  monthParam,
}: {
  alerts: BudgetAlert[];
  monthParam: string;
}) {
  if (alerts.length === 0) return null;

  return (
    <section aria-labelledby="budget-alerts-title" className="flex flex-col gap-2">
      <h2 id="budget-alerts-title" className="text-lg font-semibold">
        Alertas de presupuesto
      </h2>
      <ul className="flex flex-col gap-2">
        {alerts.map((alert) => {
          const exceeded = alert.level === 'exceeded';
          const Icon = exceeded ? OctagonAlert : AlertTriangle;
          return (
            <li key={alert.categoryId}>
              <Link
                href={`/presupuestos?mes=${monthParam}`}
                className={cn(
                  'flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-sm transition-colors',
                  exceeded
                    ? 'border-red-300 bg-red-50 text-red-900 hover:bg-red-100'
                    : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100',
                )}
              >
                <Icon
                  className={cn('size-5 shrink-0', exceeded ? 'text-red-600' : 'text-amber-600')}
                  aria-hidden
                />
                <span className="flex-1">
                  <span className="sr-only">
                    {exceeded ? 'Presupuesto excedido: ' : 'Atención: '}
                  </span>
                  {alert.message}
                </span>
                <ArrowRight className="size-4 shrink-0" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
