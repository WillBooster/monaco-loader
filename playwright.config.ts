import { defineConfig, devices } from '@playwright/test';

const port = 3010;

export default defineConfig({
  testDir: 'test/e2e',
  testMatch: '**/*.e2e.ts',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'on-first-retry',
  },
  webServer: {
    // Playwright owns the whole fixture lifecycle (build the library, then build and start the
    // Next.js fixture). wb runs `playwright test test/e2e/` for libraries and never launches a
    // server itself, so the build steps live here rather than in a separate script.
    command: `bun run build && bunx next build test/e2e/next-app && bunx next start test/e2e/next-app --hostname 127.0.0.1 --port ${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    url: `http://127.0.0.1:${port}`,
  },
});
