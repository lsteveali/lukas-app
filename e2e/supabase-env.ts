import { execSync } from 'node:child_process';

/**
 * Connection details of the LOCAL Supabase started with `supabase start`
 * (CI or a developer machine with Docker). Never a hosted project: the e2e
 * tests create and delete users with the service role key.
 */
export type LocalSupabase = {
  url: string;
  publishableKey: string;
  /** Local service role key. Only test code reads it; the app never does. */
  serviceRoleKey: string;
};

let cached: LocalSupabase | null = null;

function readStatus(): Record<string, string | undefined> {
  const output = execSync('npx --yes supabase@3.0.0 status -o json', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // The CLI may print extra lines; keep the JSON object.
  const json = output.slice(output.indexOf('{'), output.lastIndexOf('}') + 1);
  return JSON.parse(json) as Record<string, string | undefined>;
}

/**
 * Reads `supabase status -o json` (accepting both old and new key names).
 * E2E_SUPABASE_URL / _PUBLISHABLE_KEY / _SERVICE_ROLE_KEY override it, still
 * restricted to a local URL.
 */
export function getLocalSupabase(): LocalSupabase {
  if (cached) return cached;

  const fromEnv = process.env.E2E_SUPABASE_URL
    ? {
        API_URL: process.env.E2E_SUPABASE_URL,
        PUBLISHABLE_KEY: process.env.E2E_SUPABASE_PUBLISHABLE_KEY,
        SECRET_KEY: process.env.E2E_SUPABASE_SERVICE_ROLE_KEY,
      }
    : null;
  const status: Record<string, string | undefined> = fromEnv ?? readStatus();

  const url = status.API_URL;
  const publishableKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  const serviceRoleKey = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
  if (!url || !publishableKey || !serviceRoleKey) {
    throw new Error(
      `Could not read the local Supabase keys from "supabase status" (got: ${Object.keys(status).join(', ')}). Is "npx supabase@3.0.0 start" running?`,
    );
  }
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
    throw new Error(`Refusing to run e2e tests against a non-local Supabase: ${url}`);
  }

  cached = { url, publishableKey, serviceRoleKey };
  return cached;
}
