import { PiggyBank } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { GoalCard } from '@/components/goals/GoalCard';
import { NewGoalDialog } from '@/components/goals/GoalDialogs';
import { toGoal, type Goal } from '@/lib/finance/goals';
import { createClient } from '@/lib/supabase/server';
import { todayInBogota } from '@/lib/utils/dates';

export const metadata: Metadata = { title: 'Metas · Lukas' };

export default function GoalsPage() {
  return (
    // Extra bottom padding so the floating button never covers the last card.
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 pb-24 sm:pb-4">
      <h1 className="text-2xl font-bold">Metas</h1>
      {/* The session and the data are request-time: stream them. */}
      <Suspense fallback={<p className="text-muted-foreground">Cargando tus metas…</p>}>
        <GoalsView />
      </Suspense>
    </main>
  );
}

async function GoalsView() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/metas');

  // RLS (security_invoker view) limits this to the user's goals.
  const { data, error } = await supabase
    .from('goals_with_progress')
    .select('id, name, target_amount, saved_amount, deadline')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('goals page query failed', { message: error.message });
    return (
      <p role="alert" className="text-destructive">
        No pudimos cargar tus metas. Recarga la página para intentar de nuevo.
      </p>
    );
  }

  const goals = data.map(toGoal).filter((goal): goal is Goal => goal !== null);

  if (goals.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-12 text-center">
        <PiggyBank className="size-10 text-muted-foreground" aria-hidden />
        <p className="font-medium">Aún no tienes metas</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Ponle nombre a lo que quieres lograr (un viaje, un computador, tu colchón) y ve sumando
          lucas.
        </p>
        <NewGoalDialog triggerLabel="Crear mi primera meta" />
      </div>
    );
  }

  const today = todayInBogota();
  return (
    <>
      {/* contents on phones: the button is fixed, so the wrapper must not take space (or a gap). */}
      <div className="contents sm:flex sm:justify-end">
        <NewGoalDialog floating />
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {goals.map((goal) => (
          <li key={goal.id}>
            <GoalCard goal={goal} today={today} />
          </li>
        ))}
      </ul>
    </>
  );
}
