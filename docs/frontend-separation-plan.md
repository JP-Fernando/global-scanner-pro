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

## Near-Term Next Actions

1. Extract shared scan/simulator/portfolio/alerts orchestration from the current frontend
2. Stop adding new inline-coupled UI logic to the existing monolithic page where avoidable
3. Define the Android flow map screen by screen
4. Decide whether the first Android deliverable is:
   - PWA-only
   - Android Studio wrapper over the mobile frontend
5. Implement the split incrementally, starting with results and simulator
