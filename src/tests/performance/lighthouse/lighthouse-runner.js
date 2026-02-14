/**
 * Lighthouse CI runner.
 *
 * Wraps `lhci autorun` with the project configuration.
 * Usage: node src/tests/performance/lighthouse/lighthouse-runner.js
 */
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, 'lighthouserc.js');
const rootDir = path.resolve(__dirname, '../../../../');

try {
  console.log('\n  Running Lighthouse CI audit...\n');

  execSync(
    `npx lhci autorun --config=${configPath}`,
    {
      cwd: rootDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: '3000',
        RATE_LIMIT_MAX_REQUESTS: '10000',
      },
    }
  );

  console.log('\n  Lighthouse audit passed.\n');
} catch {
  console.error('\n  Lighthouse audit failed.');
  process.exitCode = 1;
}
