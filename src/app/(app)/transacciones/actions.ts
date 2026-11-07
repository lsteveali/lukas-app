'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { transactionSchema } from '@/lib/validations/transaction';

export type TransactionActionResult = { ok: true } | { ok: false; error: string };

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

  revalidateMoneyPages();
  return { ok: true };
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

  // Re-renders the month being viewed: if the date moved to another month,
  // the row drops out of this month's list.
  revalidateMoneyPages();
  return { ok: true };
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
