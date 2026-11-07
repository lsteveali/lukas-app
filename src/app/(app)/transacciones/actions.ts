'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { transactionSchema } from '@/lib/validations/transaction';

export type TransactionActionResult = { ok: true } | { ok: false; error: string };

// Postgres "insufficient_privilege": raised when the RLS check on insert fails
// (e.g. a category that is not the user's or does not match the type).
const RLS_VIOLATION = '42501';

export async function createTransaction(input: unknown): Promise<TransactionActionResult> {
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Revisa los datos del formulario.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'Tu sesión expiró. Inicia sesión de nuevo.' };
  }

  const { type, amount, categoryId, date, description } = parsed.data;
  const { error } = await supabase.from('transactions').insert({
    // Always the signed-in user: never taken from the form.
    user_id: user.id,
    type,
    amount,
    category_id: categoryId,
    date,
    description,
  });

  if (error) {
    if (error.code === RLS_VIOLATION) {
      return { ok: false, error: 'La categoría no es válida para este tipo de movimiento.' };
    }
    console.error('createTransaction failed', { code: error.code, message: error.message });
    return { ok: false, error: 'No pudimos guardar el movimiento. Intenta de nuevo.' };
  }

  revalidatePath('/transacciones');
  return { ok: true };
}
