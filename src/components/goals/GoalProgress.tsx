import { CalendarClock, PartyPopper } from 'lucide-react';

import { getGoalProgress, type Goal } from '@/lib/finance/goals';
import { cn } from '@/lib/utils/cn';
import { formatLongDate } from '@/lib/utils/dates';
import { formatCOP } from '@/lib/utils/money';

const NBSP = ' ';

/** Progress bar, saved/target amounts and deadline plan. Used by the card and the detail page. */
export function GoalProgress({ goal, today }: { goal: Goal; today: string }) {
  const progress = getGoalProgress({
    saved: goal.savedAmount,
    target: goal.targetAmount,
    deadline: goal.deadline,
    today,
  });

  return (
    <div className="flex flex-col gap-3">
      <div
        role="progressbar"
        aria-label={`Progreso de ${goal.name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.barPercent}
        aria-valuetext={`${progress.percent} %`}
        className="h-3 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width]',
            progress.completed ? 'bg-green-600' : 'bg-primary',
          )}
          style={{ width: `${progress.barPercent}%` }}
        />
      </div>

      <p className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm">
        <span>
          <span className="font-semibold tabular-nums">{formatCOP(goal.savedAmount)}</span>
          <span className="text-muted-foreground"> de {formatCOP(goal.targetAmount)}</span>
        </span>
        <span className="font-medium tabular-nums">{`${progress.percent}${NBSP}%`}</span>
      </p>

      {progress.completed ? (
        <p className="flex items-center gap-2 text-sm font-semibold text-green-700">
          <PartyPopper className="size-4" aria-hidden />
          ¡Meta cumplida!
          {progress.percent > 100 && (
            <span className="font-normal text-muted-foreground">
              Llevas el {progress.percent}
              {NBSP}%
            </span>
          )}
        </p>
      ) : (
        <DeadlineInfo goal={goal} remaining={progress.remaining} plan={progress.plan} />
      )}
    </div>
  );
}

type DeadlineInfoProps = {
  goal: Goal;
  remaining: number;
  plan: ReturnType<typeof getGoalProgress>['plan'];
};

function DeadlineInfo({ goal, remaining, plan }: DeadlineInfoProps) {
  const missing = `Faltan ${formatCOP(remaining)}`;

  if (!goal.deadline || !plan) {
    return <p className="text-sm text-muted-foreground">{missing}</p>;
  }

  if (plan.status === 'overdue') {
    return (
      <p className="flex items-start gap-2 text-sm text-amber-700">
        <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          La fecha límite fue el {formatLongDate(goal.deadline)}. {missing}.
        </span>
      </p>
    );
  }

  const months = plan.monthsLeft === 1 ? '1 mes' : `${plan.monthsLeft} meses`;
  return (
    <p className="flex items-start gap-2 text-sm text-muted-foreground">
      <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        {missing} · {months} (hasta el {formatLongDate(goal.deadline)}) · ahorra{' '}
        <strong className="text-foreground">{formatCOP(plan.perMonth)} al mes</strong>
      </span>
    </p>
  );
}
