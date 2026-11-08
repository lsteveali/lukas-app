import { Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { BudgetCard } from '@/components/budgets/BudgetCard';
import { CopyBudgetsButton, NewBudgetDialog } from '@/components/budgets/BudgetDialogs';
import { BudgetSummary } from '@/components/budgets/BudgetSummary';
import type { BudgetView } from '@/components/budgets/types';
import { MonthNav } from '@/components/transactions/MonthNav';
import type { CategoryOption } from '@/components/transactions/types';
import { availableCategories, spentByCategory, summarizeBudgets } from '@/lib/finance/budgets';
import { createClient } from '@/lib/supabase/server';
import {
  formatMonthLabel,
  monthRange,
  parseMonthParam,
  shiftMonth,
  toMonthParam,
} from '@/lib/utils/dates';

export const metadata: Metadata = { title: 'Presupuestos · Lukas' };

export default function BudgetsPage({ searchParams }: PageProps<'/presupuestos'>) {
  return (
    // Extra bottom padding so the floating button never covers the last card.
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 pb-24 sm:pb-4">
      <h1 className="text-2xl font-bold">Presupuestos</h1>
      {/* searchParams, the session and the data are request-time: stream them. */}
      <Suspense fallback={<p className="text-muted-foreground">Cargando tus presupuestos…</p>}>
        <BudgetsView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function BudgetsView({ searchParams }: Pick<PageProps<'/presupuestos'>, 'searchParams'>) {
  const params = await searchParams;
  // Reading the current date needs request time under cacheComponents.
  await connection();
  const month = parseMonthParam(typeof params.mes === 'string' ? params.mes : undefined);
  const { start, end } = monthRange(month);
  const previousStart = monthRange(shiftMonth(month, -1)).start;
  const monthParam = toMonthParam(month);
  const monthLabel = formatMonthLabel(month);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/presupuestos?mes=${monthParam}`)}`);

  // RLS limits every query to the user's rows (and system categories).
  const [budgetsResult, expensesResult, categoriesResult, previousResult] = await Promise.all([
    supabase
      .from('budgets')
      .select('id, category_id, limit_amount, category:categories(name, icon, color)')
      .eq('month', start),
    supabase
      .from('transactions')
      .select('type, amount, category_id')
      .eq('type', 'expense')
      .gte('date', start)
      .lt('date', end),
    supabase.from('categories').select('id, name, icon, color, type').eq('type', 'expense'),
    supabase
      .from('budgets')
      .select('id', { count: 'exact', head: true })
      .eq('month', previousStart),
  ]);

  const failed = [budgetsResult, expensesResult, categoriesResult, previousResult].find(
    (result) => result.error,
  );
  if (failed) {
    console.error('budgets page query failed', { message: failed.error?.message });
    return (
      <p role="alert" className="text-destructive">
        No pudimos cargar tus presupuestos. Recarga la página para intentar de nuevo.
      </p>
    );
  }

  // Spending is added up here, on the server, in integer pesos.
  const spent = spentByCategory(expensesResult.data ?? []);
  const budgets: BudgetView[] = (budgetsResult.data ?? [])
    .flatMap(({ id, category_id, limit_amount, category }) =>
      category
        ? [
            {
              id,
              categoryId: category_id,
              limitAmount: limit_amount,
              spent: spent.get(category_id) ?? 0,
              category,
            },
          ]
        : [],
    )
    .sort((a, b) => a.category.name.localeCompare(b.category.name, 'es'));
  const summary = summarizeBudgets(budgets, spent);
  const freeCategories: CategoryOption[] = availableCategories(
    categoriesResult.data ?? [],
    budgets.map((budget) => budget.categoryId),
  ).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const previousCount = previousResult.count ?? 0;

  const nav = <MonthNav month={month} basePath="/presupuestos" />;

  if (budgets.length === 0) {
    return (
      <>
        {nav}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-12 text-center">
          <Wallet className="size-10 text-muted-foreground" aria-hidden />
          <p className="font-medium">No tienes presupuestos para {monthLabel}</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Ponle un límite a lo que más gastas (comida, transporte, salidas) y mira cuánto te
            queda.
          </p>
          <NewBudgetDialog
            monthParam={monthParam}
            monthLabel={monthLabel}
            categories={freeCategories}
          />
          {previousCount > 0 && <CopyBudgetsButton monthParam={monthParam} count={previousCount} />}
        </div>
      </>
    );
  }

  return (
    <>
      {nav}
      <BudgetSummary summary={summary} monthParam={monthParam} />
      {/* contents on phones: the button is fixed, so the wrapper must not take space (or a gap). */}
      <div className="contents sm:flex sm:justify-end">
        <NewBudgetDialog
          monthParam={monthParam}
          monthLabel={monthLabel}
          categories={freeCategories}
          floating
        />
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {budgets.map((budget) => (
          <li key={budget.id}>
            <BudgetCard budget={budget} monthParam={monthParam} monthLabel={monthLabel} />
          </li>
        ))}
      </ul>
    </>
  );
}
