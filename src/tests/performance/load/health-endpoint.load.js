/**
 * Load test: /api/health
 *
 * Tests raw throughput of the health endpoint (exempt from rate limiting).
 * Usage: node src/tests/performance/load/health-endpoint.load.js
 */
import {
  startServer, runLoadTest, stopServer, assertBudgets, printResults,
} from './load-test-runner.js';
import { API_BUDGETS } from '../budgets/performance-budgets.js';

let server;

try {
  server = await startServer({
    PORT: '3099',
    RATE_LIMIT_MAX_REQUESTS: '100000',
  });

  console.log('\n  Load testing /api/health ...\n');

  const result = await runLoadTest({
    url: `http://localhost:${server.port}/api/health`,
    connections: 10,
    duration: 10,
    pipelining: 1,
  });

  console.log('\n  Results:');
  printResults(result);

  const { pass, failures } = assertBudgets(result, API_BUDGETS.health);

  if (!pass) {
    console.error('\n  BUDGET VIOLATIONS:');
    for (const f of failures) console.error(`    - ${f}`);
    process.exitCode = 1;
  } else {
    console.log('\n  All budgets passed.\n');
  }
} catch (err) {
  console.error('Load test failed:', err.message);
  process.exitCode = 1;
} finally {
  stopServer(server?.process);
  // Give server time to shut down gracefully
  await new Promise((r) => setTimeout(r, 500));
}
