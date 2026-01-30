import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/tests/vitest.setup.js'],
    include: ['src/tests/unit/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: [
        'src/indicators/**',
        'src/analytics/**',
        'src/core/**',
        'src/ml/**',
        'src/alerts/**',
        'src/reports/**',
        'src/security/**',
        'src/middleware/**',
        'src/storage/**',
        'src/portfolio/**',
        'src/allocation/**',
        'src/config/**',
      ],
      // Phase 2.1.1 baseline — raise to 80/60/80/80 in Phase 2.1.2
      thresholds: {
        statements: 38,
        branches: 20,
        functions: 40,
        lines: 38,
      },
    },
    testTimeout: 30000,
    sequence: {
      shuffle: false,
    },
  },
});
