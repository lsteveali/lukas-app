import { CategoryIcon } from '@/components/transactions/CategoryIcon';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getBudgetUsage } from '@/lib/finance/budgets';
import { cn } from '@/lib/utils/cn';
import { formatCOP } from '@/lib/utils/money';

import { BudgetBar } from './BudgetBar';
import { EditBudgetDialog } from './BudgetDialogs';
import { DeleteBudgetButton } from './DeleteBudgetButton';
import type { BudgetView } from './types';

const NBSP = ' ';

export function BudgetCard({
  budget,
  monthParam,
  monthLabel,
}: {
  budget: BudgetView;
  monthParam: string;
  monthLabel: string;
}) {
  const usage = getBudgetUsage(budget.spent, budget.limitAmount);
  const over = usage.remaining < 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex min-w-0 items-center gap-2 text-base">
          <CategoryIcon icon={budget.category.icon} color={budget.category.color} />
          <span className="truncate">{budget.category.name}</span>
        </CardTitle>
        <CardAction className="flex gap-1">
          <EditBudgetDialog budget={budget} monthParam={monthParam} />
          <DeleteBudgetButton budget={budget} monthLabel={monthLabel} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p className="flex flex-wrap items-baseline justify-between gap-x-2">
          <span>
            <span className="font-semibold tabular-nums">{formatCOP(budget.spent)}</span>
            <span className="text-muted-foreground"> de {formatCOP(budget.limitAmount)}</span>
          </span>
          <span className="font-medium tabular-nums">{`${usage.percent}${NBSP}%`}</span>
        </p>
        <BudgetBar
          label={`Uso del presupuesto de ${budget.category.name}`}
          percent={usage.percent}
          barPercent={usage.barPercent}
          level={usage.level}
        />
        <p className={cn(over ? 'font-medium text-red-600' : 'text-muted-foreground')}>
          {over
            ? `Te pasaste ${formatCOP(-usage.remaining)}`
            : `Quedan ${formatCOP(usage.remaining)}`}
        </p>
      </CardContent>
    </Card>
  );
}
