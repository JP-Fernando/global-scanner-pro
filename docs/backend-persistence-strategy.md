# Backend Persistence Strategy

## Purpose

This document defines the backend persistence strategy for authenticated user data:

- portfolios
- alert settings and alert history
- user preferences

It resolves the current split where authentication already uses backend SQLite while product data
still lives only in browser IndexedDB.

## Decision

Use a **hybrid local-cache + server-source-of-truth model** for the `account-based` product path:

- `SQLite` is the backend system of record for authenticated users in the near term
- `IndexedDB` remains the on-device cache and offline working store for the PWA
- sync between browser and backend is explicit and authenticated, not implicit

This keeps the current PWA-friendly UX while giving us a real ownership model, cross-device
continuity, backups, and server-side auditability.

## Why This Strategy

### What we already have

- Backend auth is already implemented with JWT + SQLite
- Frontend portfolios and alerts already persist locally in IndexedDB
- The app already behaves like a local-first web app

### What is missing

- per-user ownership of portfolios and alerts
- cross-device persistence
- a backend place to store preferences cleanly
- a migration path from local-only data to account-based data

### Why not backend-only immediately

Going backend-only would regress offline behavior and force a large frontend rewrite before we ship
the PWA milestone.

### Why not keep IndexedDB as the only store

That blocks multi-device sync, recovery after device loss, admin/audit workflows, and any credible
account-based product release.

## Data Ownership Rules

- Anonymous/local-first users keep using IndexedDB only
- Authenticated users get a backend record keyed by `user_id`
- Server records are the source of truth after a successful sync
- IndexedDB remains the client cache for fast reads, temporary offline edits, and optimistic UI

## Backend Schema Direction

The backend schema should cover these aggregates:

1. `user_preferences`
2. `portfolios`
3. `portfolio_positions`
4. `portfolio_snapshots`
5. `portfolio_rebalances`
6. `alert_settings`
7. `alert_events`
8. `alert_deliveries`

Design choices:

- Use relational tables for ownership, lookups, filtering, and cascades
- Store highly nested payloads as JSON strings where full normalization adds little value
- Keep `user_id` as the tenancy boundary on user-owned records
- Use append-only history tables for snapshots, rebalances, and alert deliveries

## Aggregate Boundaries

### Preferences

Persist small, user-scoped settings on the backend:

- locale
- timezone
- theme
- scanner defaults
- dashboard layout
- alert defaults

Preferences should be updated independently of portfolios so a settings save does not rewrite large
portfolio payloads.

### Portfolios

Persist portfolio headers separately from current positions:

- portfolio metadata in `portfolios`
- current holdings in `portfolio_positions`
- historical state in `portfolio_snapshots`
- rebalance audit trail in `portfolio_rebalances`

This lets us query portfolio lists efficiently without pulling full history every time.

### Alerts

Split alert configuration from alert history:

- current per-strategy config in `alert_settings`
- emitted alerts in `alert_events`
- per-channel delivery attempts in `alert_deliveries`

This matches the current alert manager behavior and gives us room for retries, delivery analytics,
and push notifications later.

## API Direction

When we wire the backend APIs, use authenticated `/api/v1` routes such as:

- `GET /api/v1/preferences`
- `PUT /api/v1/preferences`
- `GET /api/v1/portfolios`
- `POST /api/v1/portfolios`
- `GET /api/v1/portfolios/:id`
- `PUT /api/v1/portfolios/:id`
- `DELETE /api/v1/portfolios/:id`
- `GET /api/v1/portfolios/:id/snapshots`
- `GET /api/v1/portfolios/:id/rebalances`
- `GET /api/v1/alerts/settings`
- `PUT /api/v1/alerts/settings/:strategy`
- `GET /api/v1/alerts`

All of these should require `requireAuth()` and derive `user_id` from the token, never from the
request body.

## Sync Model

For authenticated users:

1. Load server state after login
2. Hydrate IndexedDB cache locally
3. Serve UI reads from local cache
4. Queue local mutations for sync when online
5. Confirm writes against the server and update local version markers

Conflict policy for the first implementation:

- use `updated_at` + `version`
- prefer a simple last-write-wins rule at the aggregate level
- keep enough history in snapshots/rebalances/alerts to investigate disputes

If conflict volume becomes meaningful later, we can move selected entities to finer-grained merge
rules.

## Migration Plan

### Phase A: schema foundation

- add backend tables and indexes
- keep current UI behavior unchanged

### Phase B: repository layer

- add backend repositories/services for preferences, portfolios, and alerts
- keep IndexedDB API stable behind an adapter boundary

### Phase C: authenticated sync

- on login, offer import of local IndexedDB data into the user account
- for new authenticated writes, persist server-side and refresh local cache

### Phase D: offline hardening

- add mutation queueing
- add retry and reconciliation states in the UI

## Non-Goals For This Step

- full sync engine implementation
- frontend auth screens
- replacing IndexedDB immediately
- multi-tenant org/workspace support
- PostgreSQL migration

## Future Evolution

SQLite is the right near-term backend store because it matches the current auth stack and keeps the
operational footprint low. If usage grows beyond a single-node deployment, we should keep the
repository/service boundary stable so the same aggregates can move to PostgreSQL later without
rewriting the UI contract.
