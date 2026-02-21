/**
 * Load test runner utility.
 *
 * Starts the Express server as a child process, runs autocannon against it,
 * validates results against budgets, and provides cleanup helpers.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import autocannon from 'autocannon';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../../../');

/**
 * Start the server as a child process.
 * @param {Object} [envOverrides] - Environment variable overrides
 * @returns {Promise<{process: import('child_process').ChildProcess, port: number}>}
 */
export async function startServer(envOverrides = {}) {
  const port = envOverrides.PORT || 3099;
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    PORT: String(port),
    LOG_LEVEL: 'error',
    ...envOverrides,
  };

  const child = spawn(
    path.join(ROOT_DIR, 'node_modules', '.bin', 'tsx'),
    ['server.js'],
    { env, cwd: ROOT_DIR, stdio: 'pipe' }
  );

  // Ensure cleanup on unexpected exit
  const cleanup = () => stopServer(child);
  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  await waitForServer(`http://localhost:${port}/api/health`, 15000);

  return { process: child, port };
}

/**
 * Poll until the server responds to the health check.
 */
async function waitForServer(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Server did not start within ${timeoutMs}ms`);
}

/**
 * Run an autocannon load test.
 * @param {Object} options - autocannon options
 * @returns {Promise<Object>} autocannon result
 */
export async function runLoadTest(options) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(options, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
    // Show progress bar in local runs, silent in CI
    if (!process.env.CI) {
      autocannon.track(instance, { renderProgressBar: true });
    }
  });
}

/**
 * Stop the server child process.
 */
export function stopServer(serverProcess) {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGTERM');
  }
}

/**
 * Assert load test results against performance budgets.
 * @returns {{ pass: boolean, failures: string[] }}
 */
export function assertBudgets(result, budgets) {
  const failures = [];
  // autocannon uses p97_5 (no p95 field); use p97.5 as a conservative proxy for p95
  const p97_5 = result.latency.p97_5 ?? result.latency.p2_5;

  if (budgets.p95ResponseMs != null && p97_5 > budgets.p95ResponseMs) {
    failures.push(
      `p97.5 latency ${p97_5}ms exceeds budget ${budgets.p95ResponseMs}ms`
    );
  }
  if (budgets.p99ResponseMs != null && result.latency.p99 > budgets.p99ResponseMs) {
    failures.push(
      `p99 latency ${result.latency.p99}ms exceeds budget ${budgets.p99ResponseMs}ms`
    );
  }
  if (budgets.minRequestsPerSec != null
      && result.requests.average < budgets.minRequestsPerSec) {
    failures.push(
      `avg throughput ${result.requests.average} req/s ` +
      `below budget ${budgets.minRequestsPerSec} req/s`
    );
  }

  return { pass: failures.length === 0, failures };
}

/**
 * Print a summary of load test results to stdout.
 */
export function printResults(result) {
  console.log(`    Avg latency:    ${result.latency.average} ms`);
  console.log(`    p97.5 latency:  ${result.latency.p97_5} ms`);
  console.log(`    p99 latency:    ${result.latency.p99} ms`);
  console.log(`    Avg throughput: ${result.requests.average} req/s`);
  console.log(`    Total requests: ${result.requests.total}`);
  if (result.non2xx) {
    console.log(`    Non-2xx:        ${result.non2xx}`);
  }
}
