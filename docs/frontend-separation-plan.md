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

### Phase C — Android Frontend (✅ web implemented and emulator-validated; physical checks listed)

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
C3 adds dedicated Android portfolio construction/save/reopen, position detail and strategy-specific
alert settings/history; these destinations no longer redirect to desktop management. C4 adds
resume/accessibility hardening and an independent Android manifest. Keyboard, installation,
rotation, text size, lifecycle, offline and update behaviour were validated on Android 15
emulated with Chrome 149 (Phase D); a few physical-device/HTTPS checks remain.

C2 validation (2026-10-31): **1336 unit/integration tests in 76 files**, **95 Chromium E2E
tests in 14 specs** (87 desktop + 8 Android), plus **1 production-subpath/offline build test**.
Production build and TypeScript pass; changed-file ESLint has no errors. Coverage:
**94.86 / 82.37 / 96.10 / 96.20%** overall and **94.71 / 89.88 / 91.74 / 95.89%** shared frontend
(statements / branches / functions / lines). Browser screenshots were inspected for the
results and simulator views. These are browser/emulated-touch checks, not physical-device tests.

### C3 — Portfolios and alerts (implemented 2026-11-01)

`portfolio-screen.ts` and `alerts-screen.ts` own Android presentation and interactions. The
portfolio builder uses the full last completed scan and its strategy/benchmark/regime context,
independently of result filters or the next scan's inputs. Method, count, capital and risk
profile are editable; an inline name form saves through the shared portfolio manager.
Canonical symbols, weights, capital and construction corrections/risk exclusions survive saving.
Creation commits the definition and initial snapshot atomically; settings save also waits for
the IndexedDB transaction to finish before confirming persistence.
Shared allocation now qualifies colliding display tickers before enrichment to avoid mixing
prices/history from different markets.

`portfolio-review.ts` reads saved snapshots and optional quote-review metadata without fetching
prices. It delegates P&L and historical metrics to the shared tracker. A new portfolio has
insufficient history for ratios. Explicit online refresh bypasses quote caches and persists
review prices; partial quotes identify missing symbols and keep their previous valuation.
Refreshing never creates historical snapshots; a position/snapshot change invalidates the
stored quote review. Saved portfolios and position deep links work
without a new scan, including offline when the shell is cached.

Alert editing uses the shared defaults, update shaping, drawdown normalization and persistence,
with a separate strategy selector, channel/event controls and local history. Saving settings
sends no notifications. Android builder/alert drafts, selected portfolio and return scroll use
`gsp.android.operations.v1`, independently of desktop presentation keys. Errors preserve drafts
for retry; confirmation follows the awaited persistence operation. The existing IndexedDB
stores remain shared on the same origin; this increment adds no account or tab synchronization.

C3 validation is recorded in [Android Frontend Flows](android-frontend-flows.md#implementación-y-validación-de-c3).
C4 web hardening is implemented below and was validated on an Android emulator in Phase D.
The desktop manifest keeps its entry; Android uses its own manifest.

### C4 — Web hardening (implemented and emulator-validated 2026-11-01)

`navigation.ts` restores Android presentation context under `gsp.android.navigation.v1`:
last route, per-screen scroll, disclosures and focus/selection. Explicit deep links win over the
saved route. Async local reads defer scroll restoration until the screen is ready. Connection
changes update controls without remounting the editor. Resume does not run scans, simulations,
quote refreshes or notification delivery. Interrupted/failed work retains the previous review
and offers an explicit retry; a scan that lost connection cannot overwrite the complete review.

Android has a skip link, focus restoration, visual-viewport keyboard handling, safe-area spacing,
readable input sizing, system text-size opt-in (`<meta name="text-scale">`) and reduced-motion support. The C4 task flow audits every screen at
360/390/430 px using axe WCAG 2 A/AA and 2.1 AA with no disabled rules. IndexedDB blocked upgrades
reject rather than hanging startup, and version changes release existing connections.

`android.webmanifest` gives Android its own identity/start URL; the desktop manifest is preserved.
Build injection, Docker and precaching include both, including deployment prefixes. Installation
prompt ownership is independent of desktop bootstrap. Build-specific caches keep HTML paired
with its asset graph. Updates wait for explicit activation from Android, preserve drafts and
reload afterwards; quota errors in runtime caching do not discard online responses. Cache
cleanup is restricted to the deployment prefix.

See [Android Validation](android-validation.md) for evidence and reproducible commands.

### Phase D — Android packaging decision (✅ decided 2026-11-01: PWA)

No physical device was available, so the PWA was validated on an Android 15 emulator
(Pixel 7a, Google Play image) running **Chrome 149**, against the production build, with real
market data. Native install dialog, standalone launch, Gboard keyboard, rotation, system text
size up to 200%, background kill and relaunch, offline cold start, reconnection without implicit
requests and explicit updates all pass. One defect found there was fixed: Chrome ignored the
system text size until `android.html` opted in with `<meta name="text-scale" content="scale">`.

**Decision: the installable PWA is the Android delivery channel; no Android Studio/Capacitor
project is added.** No current flow needs a native capability (no push, background sync or
system integration), and a wrapper would duplicate the shell, signing and release cycle.
The decision is reopened only by a concrete need: Google Play distribution (a Bubblewrap
Trusted Web Activity over the same PWA, which needs an own HTTPS domain serving
`/.well-known/assetlinks.json`) or a native capability (Capacitor for that capability only).

Known limitation: Chrome writes `localStorage` to disk with a delay, so an edit made less than
about a second before the process dies can be lost (0.5 s lost, 3 s kept). Wrappers share this
behaviour; mirroring drafts in IndexedDB is the mitigation if needed.

Still open, outside emulator reach: WebAPK minting on the HTTPS deployment, TalkBack speech,
real low-memory kills and a second browser/OEM. These are follow-up checks, not blockers for
the packaging decision.

## Near-Term Next Actions

1. Run the remaining physical/HTTPS checks in [Android Validation](android-validation.md) on the
   GitHub Pages + Render deployment (WebAPK, TalkBack speech, low-memory kill, second browser)
2. Decide whether the `localStorage` write delay justifies mirroring Android drafts in IndexedDB
3. Stop adding new inline-coupled UI logic to the existing monolithic page where avoidable
4. Keep the Phase B desktop regression and shared coverage gates passing alongside Android task-flow E2E
5. Revisit packaging only if Google Play distribution or a native capability becomes a requirement
