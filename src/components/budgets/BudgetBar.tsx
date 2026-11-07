import type { BudgetLevel } from '@/lib/finance/budgets';
import { cn } from '@/lib/utils/cn';

const LEVEL_CLASS: Record<BudgetLevel, string> = {
  ok: 'bg-green-600',
  warning: 'bg-amber-500',
  exceeded: 'bg-red-600',
};

/** Usage bar: green below 80 %, amber from 80 %, red from 100 %. */
export function BudgetBar({
  label,
  percent,
  barPercent,
  level,
}: {
  label: string;
  percent: number;
  barPercent: number;
  level: BudgetLevel;
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={barPercent}
      aria-valuetext={`${percent} % usado`}
      className="h-3 overflow-hidden rounded-full bg-muted"
    >
      <div
        className={cn('h-full rounded-full transition-[width]', LEVEL_CLASS[level])}
        style={{ width: `${barPercent}%` }}
      />
    </div>
  );
}
