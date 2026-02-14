/**
 * Load test: /api/yahoo (server overhead measurement)
 *
 * Measures the Express middleware stack performance for the Yahoo endpoint.
 * The external Yahoo Finance API call will time out quickly, so we measure
 * error-path performance which still exercises the full middleware chain
 * (validation, rate limiting, error handling).
 *
 * Usage: node src/tests/performance/load/yahoo-endpoint.load.js
 */
import {
  startServer, runLoadTest, stopServer, assertBudgets, printResults,
} from './load-test-runner.js';
import { API_BUDGETS } from '../budgets/performance-budgets.js';

let server;

try {
  server = await startServer({
    PORT: '3098',
    RATE_LIMIT_MAX_REQUESTS: '100000',
    RATE_LIMIT_YAHOO_MAX: '100000',
    REQUEST_TIMEOUT: '500',
  });

  console.log('\n  Load testing /api/yahoo (middleware overhead) ...\n');

  const result = await runLoadTest({
    url: `http://localhost:${server.port}/api/yahoo?symbol=AAPL&from=1672531200&to=1704067200`,
    connections: 5,
    duration: 10,
    pipelining: 1,
  });

  console.log('\n  Results:');
  printResults(result);

  const { pass, failures } = assertBudgets(result, API_BUDGETS.yahoo);

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
  await new Promise((r) => setTimeout(r, 500));
}
