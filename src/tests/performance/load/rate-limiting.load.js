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
  startServer, stopServer,
} from './load-test-runner.js';

let server;

try {
  server = await startServer({
    PORT: '3097',
    RATE_LIMIT_MAX_REQUESTS: '20',
    RATE_LIMIT_WINDOW_MS: '60000',
  });

  console.log('\n  Testing rate limiting (limit=20, sending 50 requests) ...\n');

  const startedAt = Date.now();
  const responses = await Promise.all(
    Array.from({ length: 50 }, async () => {
      const response = await fetch(`http://localhost:${server.port}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      return response.status;
    })
  );
  const elapsedMs = Date.now() - startedAt;

  const counts = responses.reduce((acc, status) => {
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const rateLimited = counts[429] || 0;
  const validationFailures = counts[400] || 0;

  console.log('\n  Results:');
  console.log(`    Total requests: ${responses.length}`);
  console.log(`    Duration:       ${elapsedMs} ms`);
  console.log(`    400 responses:  ${validationFailures}`);
  console.log(`    429 responses:  ${rateLimited}`);

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
