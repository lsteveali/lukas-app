import { defineConfig, devices } from '@playwright/test';

import { getLocalSupabase } from './e2e/supabase-env';

// End-to-end tests run against a LOCAL Supabase (`npx supabase@3.0.0 start`),
// in CI and on machines with Docker. Keys come from `supabase status`: no
// GitHub secrets and no hosted test project.
const supabase = getLocalSupabase();
const PORT = 3100;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  // No retries: a flaky test should fail loudly, not hide behind a retry.
  retries: 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      testIgnore: /\.db\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'desktop',
      testIgnore: /\.db\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
    // Database-level tests without a browser (e.g. concurrent withdrawals).
    { name: 'db', testMatch: /\.db\.spec\.ts$/ },
  ],
  webServer: {
    // Production build pointed at the local Supabase.
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !isCI,
    timeout: 240_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: supabase.url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabase.publishableKey,
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
});
