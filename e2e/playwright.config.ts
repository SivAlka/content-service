import { defineConfig, devices } from '@playwright/test';

const API_PORT = Number(process.env.E2E_API_PORT ?? 3101);
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 5273);

export default defineConfig({
  testDir: './tests',
  // The app has one shared in-memory store, so tests run serially against a reset state.
  // (Discussion topic: how would you make these safe to run in parallel?)
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    testIdAttribute: 'data-testid',
  },
  projects: [
    { name: 'api', testDir: './tests/api', use: { baseURL: `http://localhost:${API_PORT}` } },
    { name: 'ui', testDir: './tests/ui', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'npm run dev -w server',
      cwd: '..',
      url: `http://localhost:${API_PORT}/api/health`,
      env: { PORT: String(API_PORT), SCHEDULER_INTERVAL_MS: '1000' },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev -w web',
      cwd: '..',
      url: `http://localhost:${WEB_PORT}`,
      env: { WEB_PORT: String(WEB_PORT), VITE_API_TARGET: `http://localhost:${API_PORT}` },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
