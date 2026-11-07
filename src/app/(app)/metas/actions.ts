'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { goalSchema } from '@/lib/validations/goal';

export type GoalActionResult = { ok: true } | { ok: false; error: string };

const INVALID_DATA = 'Revisa los datos del formulario.';
const SESSION_EXPIRED = 'Tu sesión expiró. Inicia sesión de nuevo.';
const NOT_FOUND = 'No se encontró la meta.';

const idSchema = z.uuid();

/** Signed-in user's id, from the session on the server (never the client). */
async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

function failure(action: string, error: { code: string; message: string }): GoalActionResult {
  console.error(`${action} failed`, { code: error.code, message: error.message });
  return { ok: false, error: 'No pudimos guardar la meta. Intenta de nuevo.' };
}

export async function createGoal(input: unknown): Promise<GoalActionResult> {
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID_DATA };

  const { supabase, userId } = await getSessionUser();
  if (!userId) return { ok: false, error: SESSION_EXPIRED };

  const { name, targetAmount, deadline } = parsed.data;
  const { error } = await supabase
    .from('goals')
    .insert({ user_id: userId, name, target_amount: targetAmount, deadline });
  if (error) return failure('createGoal', error);

  revalidatePath('/metas');
  return { ok: true };
}

export async function updateGoal(id: unknown, input: unknown): Promise<GoalActionResult> {
  const parsedId = idSchema.safeParse(id);
  const parsed = goalSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) return { ok: false, error: INVALID_DATA };

  const { supabase, userId } = await getSessionUser();
  if (!userId) return { ok: false, error: SESSION_EXPIRED };

  const { name, targetAmount, deadline } = parsed.data;
  // With RLS, a row that is missing or someone else's matches 0 rows instead
  // of failing; `.select()` returns the updated rows so we can tell.
  const { data, error } = await supabase
    .from('goals')
    .update({ name, target_amount: targetAmount, deadline })
    .eq('id', parsedId.data)
    .eq('user_id', userId)
    .select('id');
  if (error) return failure('updateGoal', error);
  if (!data || data.length === 0) return { ok: false, error: NOT_FOUND };

  revalidatePath('/metas');
  return { ok: true };
}

/** Deletes the goal and, by cascade, all its contributions. */
export async function deleteGoal(id: unknown): Promise<GoalActionResult> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: NOT_FOUND };

  const { supabase, userId } = await getSessionUser();
  if (!userId) return { ok: false, error: SESSION_EXPIRED };

  const { data, error } = await supabase
    .from('goals')
    .delete()
    .eq('id', parsedId.data)
    .eq('user_id', userId)
    .select('id');
  if (error) {
    console.error('deleteGoal failed', { code: error.code, message: error.message });
    return { ok: false, error: 'No pudimos eliminar la meta. Intenta de nuevo.' };
  }
  if (!data || data.length === 0) return { ok: false, error: NOT_FOUND };

  revalidatePath('/metas');
  return { ok: true };
}
