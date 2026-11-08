import { randomUUID } from 'node:crypto';

import { test as base, expect, type Locator, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../src/types/database';

import { getLocalSupabase } from './supabase-env';

export type TestUser = { id: string; email: string; password: string; fullName: string };

/** Admin client on the LOCAL Supabase (service role). Test code only. */
function adminClient() {
  const { url, serviceRoleKey } = getLocalSupabase();
  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** A signed-in supabase-js client for a test user (for database-level tests). */
export async function userClient(user: TestUser) {
  const { url, publishableKey } = getLocalSupabase();
  const client = createClient<Database>(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) throw error;
  return client;
}

/**
 * Every test gets its own confirmed user, deleted afterwards (its data goes
 * with it through `on delete cascade`). Tests never share data, so they can
 * run in parallel.
 */
export const test = base.extend<{ testUser: TestUser }>({
  // Named `provide` (Playwright calls it `use`) so the React hooks lint rule does not flag it.
  testUser: async ({}, provide) => {
    const admin = adminClient();
    const suffix = randomUUID().slice(0, 8);
    const user = {
      email: `e2e-${suffix}@lukas.test`,
      // Matches the auth rules: 8+ characters with letters and digits.
      password: `Prueba${suffix}1`,
      fullName: 'Ana Prueba',
    };
    const { data, error } = await admin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { full_name: user.fullName },
    });
    if (error || !data.user) throw error ?? new Error('createUser returned no user');

    await provide({ ...user, id: data.user.id });

    await admin.auth.admin.deleteUser(data.user.id);
  },
});

export { expect };

/** Signs in through the real /login form. */
export async function loginAs(page: Page, user: TestUser, path = '/dashboard') {
  await page.goto(`/login?next=${encodeURIComponent(path)}`);
  await page.getByLabel('Correo').fill(user.email);
  await page.getByLabel('Contraseña').fill(user.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL((url) => url.pathname === path.split('?')[0]);
}

/**
 * Clicks a button that opens a dialog and waits for it. Retries the click: a
 * tap that lands before React hydrates the trigger does nothing (just like on
 * a slow phone, where the user simply taps again).
 */
export async function openDialog(page: Page, trigger: Locator, dialogName: string | RegExp) {
  const dialog = page.getByRole('dialog', { name: dialogName });
  await expect(async () => {
    if (!(await dialog.isVisible())) await trigger.click();
    await expect(dialog).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  return dialog;
}

/** Picks an option in a shadcn/Radix Select by its visible label. */
export async function selectOption(page: Page, label: string, option: string) {
  await page.getByLabel(label).click();
  await page.getByRole('option', { name: option }).click();
}
