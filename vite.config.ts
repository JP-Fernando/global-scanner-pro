/**
 * Vite Configuration — Phase 3.1.1: Frontend Build Optimisation
 *
 * Bundles browser-side TypeScript modules into optimised, hashed assets
 * for production. Keeps the development workflow (npm run dev) unchanged —
 * Express still serves tsc-compiled files from the project root in dev/test.
 *
 * Build output: dist/public/assets/  (hashed, minified JS + CSS)
 * HTML injection: scripts/inject-vite-assets.js creates dist/public/index.html
 *
 * Key features:
 * - esbuild minification (JS + CSS)
 * - Source maps for production debugging
 * - Asset content hashing for long-term caching (1-year max-age)
 * - Code splitting by domain (ml, analytics, indicators, portfolio, i18n)
 * - Vite manifest for post-build HTML injection
 */
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',

  build: {
    outDir: 'dist/public',
    emptyOutDir: true,

    // Source maps for production debugging (uploaded to Sentry if configured)
    sourcemap: true,

    // Fast JS/CSS minification via esbuild (default in Vite)
    minify: 'esbuild',
    cssMinify: true,

    // Generate asset manifest for post-build HTML injection
    manifest: true,

    // Inline assets smaller than 4 KB as base64 data URIs
    assetsInlineLimit: 4096,

    // Warn when chunks exceed 600 KB (gzipped budget: 200 KB)
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      /**
       * Entry points: the three browser-side TS modules referenced in index.html,
       * plus the main attribution dashboard CSS.
       */
      input: {
        scanner: resolve(__dirname, 'src/core/scanner.ts'),
        'ui-translator': resolve(__dirname, 'src/i18n/ui-translator.ts'),
        'ui-init': resolve(__dirname, 'src/i18n/ui-init.ts'),
        'attribution-dashboard': resolve(
          __dirname,
          'src/dashboard/attribution-dashboard.css'
        ),
      },

      output: {
        // Hashed filenames for long-term browser caching
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',

        /**
         * Manual chunk splitting by functional domain.
         * Allows individual domains to be cached independently —
         * a change to the ML module only invalidates the ml chunk,
         * not the entire bundle.
         */
        manualChunks(id: string) {
          if (id.includes('/src/ml/')) return 'chunk-ml';
          if (id.includes('/src/analytics/')) return 'chunk-analytics';
          if (id.includes('/src/indicators/')) return 'chunk-indicators';
          if (id.includes('/src/portfolio/')) return 'chunk-portfolio';
          if (id.includes('/src/reports/')) return 'chunk-reports';
          if (id.includes('/src/i18n/')) return 'chunk-i18n';
          if (id.includes('/src/allocation/')) return 'chunk-allocation';
          if (id.includes('/src/data/')) return 'chunk-data';
          if (id.includes('/src/dashboard/')) return 'chunk-dashboard';
          if (id.includes('/src/alerts/')) return 'chunk-alerts';
          if (id.includes('/src/storage/')) return 'chunk-storage';
        },
      },
    },
  },

  /**
   * Resolve TypeScript path aliases.
   * Mirrors the paths available in tsconfig.json.
   */
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
    // Allow Vite to resolve .ts imports with .js extensions
    // (TypeScript ESM convention: import from './foo.js' resolves to foo.ts)
    extensions: ['.ts', '.js', '.json'],
  },

  /**
   * Vite dev server configuration.
   * Run `npm run dev:vite` to use Vite as the frontend dev server with
   * HMR (Hot Module Replacement). The backend API server must run separately
   * on port 3001: `PORT=3001 npm run dev:server`.
   */
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/metrics': 'http://localhost:3001',
      '/api-docs': 'http://localhost:3001',
    },
  },
});
