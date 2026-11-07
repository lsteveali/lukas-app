import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { MonthNav } from '@/components/transactions/MonthNav';
import { NewTransactionDialog } from '@/components/transactions/NewTransactionDialog';
import { TransactionList } from '@/components/transactions/TransactionList';
import type { CategoryOption, TransactionListItem } from '@/components/transactions/types';
import { createClient } from '@/lib/supabase/server';
import { formatMonthLabel, monthRange, parseMonthParam, toMonthParam } from '@/lib/utils/dates';
import type { TransactionType } from '@/lib/validations/transaction';

export const metadata: Metadata = { title: 'Movimientos · Lukas' };

export default function TransactionsPage({ searchParams }: PageProps<'/transacciones'>) {
  return (
    // Extra bottom padding so the floating button never covers the last row.
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 pb-24 sm:pb-4">
      <h1 className="text-2xl font-bold">Movimientos</h1>
      {/* searchParams, the session and the data are request-time: stream them. */}
      <Suspense fallback={<p className="text-muted-foreground">Cargando movimientos…</p>}>
        <TransactionsView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function TransactionsView({
  searchParams,
}: Pick<PageProps<'/transacciones'>, 'searchParams'>) {
  const params = await searchParams;
  const month = parseMonthParam(typeof params.mes === 'string' ? params.mes : undefined);
  const { start, end } = monthRange(month);
  const monthParam = toMonthParam(month);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/transacciones?mes=${monthParam}`)}`);

  // RLS limits both queries to the user's rows (and system categories).
  const [categoriesResult, transactionsResult] = await Promise.all([
    supabase.from('categories').select('id, name, icon, color, type').order('name'),
    supabase
      .from('transactions')
      .select('id, type, amount, date, description, category:categories(name, icon, color)')
      .gte('date', start)
      .lt('date', end)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);

  if (categoriesResult.error || transactionsResult.error) {
    console.error('transactions page query failed', {
      categories: categoriesResult.error?.message,
      transactions: transactionsResult.error?.message,
    });
    return (
      <p role="alert" className="text-destructive">
        No pudimos cargar tus movimientos. Recarga la página para intentar de nuevo.
      </p>
    );
  }

  const categories: CategoryOption[] = sortCategories(categoriesResult.data);
  const transactions: TransactionListItem[] = transactionsResult.data.map((row) => ({
    ...row,
    type: toTransactionType(row.type),
  }));
  const monthLabel = formatMonthLabel(month);

  return (
    <>
      <MonthNav month={month} />
      <div className="flex justify-end">
        <NewTransactionDialog categories={categories} currentMonth={monthParam} floating />
      </div>
      <TransactionList
        transactions={transactions}
        monthLabel={monthLabel}
        emptyAction={<NewTransactionDialog categories={categories} currentMonth={monthParam} />}
      />
    </>
  );
}

function toTransactionType(value: string): TransactionType {
  return value === 'income' ? 'income' : 'expense';
}

/** Alphabetical, but "Otros" last so it reads as the catch-all option. */
function sortCategories(categories: CategoryOption[]): CategoryOption[] {
  return [...categories].sort((a, b) => {
    if (a.name === 'Otros') return 1;
    if (b.name === 'Otros') return -1;
    return a.name.localeCompare(b.name, 'es');
  });
}
