'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getAuthErrorMessage } from '@/lib/auth/errors';
import { createClient } from '@/lib/supabase/server';
import { getRequestOrigin } from '@/lib/utils/origin';
import { safeNextPath } from '@/lib/utils/redirect';
import { loginSchema, registerSchema } from '@/lib/validations/auth';

export type AuthActionResult = { error: string } | undefined;
export type SignUpResult = { error: string } | { emailSentTo: string };

const INVALID_DATA = 'Revisa los datos del formulario.';

export async function signIn(input: unknown, next?: string): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { error: INVALID_DATA };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code !== 'invalid_credentials') {
      console.error('signIn failed', { code: error.code, status: error.status });
    }
    return { error: getAuthErrorMessage(error.code) };
  }

  revalidatePath('/', 'layout');
  redirect(safeNextPath(next));
}

export async function signUp(input: unknown): Promise<SignUpResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { error: INVALID_DATA };

  const { fullName, email, password } = parsed.data;
  const origin = await getRequestOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Read by the handle_new_user trigger to fill profiles.full_name.
      data: { full_name: fullName },
      // The "Confirm signup" email template builds its link from this URL.
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) {
    console.error('signUp failed', { code: error.code, status: error.status });
    return { error: getAuthErrorMessage(error.code) };
  }

  // With email confirmation on, an already-registered email returns no error
  // (to avoid revealing accounts), so the UI shows the same message.
  return { emailSentTo: email };
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const next = safeNextPath(formData.get('next')?.toString());
  const origin = await getRequestOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });

  if (error || !data.url) {
    console.error('signInWithOAuth failed', { code: error?.code, status: error?.status });
    redirect('/login?error=google');
  }

  redirect(data.url);
}
