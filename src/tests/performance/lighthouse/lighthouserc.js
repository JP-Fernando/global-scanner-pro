/**
 * Lighthouse CI configuration.
 *
 * Runs against the locally-served index.html and asserts
 * performance budgets defined in the project roadmap.
 */
export default {
  ci: {
    collect: {
      url: ['http://localhost:3000/'],
      startServerCommand: 'node server.js',
      startServerReadyPattern: 'Server started',
      startServerReadyTimeout: 15000,
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --headless',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        throttling: {
          cpuSlowdownMultiplier: 1,
        },
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1500 }],
        'interactive': ['error', { maxNumericValue: 3000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
