import { defineConfig } from '@playwright/test';

// Dedicated production-artifact check, including a static-hosting subpath.
export default defineConfig({
  testDir: './src/tests/production',
  testMatch: '**/*.spec.js',
  outputDir: './test-results/build',
  reporter: 'list',
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: { viewport: { width: 390, height: 844 } }
});
