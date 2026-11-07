'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { NEGATIVE_BALANCE_MESSAGE, toSignedAmount } from '@/lib/finance/contributions';
import { createClient } from '@/lib/supabase/server';
import { contributionSchema } from '@/lib/validations/contribution';

export type ContributionActionResult = { ok: true } | { ok: false; error: string };

const INVALID_DATA = 'Revisa los datos del formulario.';
const SESSION_EXPIRED = 'Tu sesión expiró. Inicia sesión de nuevo.';
const GOAL_NOT_FOUND = 'No se encontró la meta.';
const CONTRIBUTION_NOT_FOUND = 'No se encontró el aporte.';

// Raised by the check_goal_balance trigger (see the goals migration).
const CHECK_VIOLATION = '23514';
const BALANCE_ERROR = 'goal_balance_negative';
// The composite FK (goal_id, user_id) → goals rejects a goal of another user.
const FOREIGN_KEY_VIOLATION = '23503';

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

function revalidateGoal(goalId: string) {
  revalidatePath('/metas');
  revalidatePath(`/metas/${goalId}`);
}

function failure(action: string, error: DbError): ContributionActionResult {
  // Match the trigger's message too: other CHECKs share the 23514 code.
  if (error.code === CHECK_VIOLATION && error.message.includes(BALANCE_ERROR)) {
    return { ok: false, error: NEGATIVE_BALANCE_MESSAGE };
  }
  console.error(`${action} failed`, { code: error.code, message: error.message });
  return { ok: false, error: 'No pudimos guardar el aporte. Intenta de nuevo.' };
}

export async function addContribution(
  goalId: unknown,
  input: unknown,
): Promise<ContributionActionResult> {
  const parsedGoalId = idSchema.safeParse(goalId);
  if (!parsedGoalId.success) return { ok: false, error: GOAL_NOT_FOUND };
  const parsed = contributionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID_DATA };

  const { supabase, userId } = await getSessionUser();
  if (!userId) return { ok: false, error: SESSION_EXPIRED };

  const { kind, amount, date, note } = parsed.data;
  const { error } = await supabase.from('goal_contributions').insert({
    goal_id: parsedGoalId.data,
    // Always the signed-in user: never taken from the form.
    user_id: userId,
    amount: toSignedAmount(kind, amount),
    date,
    note,
  });
  if (error) {
    if (error.code === FOREIGN_KEY_VIOLATION) return { ok: false, error: GOAL_NOT_FOUND };
    return failure('addContribution', error);
  }

  revalidateGoal(parsedGoalId.data);
  return { ok: true };
}

export async function updateContribution(
  id: unknown,
  input: unknown,
): Promise<ContributionActionResult> {
  const parsedId = idSchema.safeParse(id);
  const parsed = contributionSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) return { ok: false, error: INVALID_DATA };

  const { supabase, userId } = await getSessionUser();
  if (!userId) return { ok: false, error: SESSION_EXPIRED };

  const { kind, amount, date, note } = parsed.data;
  // With RLS, a missing or foreign row matches 0 rows instead of failing;
  // `.select()` returns the updated rows so we can tell (and find the goal).
  const { data, error } = await supabase
    .from('goal_contributions')
    .update({ amount: toSignedAmount(kind, amount), date, note })
    .eq('id', parsedId.data)
    .eq('user_id', userId)
    .select('id, goal_id');
  if (error) return failure('updateContribution', error);
  const row = data?.[0];
  if (!row) return { ok: false, error: CONTRIBUTION_NOT_FOUND };

  revalidateGoal(row.goal_id);
  return { ok: true };
}

export async function deleteContribution(id: unknown): Promise<ContributionActionResult> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: CONTRIBUTION_NOT_FOUND };

  const { supabase, userId } = await getSessionUser();
  if (!userId) return { ok: false, error: SESSION_EXPIRED };

  const { data, error } = await supabase
    .from('goal_contributions')
    .delete()
    .eq('id', parsedId.data)
    .eq('user_id', userId)
    .select('id, goal_id');
  if (error) return failure('deleteContribution', error);
  const row = data?.[0];
  if (!row) return { ok: false, error: CONTRIBUTION_NOT_FOUND };

  revalidateGoal(row.goal_id);
  return { ok: true };
}
