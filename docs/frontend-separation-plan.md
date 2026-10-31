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

### Phase C — Android Frontend

- Build a dedicated Android-oriented frontend surface
- Prioritise the following flows:
  - run scan
  - browse filtered results
  - select assets for simulator
  - inspect portfolio summary and positions
  - review alerts and edit key thresholds
- Use:
  - cards instead of dense tables
  - progressive disclosure
  - larger tap targets
  - persistent bottom actions where useful
  - low-friction resume after reload/offline transitions

### Phase D — Packaging and Installation

- Validate whether the Android frontend works well enough as an installable PWA
- If needed, create an Android Studio wrapper/project around the Android frontend
- Keep packaging concerns separate from core frontend/domain logic

## Repository Direction

One practical target structure could be:

```text
src/
  shared/
    api/
    services/
    storage/
    formatting/
    types/
  desktop/
    ui/
    screens/
  android/
    ui/
    screens/
```

This does not need to be implemented in one big bang. The important part is the direction:
shared services below, platform-specific rendering above.

## Testing Strategy

### Shared logic

- Unit tests for extracted shared modules
- Integration tests for service/storage flows

### Desktop

- Regression E2E coverage focused on dense workflows
- Assertions that desktop layout density and feature access remain intact

### Android

- Viewport/task-flow E2E coverage at 360px to 430px widths
- Touch interaction checks
- Offline/resume/installability checks

## Definition of Done for the Split

- Shared backend remains unchanged as the single source of truth
- Shared frontend service layer is reusable by both frontends
- Desktop UX quality is preserved
- Android UX is intentionally designed, not just responsively squeezed
- Core flows work on both surfaces
- Platform-specific tests exist and pass

## Progress

### Phase A — Boundary Extraction (🟡 in progress)

Shared modules live in `src/shared/frontend/` (pure or dependency-injected, no DOM), each with
unit tests in `src/tests/unit/shared/`. The scanner and portfolio dashboard consume them
instead of holding reusable logic inline:

| Module | Responsibility |
| --- | --- |
| `simulator-selection.ts` | Simulator selection persistence (localStorage), normalisation, max-4 clamp |
| `offline-review-cache.ts` | Best-effort IndexedDB save of last scan/simulation for offline review |
| `simulator-service.ts` | Horizon/total/validity rules, display ticker → Yahoo symbol, request shaping, `POST /api/v1/simulate` |
| `results-filter.ts` | Search/signal/min-score/high-volume filtering + sort by active view score |
| `market-data-client.ts` | Yahoo proxy URL building, chart payload parsing, cached price history fetch |
| `formatting.ts` | Percent, number, capital, currency and return formatting |
| `alert-settings.ts` | Typed settings contract, defaults, drawdown normalisation, input shaping and injectable IndexedDB persistence |
| `portfolio-builder.ts` | Portfolio request validation, regime score adjustment, allocation, governance corrections, price enrichment, risk (with degraded-mode exclusions) and governance reports |

Alert settings extraction (2026-10-31): the dashboard reads/writes settings through the shared
service; `alert-manager.ts` re-exports the original functions for compatibility and consumes the
same defaults. Storage keys and records remain unchanged. Rendering, status messages and DOM
input reading remain in the dashboard; notification delivery remains in the alert manager.
Coverage includes user/strategy isolation, partial legacy records, blank threshold fallback,
disabled notifications, storage failures and a desktop E2E save/reopen flow.

Portfolio builder extraction (2026-10-31): `buildPortfolio` in `scanner.ts` now only reads its
inputs, maps validation issues to messages, logs governance violations/corrections returned by
the builder, and renders. The resulting `appState.portfolio` shape is unchanged.

Remaining Phase A candidates: scan orchestration (`runScan`/`scanSingleMarket` loop vs. status rendering), and
offline restore flows (`restoreLastScanFromCache`/`restoreLastSimulationFromCache`).

## Near-Term Next Actions

1. Extract shared scan orchestration and offline restore flows (results filtering, simulator requests, alert settings and portfolio building extracted)
2. Stop adding new inline-coupled UI logic to the existing monolithic page where avoidable
3. Define the Android flow map screen by screen
4. Decide whether the first Android deliverable is:
   - PWA-only
   - Android Studio wrapper over the mobile frontend
5. Implement the split incrementally, starting with results and simulator
