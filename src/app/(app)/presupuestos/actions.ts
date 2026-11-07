'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { monthRange, shiftMonth, type YearMonth } from '@/lib/utils/dates';
import { budgetLimitSchema, budgetSchema, monthParamSchema } from '@/lib/validations/budget';

export type BudgetActionResult = { ok: true } | { ok: false; error: string };
export type CopyBudgetsResult = { ok: true; copied: number } | { ok: false; error: string };

const INVALID_DATA = 'Revisa los datos del formulario.';
const SESSION_EXPIRED = 'Tu sesión expiró. Inicia sesión de nuevo.';
const NOT_FOUND = 'No se encontró el presupuesto.';
const DUPLICATE = 'Ya tienes un presupuesto para esa categoría este mes.';
const INVALID_CATEGORY = 'Esa categoría no es válida para un presupuesto.';

// unique (user_id, category_id, month)
const UNIQUE_VIOLATION = '23505';
// RLS with-check: the category must be an expense category visible to the user.
const RLS_VIOLATION = '42501';

const idSchema = z.uuid();

type DbError = { code: string; message: string };

/** Signed-in user's id, from the session on the server (never the client). */
async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

/** `"2026-11"` → `{ year: 2026, month: 11 }` (already validated). */
function toYearMonth(month: string): YearMonth {
  return { year: Number(month.slice(0, 4)), month: Number(month.slice(5, 7)) };
}

/** Budgets are stored on the first day of their month. */
const firstDay = (month: YearMonth) => monthRange(month).start;

function revalidateBudgetPages() {
  revalidatePath('/presupuestos');
  revalidatePath('/dashboard');
}

function failure(action: string, error: DbError): BudgetActionResult {
  if (error.code === UNIQUE_VIOLATION) return { ok: false, error: DUPLICATE };
  if (error.code === RLS_VIOLATION) return { ok: false, error: INVALID_CATEGORY };
  console.error(`${action} failed`, { code: error.code, message: error.message });
  return { ok: false, error: 'No pudimos guardar el presupuesto. Intenta de nuevo.' };
}

export async function createBudget(month: unknown, input: unknown): Promise<BudgetActionResult> {
  const parsedMonth = monthParamSchema.safeParse(month);
  const parsed = budgetSchema.safeParse(input);
  if (!parsedMonth.success || !parsed.success) return { ok: false, error: INVALID_DATA };

  const { supabase, userId } = await getSessionUser();
  if (!userId) return { ok: false, error: SESSION_EXPIRED };

  const { error } = await supabase.from('budgets').insert({
    // Always the signed-in user: never taken from the form.
    user_id: userId,
    category_id: parsed.data.categoryId,
    limit_amount: parsed.data.limitAmount,
    month: firstDay(toYearMonth(parsedMonth.data)),
  });
  if (error) return failure('createBudget', error);

  revalidateBudgetPages();
  return { ok: true };
}

export async function updateBudget(id: unknown, input: unknown): Promise<BudgetActionResult> {
  const parsedId = idSchema.safeParse(id);
  const parsed = budgetLimitSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) return { ok: false, error: INVALID_DATA };

  const { supabase, userId } = await getSessionUser();
  if (!userId) return { ok: false, error: SESSION_EXPIRED };

  // With RLS, a missing or foreign row matches 0 rows instead of failing;
  // `.select()` returns the updated rows so we can tell.
  const { data, error } = await supabase
    .from('budgets')
    .update({ limit_amount: parsed.data.limitAmount })
    .eq('id', parsedId.data)
    .eq('user_id', userId)
    .select('id');
  if (error) return failure('updateBudget', error);
  if (!data || data.length === 0) return { ok: false, error: NOT_FOUND };

  revalidateBudgetPages();
  return { ok: true };
}

export async function deleteBudget(id: unknown): Promise<BudgetActionResult> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: NOT_FOUND };

  const { supabase, userId } = await getSessionUser();
  if (!userId) return { ok: false, error: SESSION_EXPIRED };

  const { data, error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', parsedId.data)
    .eq('user_id', userId)
    .select('id');
  if (error) {
    console.error('deleteBudget failed', { code: error.code, message: error.message });
    return { ok: false, error: 'No pudimos eliminar el presupuesto. Intenta de nuevo.' };
  }
  if (!data || data.length === 0) return { ok: false, error: NOT_FOUND };

  revalidateBudgetPages();
  return { ok: true };
}

/**
 * Copies last month's budgets into `month`. Uses ON CONFLICT DO NOTHING, so a
 * double tap or a second tab never duplicates a budget nor fails.
 */
export async function copyPreviousMonthBudgets(month: unknown): Promise<CopyBudgetsResult> {
  const parsedMonth = monthParamSchema.safeParse(month);
  if (!parsedMonth.success) return { ok: false, error: INVALID_DATA };

  const { supabase, userId } = await getSessionUser();
  if (!userId) return { ok: false, error: SESSION_EXPIRED };

  const target = toYearMonth(parsedMonth.data);
  const previous = shiftMonth(target, -1);

  const { data: previousBudgets, error: readError } = await supabase
    .from('budgets')
    .select('category_id, limit_amount')
    .eq('user_id', userId)
    .eq('month', firstDay(previous));
  if (readError) {
    console.error('copyPreviousMonthBudgets read failed', { message: readError.message });
    return { ok: false, error: 'No pudimos copiar los presupuestos. Intenta de nuevo.' };
  }
  if (!previousBudgets || previousBudgets.length === 0) {
    return { ok: false, error: 'El mes anterior no tiene presupuestos.' };
  }

  const rows = previousBudgets.map((budget) => ({
    user_id: userId,
    category_id: budget.category_id,
    limit_amount: budget.limit_amount,
    month: firstDay(target),
  }));
  const { data: inserted, error } = await supabase
    .from('budgets')
    .upsert(rows, { onConflict: 'user_id,category_id,month', ignoreDuplicates: true })
    .select('id');
  if (error) {
    console.error('copyPreviousMonthBudgets failed', { code: error.code, message: error.message });
    return { ok: false, error: 'No pudimos copiar los presupuestos. Intenta de nuevo.' };
  }

  revalidateBudgetPages();
  return { ok: true, copied: inserted?.length ?? 0 };
}
