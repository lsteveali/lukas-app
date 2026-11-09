import { ArrowLeft, ReceiptText } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { z } from 'zod';

import { ContributionHistory } from '@/components/goals/ContributionHistory';
import { AddContributionDialog } from '@/components/goals/ContributionDialogs';
import { DeleteGoalButton } from '@/components/goals/DeleteGoalButton';
import { EditGoalDialog } from '@/components/goals/GoalDialogs';
import { GoalProgress } from '@/components/goals/GoalProgress';
import { Card, CardContent } from '@/components/ui/card';
import type { Contribution } from '@/lib/finance/contributions';
import { toGoal } from '@/lib/finance/goals';
import { createClient } from '@/lib/supabase/server';
import { todayInBogota } from '@/lib/utils/dates';

export const metadata: Metadata = { title: 'Meta · Lukas' };

export default function GoalDetailPage({ params }: PageProps<'/metas/[id]'>) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4">
      <Link
        href="/metas"
        className="inline-flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Metas
      </Link>
      {/* params, the session and the data are request-time: stream them. */}
      <Suspense fallback={<p className="text-muted-foreground">Cargando la meta…</p>}>
        <GoalDetail params={params} />
      </Suspense>
    </main>
  );
}

async function GoalDetail({ params }: Pick<PageProps<'/metas/[id]'>, 'params'>) {
  const { id } = await params;
  // A malformed id can never match a goal: 404 without querying.
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/metas/${id}`)}`);

  // RLS hides other users' goals, so "not mine" and "does not exist" both
  // come back empty and end in the same 404.
  const [goalResult, contributionsResult] = await Promise.all([
    supabase
      .from('goals_with_progress')
      .select('id, name, target_amount, saved_amount, deadline')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('goal_contributions')
      .select('id, amount, date, note')
      .eq('goal_id', id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);

  if (goalResult.error || contributionsResult.error) {
    console.error('goal detail query failed', {
      goal: goalResult.error?.message,
      contributions: contributionsResult.error?.message,
    });
    return (
      <p role="alert" className="text-destructive">
        No pudimos cargar la meta. Recarga la página para intentar de nuevo.
      </p>
    );
  }

  const goal = goalResult.data ? toGoal(goalResult.data) : null;
  if (!goal) notFound();

  const contributions: Contribution[] = contributionsResult.data;
  // Reading the current date needs request time under cacheComponents.
  await connection();
  const today = todayInBogota();

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <h1 className="min-w-0 text-2xl font-bold break-words">{goal.name}</h1>
        <div className="flex shrink-0 gap-1">
          <EditGoalDialog goal={goal} />
          <DeleteGoalButton goal={goal} redirectTo="/metas" />
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <GoalProgress goal={goal} today={today} />
          <div className="grid grid-cols-2 gap-2">
            <AddContributionDialog goal={goal} kind="deposit" />
            <AddContributionDialog goal={goal} kind="withdrawal" />
          </div>
        </CardContent>
      </Card>

      <section aria-labelledby="history-title" className="flex flex-col gap-3">
        <h2 id="history-title" className="text-lg font-semibold">
          Historial
        </h2>
        {contributions.length > 0 ? (
          <ContributionHistory goal={goal} contributions={contributions} />
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center">
            <ReceiptText className="size-8 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Aún no hay aportes. Empieza con el primero.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
