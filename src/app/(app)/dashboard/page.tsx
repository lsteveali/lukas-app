import { PieChart as PieChartIcon, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { ExpensesDonut } from '@/components/dashboard/ExpensesDonut';
import { ExpensesLegend } from '@/components/dashboard/ExpensesLegend';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { MonthNav } from '@/components/transactions/MonthNav';
import { NewTransactionDialog } from '@/components/transactions/NewTransactionDialog';
import type { CategoryOption, TransactionListItem } from '@/components/transactions/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { expensesByCategory, summarizeMonth } from '@/lib/finance/summary';
import { createClient } from '@/lib/supabase/server';
import { formatMonthLabel, monthRange, parseMonthParam, toMonthParam } from '@/lib/utils/dates';
import type { TransactionType } from '@/lib/validations/transaction';

export const metadata: Metadata = { title: 'Dashboard · Lukas' };

const RECENT_COUNT = 5;

export default function DashboardPage({ searchParams }: PageProps<'/dashboard'>) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4">
      <Suspense fallback={<h1 className="text-2xl font-bold">Hola</h1>}>
        <Greeting />
      </Suspense>
      {/* searchParams, the session and the data are request-time: stream them. */}
      <Suspense fallback={<p className="text-muted-foreground">Cargando tu resumen…</p>}>
        <DashboardView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Greeting() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // src/proxy.ts already protects this route; this is a second line of defense.
  if (!user) redirect('/login?next=/dashboard');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  const firstName = profile?.full_name?.split(' ')[0];
  return <h1 className="text-2xl font-bold">{firstName ? `Hola, ${firstName}` : 'Hola'}</h1>;
}

async function DashboardView({ searchParams }: Pick<PageProps<'/dashboard'>, 'searchParams'>) {
  const params = await searchParams;
  const month = parseMonthParam(typeof params.mes === 'string' ? params.mes : undefined);
  const { start, end } = monthRange(month);
  const monthParam = toMonthParam(month);
  const monthLabel = formatMonthLabel(month);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/dashboard?mes=${monthParam}`)}`);

  // One query for the month: totals, the donut and the latest movements all
  // come from it. RLS limits it to the user's rows.
  const [transactionsResult, categoriesResult] = await Promise.all([
    supabase
      .from('transactions')
      .select(
        'id, type, amount, date, description, category_id, category:categories(name, icon, color)',
      )
      .gte('date', start)
      .lt('date', end)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('categories').select('id, name, icon, color, type').order('name'),
  ]);

  if (transactionsResult.error || categoriesResult.error) {
    console.error('dashboard query failed', {
      transactions: transactionsResult.error?.message,
      categories: categoriesResult.error?.message,
    });
    return (
      <p role="alert" className="text-destructive">
        No pudimos cargar tu resumen. Recarga la página para intentar de nuevo.
      </p>
    );
  }

  const transactions: TransactionListItem[] = transactionsResult.data.map((row) => ({
    ...row,
    type: toTransactionType(row.type),
  }));
  const categories: CategoryOption[] = categoriesResult.data;
  const nav = <MonthNav month={month} basePath="/dashboard" />;

  if (transactions.length === 0) {
    return (
      <>
        {nav}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-12 text-center">
          <Sparkles className="size-10 text-muted-foreground" aria-hidden />
          <p className="font-medium">Aún no hay movimientos en {monthLabel}</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Registra un gasto o un ingreso y aquí verás tu balance y en qué se van tus lucas.
          </p>
          <NewTransactionDialog
            categories={categories}
            currentMonth={monthParam}
            basePath="/dashboard"
            triggerLabel="Registrar mi primer movimiento"
          />
        </div>
      </>
    );
  }

  // Totals are computed here, on the server, as integer pesos.
  const summary = summarizeMonth(transactions);
  const slices = expensesByCategory(transactions);

  return (
    <>
      {nav}
      <SummaryCards summary={summary} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="size-4" aria-hidden />
            Gastos por categoría
          </CardTitle>
        </CardHeader>
        <CardContent>
          {slices.length > 0 ? (
            // Phones: donut above the legend. Wider screens: side by side.
            <div className="flex flex-col items-center gap-6 md:flex-row">
              <ExpensesDonut slices={slices} total={summary.expense} />
              <ExpensesLegend slices={slices} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No registraste gastos en {monthLabel}.</p>
          )}
        </CardContent>
      </Card>

      <RecentTransactions
        transactions={transactions.slice(0, RECENT_COUNT)}
        monthParam={monthParam}
      />
    </>
  );
}

function toTransactionType(value: string): TransactionType {
  return value === 'income' ? 'income' : 'expense';
}
