'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  crossingMessage,
  detectThresholdCrossing,
  type BudgetAlertNotice,
} from '@/lib/finance/budgets';
import { createClient } from '@/lib/supabase/server';
import { monthRange, toMonthParam, type YearMonth } from '@/lib/utils/dates';
import { transactionSchema, type TransactionType } from '@/lib/validations/transaction';

export type TransactionActionResult =
  { ok: true; budgetAlert?: BudgetAlertNotice } | { ok: false; error: string };

// Postgres "insufficient_privilege": raised when the RLS check on write fails
// (e.g. a category that is not the user's or does not match the type).
const RLS_VIOLATION = '42501';

const INVALID_DATA = 'Revisa los datos del formulario.';
const SESSION_EXPIRED = 'Tu sesión expiró. Inicia sesión de nuevo.';
const INVALID_CATEGORY = 'La categoría no es válida para este tipo de movimiento.';
const NOT_FOUND = 'No se encontró el movimiento.';

const idSchema = z.uuid();

/** Pages that show transactions or totals: refresh them after any change. */
function revalidateMoneyPages() {
  revalidatePath('/transacciones');
  revalidatePath('/dashboard');
  // Budgets show what was spent per category this month.
  revalidatePath('/presupuestos');
}

/** Signed-in user's id, from the session on the server (never the client). */
async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

const yearMonthOf = (date: string): YearMonth => ({
  year: Number(date.slice(0, 4)),
  month: Number(date.slice(5, 7)),
});

/**
 * After saving an expense, checks whether it pushed its category's budget for
 * that month over 80 % or 100 %. `spentAfter` is read from the database (the
 * change is already saved); `spentBefore` removes this expense's new amount and
 * adds back its previous amount when it was already counted in the same
 * category and month (editing). Never fails the save: on any error it logs and
 * returns undefined.
 */
async function findBudgetAlert(
  supabase: Supabase,
  {
    categoryId,
    date,
    newAmount,
    previousAmountInSameMonth,
  }: { categoryId: string; date: string; newAmount: number; previousAmountInSameMonth: number },
): Promise<BudgetAlertNotice | undefined> {
  try {
    const month = yearMonthOf(date);
    const { start, end } = monthRange(month);

    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .select('limit_amount, category:categories(name)')
      .eq('category_id', categoryId)
      .eq('month', start)
      .maybeSingle();
    if (budgetError) throw budgetError;
    if (!budget) return undefined;

    const { data: expenses, error: expensesError } = await supabase
      .from('transactions')
      .select('amount')
      .eq('type', 'expense')
      .eq('category_id', categoryId)
      .gte('date', start)
      .lt('date', end);
    if (expensesError) throw expensesError;

    const spentAfter = (expenses ?? []).reduce((sum, row) => sum + row.amount, 0);
    const spentBefore = spentAfter - newAmount + previousAmountInSameMonth;
    const crossing = detectThresholdCrossing({
      spentBefore,
      spentAfter,
      limit: budget.limit_amount,
    });
    if (!crossing) return undefined;

    return {
      level: crossing.level,
      message: crossingMessage(crossing, budget.category?.name ?? 'esta categoría'),
      href: `/presupuestos?mes=${toMonthParam(month)}`,
    };
  } catch (error) {
    console.error('budget alert check failed', { error });
    return undefined;
  }
}

function failure(
  action: string,
  error: { code: string; message: string },
): TransactionActionResult {
  if (error.code === RLS_VIOLATION) return { ok: false, error: INVALID_CATEGORY };
  console.error(`${action} failed`, { code: error.code, message: error.message });
  return { ok: false, error: 'No pudimos guardar el movimiento. Intenta de nuevo.' };
}

export async function createTransaction(input: unknown): Promise<TransactionActionResult> {
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID_DATA };

  const { supabase, userId } = await getSessionUser();
  if (!userId) return { ok: false, error: SESSION_EXPIRED };

  const { type, amount, categoryId, date, description } = parsed.data;
  const { error } = await supabase.from('transactions').insert({
    // Always the signed-in user: never taken from the form.
    user_id: userId,
    type,
    amount,
    category_id: categoryId,
    date,
    description,
  });
  if (error) return failure('createTransaction', error);

  const budgetAlert =
    type === 'expense'
      ? await findBudgetAlert(supabase, {
          categoryId,
          date,
          newAmount: amount,
          previousAmountInSameMonth: 0,
        })
      : undefined;

  revalidateMoneyPages();
  return budgetAlert ? { ok: true, budgetAlert } : { ok: true };
}

type PreviousRow = {
  type: TransactionType | string;
  amount: number;
  category_id: string | null;
  date: string;
};

/** The old version's amount, if it already counted toward the same category and month. */
function amountAlreadyCounted(previous: PreviousRow | null, categoryId: string, date: string) {
  if (!previous || previous.type !== 'expense' || previous.category_id !== categoryId) return 0;
  return previous.date.slice(0, 7) === date.slice(0, 7) ? previous.amount : 0;
}

export async function updateTransaction(
  id: unknown,
  input: unknown,
): Promise<TransactionActionResult> {
  const parsedId = idSchema.safeParse(id);
  const parsed = transactionSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) return { ok: false, error: INVALID_DATA };

  const { supabase, userId } = await getSessionUser();
  if (!userId) return { ok: false, error: SESSION_EXPIRED };

  const { type, amount, categoryId, date, description } = parsed.data;

  // The previous version is needed to know the spending *before* this edit.
  // Only read it when the result is an expense (the only case that can warn).
  let previous: PreviousRow | null = null;
  if (type === 'expense') {
    const { data: row } = await supabase
      .from('transactions')
      .select('type, amount, category_id, date')
      .eq('id', parsedId.data)
      .eq('user_id', userId)
      .maybeSingle();
    previous = row ?? null;
  }

  // With RLS, updating someone else's (or a missing) row is not an error: it
  // just matches 0 rows. `.select()` returns the updated rows so we can tell.
  const { data, error } = await supabase
    .from('transactions')
    .update({ type, amount, category_id: categoryId, date, description })
    .eq('id', parsedId.data)
    .eq('user_id', userId)
    .select('id');
  if (error) return failure('updateTransaction', error);
  if (!data || data.length === 0) return { ok: false, error: NOT_FOUND };

  const budgetAlert =
    type === 'expense'
      ? await findBudgetAlert(supabase, {
          categoryId,
          date,
          newAmount: amount,
          previousAmountInSameMonth: amountAlreadyCounted(previous, categoryId, date),
        })
      : undefined;

  // Re-renders the month being viewed: if the date moved to another month,
  // the row drops out of this month's list.
  revalidateMoneyPages();
  return budgetAlert ? { ok: true, budgetAlert } : { ok: true };
}

export async function deleteTransaction(id: unknown): Promise<TransactionActionResult> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: NOT_FOUND };

  const { supabase, userId } = await getSessionUser();
  if (!userId) return { ok: false, error: SESSION_EXPIRED };

  // Same as update: a delete that RLS filters out affects 0 rows, no error.
  const { data, error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', parsedId.data)
    .eq('user_id', userId)
    .select('id');
  if (error) {
    console.error('deleteTransaction failed', { code: error.code, message: error.message });
    return { ok: false, error: 'No pudimos eliminar el movimiento. Intenta de nuevo.' };
  }
  if (!data || data.length === 0) return { ok: false, error: NOT_FOUND };

  revalidateMoneyPages();
  return { ok: true };
}
