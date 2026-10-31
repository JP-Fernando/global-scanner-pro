import { defineConfig, devices } from '@playwright/test';

const testPort = process.env.E2E_PORT || '3107';
const testOrigin = `http://localhost:${testPort}`;

export default defineConfig({
  testDir: './src/tests/e2e',
  testMatch: '**/*.spec.js',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: testOrigin,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  webServer: {
    command: 'npm run build:server && npx tsx server.js',
    url: `${testOrigin}/api/health`,
    reuseExistingServer: !process.env.CI && process.env.E2E_REUSE_SERVER === '1',
    timeout: 30_000,
    env: {
      NODE_ENV: 'test',
      PORT: testPort,
      ALLOWED_ORIGINS: testOrigin,
      DATABASE_PATH: ':memory:',
      RATE_LIMIT_MAX_REQUESTS: '10000',
      RATE_LIMIT_WINDOW_MS: '60000',
    },
  },
});
