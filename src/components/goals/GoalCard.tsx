import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Goal } from '@/lib/finance/goals';

import { DeleteGoalButton } from './DeleteGoalButton';
import { EditGoalDialog } from './GoalDialogs';
import { GoalProgress } from './GoalProgress';

export function GoalCard({ goal, today }: { goal: Goal; today: string }) {
  const href = `/metas/${goal.id}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="truncate text-base">
          <Link href={href} className="hover:underline">
            {goal.name}
          </Link>
        </CardTitle>
        <CardAction className="flex gap-1">
          <EditGoalDialog goal={goal} />
          <DeleteGoalButton goal={goal} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <GoalProgress goal={goal} today={today} />
        <Link
          href={href}
          className="inline-flex items-center gap-1 self-start text-sm font-medium underline"
          aria-label={`Ver aportes de ${goal.name}`}
        >
          Ver aportes
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  );
}
