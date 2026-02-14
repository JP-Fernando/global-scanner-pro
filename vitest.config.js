import { defineConfig } from 'vitest/config';

export default defineConfig({
  benchmark: {
    include: ['src/tests/performance/benchmarks/**/*.bench.js'],
    setupFiles: ['./src/tests/vitest.setup.js'],
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/tests/vitest.setup.js'],
    include: ['src/tests/unit/**/*.test.js', 'src/tests/integration/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: [
        'src/indicators/**/*.js',
        'src/analytics/**/*.js',
        'src/core/**/*.js',
        'src/ml/**/*.js',
        'src/alerts/**/*.js',
        'src/reports/**/*.js',
        'src/security/**/*.js',
        'src/middleware/**/*.js',
        'src/storage/**/*.js',
        'src/portfolio/**/*.js',
        'src/allocation/**/*.js',
        'src/config/**/*.js',
      ],
      // Phase 2.1.2 thresholds (Feb 2026)
      thresholds: {
        statements: 80,
        branches: 60,
        functions: 85,
        lines: 80,
      },
    },
    testTimeout: 30000,
    sequence: {
      shuffle: false,
    },
  },
});
