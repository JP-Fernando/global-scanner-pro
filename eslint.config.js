import js from '@eslint/js';

export default [
  // Base recommended rules
  js.configs.recommended,

  // Apply to all JS files
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        global: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',

        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        Image: 'readonly',
        Blob: 'readonly',
        Worker: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        performance: 'readonly',
        PerformanceObserver: 'readonly',
        IntersectionObserver: 'readonly',
        MutationObserver: 'readonly',
        ResizeObserver: 'readonly',
        self: 'readonly',
        location: 'readonly',
        history: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'max-len': [
        'warn',
        {
          code: 100,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
        },
      ],
      'no-use-before-define': [
        'error',
        {
          functions: false,
          classes: true,
          variables: true,
        },
      ],
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'warn',
      'prefer-arrow-callback': 'warn',
      'prefer-template': 'warn',
      'no-param-reassign': ['error', { props: false }],
    },
  },

  // Override rules for test files (legacy)
  {
    files: ['src/tests/**/*.js'],
    rules: {
      'no-console': 'off',
      'max-len': 'off',
    },
  },

  // Override rules for Playwright E2E test files
  {
    files: ['src/tests/e2e/**/*.js', 'src/tests/e2e/**/*.spec.js'],
    languageOptions: {
      globals: {
        test: 'readonly',
        expect: 'readonly',
        Event: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'max-len': 'off',
    },
  },

  // Override rules for Vitest test files
  {
    files: ['src/tests/unit/**/*.test.js'],
    languageOptions: {
      globals: {
        // Vitest globals (enabled via vitest.config.js globals: true)
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
        test: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'max-len': 'off',
    },
  },

  // Override rules for server.js
  {
    files: ['server.js'],
    rules: {
      'no-console': 'off',
    },
  },

  // Ignore patterns
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'coverage/',
      '*.min.js',
      'server.js.bak',
    ],
  },
];
