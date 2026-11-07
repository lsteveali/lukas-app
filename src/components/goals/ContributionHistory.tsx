import type { Contribution } from '@/lib/finance/contributions';
import type { Goal } from '@/lib/finance/goals';
import { cn } from '@/lib/utils/cn';
import { formatLongDate } from '@/lib/utils/dates';
import { formatCOP } from '@/lib/utils/money';

import { EditContributionDialog } from './ContributionDialogs';
import { DeleteContributionButton } from './DeleteContributionButton';

/** Contributions, newest first: deposits in green with "+", withdrawals in red with "−". */
export function ContributionHistory({
  goal,
  contributions,
}: {
  goal: Goal;
  contributions: Contribution[];
}) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl border">
      {contributions.map((contribution) => {
        const isWithdrawal = contribution.amount < 0;
        const amount = formatCOP(Math.abs(contribution.amount));
        const date = formatLongDate(contribution.date);
        const label = `${isWithdrawal ? 'retiro' : 'aporte'} de ${amount} del ${date}`;
        return (
          <li key={contribution.id} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {contribution.note ?? (isWithdrawal ? 'Retiro' : 'Aporte')}
              </p>
              <p className="text-sm text-muted-foreground">
                <time dateTime={contribution.date}>{date}</time>
              </p>
            </div>
            <span
              className={cn(
                'font-semibold whitespace-nowrap tabular-nums',
                isWithdrawal ? 'text-red-600' : 'text-green-700',
              )}
            >
              <span className="sr-only">{isWithdrawal ? 'Retiro de ' : 'Aporte de '}</span>
              <span aria-hidden>{isWithdrawal ? '−' : '+'}</span>
              {amount}
            </span>
            <div className="flex shrink-0">
              <EditContributionDialog goal={goal} contribution={contribution} label={label} />
              <DeleteContributionButton goal={goal} contribution={contribution} label={label} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
