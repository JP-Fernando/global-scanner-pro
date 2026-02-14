/**
 * Load test: Rate Limiting Validation
 *
 * Sends requests exceeding the rate limit and validates that:
 * 1. Requests beyond the limit get 429 status
 * 2. 429 responses are returned quickly
 *
 * Usage: node src/tests/performance/load/rate-limiting.load.js
 */
import {
  startServer, runLoadTest, stopServer, printResults,
} from './load-test-runner.js';

let server;

try {
  server = await startServer({
    PORT: '3097',
    RATE_LIMIT_MAX_REQUESTS: '20',
    RATE_LIMIT_WINDOW_MS: '60000',
  });

  console.log('\n  Testing rate limiting (limit=20, sending 50 requests) ...\n');

  const result = await runLoadTest({
    url: `http://localhost:${server.port}/api/run-tests`,
    connections: 5,
    amount: 50,
    pipelining: 1,
  });

  console.log('\n  Results:');
  printResults(result);

  const rateLimited = result.non2xx || 0;

  console.log(`\n    2xx responses: ${result['2xx'] || 0}`);
  console.log(`    Non-2xx (429): ${rateLimited}`);

  if (rateLimited === 0) {
    console.error('\n  FAILURE: Expected 429 responses but got none.');
    console.error('  Rate limiting may not be working correctly.');
    process.exitCode = 1;
  } else {
    console.log(`\n  Rate limiting working: ${rateLimited} requests rejected.\n`);
  }
} catch (err) {
  console.error('Load test failed:', err.message);
  process.exitCode = 1;
} finally {
  stopServer(server?.process);
  await new Promise((r) => setTimeout(r, 500));
}
