# Frontend Separation Plan

## Objective

Preserve the current desktop analytical experience while creating an Android-focused frontend on
top of a shared backend and shared application/domain logic.

This plan intentionally avoids maintaining two fully separate products. The separation should
happen mainly in the presentation layer.

## Product Direction

- Desktop remains the primary dense-analysis surface
- Android becomes a touch-first operational surface
- Backend, API contracts, domain calculations, persistence contracts, and validation should stay shared

## Principles

1. Share logic, not necessarily layout
2. Preserve desktop quality; do not simplify desktop to satisfy mobile
3. Build Android around task completion, not around reproducing every desktop table
4. Keep feature parity at the domain level where practical
5. Add test coverage per platform so one UI does not regress the other

## Recommended Scope Split

### Shared across both frontends

- API clients and request shaping
- Result normalization and formatting helpers
- Portfolio and simulator orchestration logic
- Alert settings persistence and retrieval
- IndexedDB persistence contracts
- Types, schemas, and validation helpers
- Internationalisation dictionaries and translation keys

### Desktop-specific

- Dense results table
- Comparison-heavy portfolio/dashboard layout
- Wide chart + table combinations
- High-density controls for advanced analysis

### Android-specific

- Card/list presentation for results
- Drill-down asset detail screens
- Sticky primary actions
- Touch-friendly simulator selection/editing
- Simplified alerts editing and review flows
- Resume-friendly navigation and state restoration

## Proposed Delivery Phases

### Phase A — Boundary Extraction

- Identify code in the current frontend that mixes:
  - domain logic
  - API/service orchestration
  - DOM rendering
  - layout-specific interaction logic
- Move reusable parts into shared modules
- Introduce clear interfaces between data/services and rendering

### Phase B — Desktop Stabilisation

- Keep the current desktop experience as the reference analytical UI
- Refactor only the minimum needed to consume shared modules
- Add regression tests for:
  - scan execution
  - results review
  - portfolio construction
  - dashboard navigation
  - alerts editing
  - simulator flow

### Phase C — Android Frontend (🟡 C2 initial functional flow implemented, C3 next)

The flow map in [Android Frontend Flows](android-frontend-flows.md) now has its first working
increment: `android.html` serves **Scan → Results → Asset detail → Simulator** through
`src/android/`, with independent presentation/state and shared scan/simulator services.
Desktop offers an explicit Touch view link; Android offers a desktop return link.

C2 includes filtering, canonical-symbol selection with the four-asset limit, editable monthly
amounts and horizons, explicit calculation, scenario summary/SVG chart, error/retry,
latest-request coordination and ES/EN labels. Navigation/reload preserve Android drafts under
a separate storage key. Shared last-scan/simulation records remain compatible with desktop,
including instruments whose display tickers collide across markets.

`asset-identity.ts`, `market-options.ts` and `request-coordinator.ts` provide reusable identity,
market catalogue and request ownership. Shared simulator/restore contracts accept explicit
identity modes; portfolio eligibility is exposed through `canBuildPortfolio`.

Vite/injection and Docker include the independent entry. Shared service-worker registration
does not import desktop initialisation; navigation caching/fallback distinguishes the shells
and serves precached assets on the first offline reload. A dedicated production-build test
checks static subpath hosting and restores the normal build afterwards.

Android task-flow E2E runs at 360/390/430 px and includes same-ticker markets, cross-surface
restore/recalculation, API failure/retry, stale responses, invalid routes and blocked storage.
Carteras and Alertas currently link to their functional desktop management; native Android
portfolio/alerts screens are C3 work. Full Android installation, physical-device/keyboard
validation and remaining offline/resume hardening remain C4/D work. The PWA manifest still
starts the desktop entry; no native wrapper has been added.

C2 validation (2026-10-31): **1336 unit/integration tests in 76 files**, **95 Chromium E2E
tests in 14 specs** (87 desktop + 8 Android), plus **1 production-subpath/offline build test**.
Production build and TypeScript pass; changed-file ESLint has no errors. Coverage:
**94.86 / 82.37 / 96.10 / 96.20%** overall and **94.71 / 89.88 / 91.74 / 95.89%** shared frontend
(statements / branches / functions / lines). Browser screenshots were inspected for the
results and simulator views. These are browser/emulated-touch checks, not physical-device tests.

## Near-Term Next Actions

1. Implement C3: Android portfolio construction/save/reopen and strategy-specific alert settings
2. Stop adding new inline-coupled UI logic to the existing monolithic page where avoidable
3. Keep the Phase B desktop regression and shared coverage gates passing alongside Android task-flow E2E
4. Validate Android installation/offline behaviour before deciding in Phase D whether a native wrapper is needed
5. Complete C4 Android web offline/resume/accessibility validation before the Phase D packaging decision
