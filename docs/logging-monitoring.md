# Logging and Monitoring Guide

**Global Quant Scanner Pro - Observability Infrastructure**

**Status**: ✅ COMPLETED
**Last Updated**: January 2026
**Version**: 0.0.6

---

## 📋 Overview

This document details the comprehensive logging and monitoring infrastructure for Global Quant Scanner Pro, including structured logging with Winston, centralized error handling, and Sentry integration for production error tracking.

---

## 📊 1. Structured Logging (Winston)

### Implementation File

[src/utils/logger.js](../src/utils/logger.js)

### Log Levels

Winston provides seven log levels (RFC5424 syslog severity):

- `error`: Errors and exceptions
- `warn`: Warnings and potential issues
- `info`: Informational messages
- `http`: HTTP request logs
- `verbose`: Verbose debugging
- `debug`: Debug messages
- `silly`: Very detailed logs

### Transports

The logging system uses multiple transports to route logs to different destinations:

1. **Console**: Pretty-printed in development, JSON in production
2. **File - Combined**: All logs (`logs/combined.log`)
3. **File - Error**: Errors only (`logs/error.log`)
4. **File - HTTP**: HTTP requests (`logs/http.log`)
5. **File - Exceptions**: Uncaught exceptions (`logs/exceptions.log`)
6. **File - Rejections**: Unhandled rejections (`logs/rejections.log`)

### Features

- ✅ Automatic log rotation (5MB per file, 7 days retention)
- ✅ Sensitive data sanitization (passwords, tokens, API keys)
- ✅ Request context tracking (request ID, IP, user agent)
- ✅ Structured metadata for easy parsing
- ✅ Color-coded console output (development)
- ✅ JSON output (production)

### Usage Examples

```javascript
import { log, logWithRequest, logPerformance, logSecurityEvent } from './src/utils/logger.js';

// Simple logging
log.info('Server started', { port: 3000 });
log.error('Database connection failed', { error: err.message });

// Request-aware logging
logWithRequest(req, 'info', 'User authenticated', { userId: user.id });

// Performance logging
logPerformance('Portfolio optimization', duration, { assets: portfolio.length });

// Security event logging
logSecurityEvent('Failed login attempt', { username, ip: req.ip });
```

### Log Format

**Development** (pretty-printed):
```
2026-01-18 12:34:56 [INFO] Server started port=3000
```

**Production** (JSON):
```json
{
  "timestamp": "2026-01-18T12:34:56.789Z",
  "level": "info",
  "message": "Server started",
  "port": 3000,
  "service": "global-scanner-pro"
}
```

---

## 🚨 2. Centralized Error Handling

### Implementation File

[src/middleware/error-handler.js](../src/middleware/error-handler.js)

### Custom Error Classes

The system provides specialized error classes for different scenarios:

- `AppError`: Base class for application errors
- `ValidationError` (400): Invalid input
- `AuthenticationError` (401): Authentication required
- `AuthorizationError` (403): Insufficient permissions
- `NotFoundError` (404): Resource not found
- `ConflictError` (409): Resource conflict
- `RateLimitError` (429): Too many requests
- `ExternalServiceError` (502): External API failure
- `DatabaseError` (500): Database operation failed

### Features

- ✅ Consistent error response format
- ✅ Stack traces in development, hidden in production
- ✅ Error logging with context
- ✅ Operational vs programming error distinction
- ✅ Request ID tracking
- ✅ Global unhandled rejection handler
- ✅ Global uncaught exception handler
- ✅ Graceful shutdown on critical errors

### Error Response Format

```json
{
  "error": "Validation failed",
  "statusCode": 400,
  "timestamp": "2026-01-18T12:34:56.789Z",
  "requestId": "1737204896789-abc123",
  "details": [
    {
      "field": "symbol",
      "message": "Symbol contains invalid characters",
      "code": "invalid_string"
    }
  ]
}
```

### Usage Examples

```javascript
import { asyncHandler, NotFoundError } from './src/middleware/error-handler.js';

app.get('/api/resource/:id', asyncHandler(async (req, res) => {
  const resource = await findResource(req.params.id);

  if (!resource) {
    throw new NotFoundError('Resource');
  }

  res.json(resource);
}));
```

### Global Error Handlers

The system includes handlers for uncaught errors:

```javascript
// Unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection', { reason, promise });
  // Application continues running
});

// Uncaught exceptions
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception', { error });
  // Graceful shutdown
  process.exit(1);
});
```

---

## 🔍 3. Sentry Error Tracking

### Implementation File

[src/utils/sentry.js](../src/utils/sentry.js)

### Features

- ✅ Automatic error capture and reporting
- ✅ Performance monitoring (configurable sample rate)
- ✅ Release tracking (version tagging)
- ✅ User context tracking
- ✅ Breadcrumbs for debugging
- ✅ Before-send filtering (4xx errors excluded)
- ✅ Sensitive data sanitization
- ✅ Integration with Express error handler

### Configuration

Environment variables:

```env
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### Usage Examples

```javascript
import { captureException, setUser, addBreadcrumb } from './src/utils/sentry.js';

// Manual exception capture
try {
  riskyOperation();
} catch (error) {
  captureException(error, { context: 'Portfolio optimization' });
}

// Set user context
setUser({ id: user.id, email: user.email });

// Add breadcrumb
addBreadcrumb({
  category: 'portfolio',
  message: 'Portfolio rebalanced',
  level: 'info'
});
```

### Sentry Dashboard

The Sentry dashboard provides:

- Error tracking with stack traces
- Performance metrics and trends
- Release health monitoring
- User impact analysis
- Custom alerts and notifications

---

## 📈 Operational Improvements

### Before vs. After

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Logging | console.log (205 occurrences) | Winston structured | Better |
| Log Persistence | None | File + rotation | +100% |
| Error Tracking | Manual | Sentry automated | +100% |
| Request Tracing | None | Request ID tracking | +100% |
| Error Context | Minimal | Full context + breadcrumbs | Better |

---

## 🗂️ Log Files

All logs are stored in the `logs/` directory:

```
logs/
├── combined.log        # All logs
├── error.log          # Errors only
├── http.log           # HTTP requests
├── exceptions.log     # Uncaught exceptions
└── rejections.log     # Unhandled rejections
```

### Log Rotation

- **Max Size**: 5MB per file
- **Max Files**: 7 (one week of logs)
- **Compression**: gzip for archived logs

---

## 🧪 Testing

All logging and error handling implementations are covered by tests in [src/tests/phase1-tests.js](../src/tests/phase1-tests.js):

- Error handling tests
- Custom error classes
- Status code validation
- Error message formatting

**Run Tests**:

```bash
npm test
```

---

## 🚀 Production Deployment

### Log Aggregation

For production deployments, consider setting up log aggregation:

**Options**:
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Grafana Loki
- Cloud-based: AWS CloudWatch, Google Cloud Logging, Azure Monitor

**Configuration**:

1. Configure log shipping (Fluentd, Logstash, or vector)
2. Create log parsing rules
3. Set up log retention policies
4. Configure log search and filtering

### Alerting

Configure alerts for critical events:

- Error rate spikes
- Critical errors (5xx responses)
- Security events (authentication failures)
- Performance degradation

---

## 📞 Support

For questions about logging and monitoring:

- GitHub Issues: https://github.com/JP-Fernando/global-scanner-pro/issues
- Documentation: [docs/](../docs/)

---

**Document Version**: 1.0
**Last Updated**: January 18, 2026
