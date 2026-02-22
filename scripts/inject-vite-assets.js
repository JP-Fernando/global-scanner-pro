#!/usr/bin/env node
/**
 * inject-vite-assets.js — Phase 3.1.1: Frontend Build Optimisation
 *
 * Post-build script that generates dist/public/index.html by:
 * 1. Reading the Vite asset manifest (dist/public/.vite/manifest.json)
 * 2. Copying the source index.html
 * 3. Replacing dev-mode script/CSS references with hashed production paths
 * 4. Injecting <link rel="modulepreload"> hints for all shared chunks
 * 5. Copying the universes/ directory so production Express can serve it
 *
 * Run: node scripts/inject-vite-assets.js
 * (Automatically called by `npm run build:client`)
 */
import { readFileSync, writeFileSync, cpSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

// ── 1. Read Vite manifest ──────────────────────────────────────────────────
const manifestPath = resolve(rootDir, 'dist/public/.vite/manifest.json');
if (!existsSync(manifestPath)) {
  console.error('❌ Vite manifest not found. Run `npm run build:client:vite` first.');
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

/**
 * Look up a manifest entry by its source key.
 * Vite keyed entries by the path relative to the project root.
 */
function getEntry(srcKey) {
  const entry = manifest[srcKey];
  if (!entry) {
    console.warn(`⚠️  Manifest entry not found for: ${srcKey}`);
  }
  return entry;
}

// ── 2. Resolve hashed asset paths ─────────────────────────────────────────
const scannerEntry = getEntry('src/core/scanner.ts');
const translatorEntry = getEntry('src/i18n/ui-translator.ts');
const initEntry = getEntry('src/i18n/ui-init.ts');
const cssEntry = getEntry('src/dashboard/attribution-dashboard.css');

// Collect all chunk files for preload hints
const chunkFiles = Object.values(manifest)
  .filter((e) => !e.isEntry && e.file && e.file.endsWith('.js'))
  .map((e) => e.file);

// ── 3. Read source index.html ──────────────────────────────────────────────
let html = readFileSync(resolve(rootDir, 'index.html'), 'utf-8');

// ── 4. Replace CSS link ────────────────────────────────────────────────────
if (cssEntry && cssEntry.css && cssEntry.css.length > 0) {
  const hashedCss = cssEntry.css[0];
  html = html.replace(
    '<link rel="stylesheet" href="src/dashboard/attribution-dashboard.css" />',
    `<link rel="stylesheet" href="/${hashedCss}" />`
  );
  console.log(`  ✓ CSS: src/dashboard/attribution-dashboard.css → /${hashedCss}`);
} else if (cssEntry && cssEntry.file) {
  // CSS-as-module entry: the CSS is embedded in the JS entry — no separate link needed
  html = html.replace(
    '<link rel="stylesheet" href="src/dashboard/attribution-dashboard.css" />\n',
    ''
  );
  console.log(`  ✓ CSS: inlined via /${cssEntry.file}`);
}

// ── 5. Replace JS script tags ──────────────────────────────────────────────
if (scannerEntry) {
  html = html.replace(
    '<script type="module" src="dist/src/core/scanner.js"></script>',
    `<script type="module" src="/${scannerEntry.file}"></script>`
  );
  console.log(`  ✓ scanner.ts → /${scannerEntry.file}`);
}

if (translatorEntry) {
  html = html.replace(
    '<script type="module" src="dist/src/i18n/ui-translator.js"></script>',
    `<script type="module" src="/${translatorEntry.file}"></script>`
  );
  console.log(`  ✓ ui-translator.ts → /${translatorEntry.file}`);
}

if (initEntry) {
  html = html.replace(
    '<script type="module" src="dist/src/i18n/ui-init.js"></script>',
    `<script type="module" src="/${initEntry.file}"></script>`
  );
  console.log(`  ✓ ui-init.ts → /${initEntry.file}`);
}

// ── 6. Inject <link rel="modulepreload"> hints for shared chunks ───────────
if (chunkFiles.length > 0) {
  const preloadTags = chunkFiles
    .map((f) => `  <link rel="modulepreload" href="/${f}" />`)
    .join('\n');
  // Insert before </head>
  html = html.replace('</head>', `${preloadTags}\n</head>`);
  console.log(`  ✓ Injected ${chunkFiles.length} modulepreload hint(s)`);
}

// ── 7. Write dist/public/index.html ───────────────────────────────────────
mkdirSync(resolve(rootDir, 'dist/public'), { recursive: true });
writeFileSync(resolve(rootDir, 'dist/public/index.html'), html);
console.log('  ✓ dist/public/index.html written');

// ── 8. Copy universes/ data so production Express can serve them ───────────
const universesDir = resolve(rootDir, 'universes');
const universesOut = resolve(rootDir, 'dist/public/universes');
if (existsSync(universesDir)) {
  cpSync(universesDir, universesOut, { recursive: true });
  console.log('  ✓ universes/ copied to dist/public/universes/');
}

console.log('\n✅ inject-vite-assets: production build complete → dist/public/');
