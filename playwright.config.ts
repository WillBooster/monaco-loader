import { defineConfig, devices } from '@playwright/test';

const port = 3010;

export default defineConfig({
  forbidOnly: !!process.env.CI,
  retries: process.env.PWDEBUG ? 0 : process.env.CI ? 5 : 1,
  testDir: 'test/e2e',
  testMatch: '**/*.e2e.ts',
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  use: {
    screenshot: process.env.CI ? 'only-on-failure' : 'on',
    video: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    baseURL: `http://127.0.0.1:${port}`,
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
  },
  webServer: {
    command: `bun run build && bun run next build test/e2e/next-app && bun run next start test/e2e/next-app --hostname 127.0.0.1 --port ${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    url: `http://127.0.0.1:${port}`,
  },
});
