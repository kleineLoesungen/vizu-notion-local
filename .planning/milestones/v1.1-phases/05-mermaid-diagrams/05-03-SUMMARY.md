---
phase: 05-mermaid-diagrams
plan: 03
subsystem: ui
tags: [mermaid, vue, composables, viz-type-selector, error-handling]

# Dependency graph
requires:
  - phase: 05-mermaid-diagrams
    plan: 02
    provides: composables/useMermaidTemplate.ts (renderDiagram, containerId, isLoading, fetchError, renderError), composables/useSourceData.ts (hasMermaidTemplates, mermaidTemplates)
  - phase: 02-metro-visualization
    provides: pages/visualizations/[sourceId].vue (viz type selector, MetrovizMap, FlowDiagram render area)
provides:
  - pages/visualizations/[sourceId].vue — Mermaid template buttons in viz type selector, Mermaid render area with error display, activeVizType extended to include 'mermaid'
affects: [admin-verification, mermaid-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: [activeVizType extended to three-way union type, mermaid not stored in share links (falls back to metro), Mermaid render area uses LoadingSpinner + ErrorAlert consistent with existing error patterns]

key-files:
  created: []
  modified:
    - pages/visualizations/[sourceId].vue

key-decisions:
  - "activeVizType extended to 'metro' | 'flow' | 'mermaid' — Mermaid is user-initiated only (click on template button), no auto-selection"
  - "Mermaid vizType excluded from share links — falls back to 'metro' since templateId is not stored in ViewState; user re-selects on arrival"
  - "Not eligible condition updated to include !hasMermaidTemplates — sources with only Mermaid templates no longer show red error banner"
  - "MetrovizMap and FlowDiagram guarded with activeVizType !== 'mermaid' — prevents background rendering when Mermaid is active"
  - "Page-level watch on diagramString supplements composable's internal watch — ensures container div is mounted before renderDiagram() is called"

patterns-established:
  - "Viz type buttons use v-if on eligibility per type — each button independently gated, no multi-condition toggle blocks"
  - "Mermaid render area mirrors MetrovizMap/FlowDiagram pattern: LoadingSpinner → fetchError → renderError → content"

requirements-completed: [MERM-01, MERM-03, MERM-05]

# Metrics
duration: 15min
completed: 2026-06-08
---

# Phase 05 Plan 03: Mermaid UI Integration Summary

**[sourceId].vue extended with Mermaid template buttons in viz type selector and Mermaid render area using useMermaidTemplate composable with LoadingSpinner/ErrorAlert error states**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-08T19:41:00Z
- **Completed:** 2026-06-08T19:55:00Z
- **Tasks:** 1 (Task 2 is checkpoint — paused for human verification)
- **Files modified:** 1

## Accomplishments

- Extended `pages/visualizations/[sourceId].vue` with Mermaid as a third visualization type
- Viz type selector now renders one button per Mermaid template referencing the current source (from `mermaidTemplates` composable ref)
- Mermaid render area shows LoadingSpinner during fetch, ErrorAlert on fetchError, ErrorAlert on renderError, or rendered Mermaid SVG
- MetrovizMap and FlowDiagram guarded from rendering when `activeVizType === 'mermaid'`
- "Not eligible" error banner now suppressed when source has Mermaid templates
- `activeVizType` type extended to `'metro' | 'flow' | 'mermaid'`
- One TypeScript deviation caught and fixed: `ViewState.vizType` typed as `'metro' | 'flow'` — share link falls back to `'metro'` when Mermaid is active

## Task Commits

Each task was committed atomically:

1. **Task 1: Integrate Mermaid into [sourceId].vue viz type selector and render area** - `a97c71c` (feat)

## Files Created/Modified

- `pages/visualizations/[sourceId].vue` — Mermaid template buttons in viz type selector, Mermaid render area with three error states, activeVizType extended to include 'mermaid', MetrovizMap/FlowDiagram conditions updated

## Decisions Made

- `activeVizType` extended to `'metro' | 'flow' | 'mermaid'` — Mermaid is always user-initiated (click on template button), no auto-selection on page load.
- Mermaid vizType excluded from share links — `ViewState.vizType` is typed as `'metro' | 'flow'` in state-encoding.ts; when `activeVizType === 'mermaid'`, the share link falls back to `'metro'`. User re-selects the Mermaid template after arriving via shared link. This is acceptable since templateId is not stored in ViewState.
- "Not eligible" banner updated with `!hasMermaidTemplates` — sources that only have Mermaid templates (no metro/flow roles) no longer show the red error banner.
- Page-level `watch(mermaidDiagram.diagramString)` supplements the composable's internal watch — ensures the container div is mounted in the DOM before `renderDiagram()` is called.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript type mismatch in handleCopyLink**
- **Found during:** Task 1 (TypeScript check)
- **Issue:** `ViewState.vizType` is typed `'metro' | 'flow'` but `activeVizType` now includes `'mermaid'`, causing TS2322
- **Fix:** Added `shareVizType` local variable: `const shareVizType = activeVizType.value === 'mermaid' ? 'metro' : activeVizType.value` and used it for the ViewState assignment
- **Files modified:** `pages/visualizations/[sourceId].vue`
- **Verification:** `npx nuxi typecheck` — zero errors in [sourceId].vue
- **Committed in:** a97c71c (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 type bug)
**Impact on plan:** Fix required for TypeScript correctness. Semantics correct: Mermaid viz state is not shareable (no templateId in ViewState); falling back to metro on share is intentional.

## Issues Encountered

None — plan executed as expected aside from the TypeScript type fix above.

## Known Stubs

None — Mermaid render area is fully wired to the useMermaidTemplate composable. All data flows from real API endpoints to the render container.

## Self-Check: PASSED

Files verified:
- `pages/visualizations/[sourceId].vue` — FOUND and modified
Commits verified:
- `a97c71c` — FOUND (Task 1: feat(05-03))
TypeScript: Zero errors in pages/visualizations/[sourceId].vue

## User Setup Required

None — admin creates `.mmd` files in `config/`, restarts container, and sees template buttons automatically.

## Next Phase Readiness

- Full Phase 5 Mermaid feature is implemented end-to-end (Plans 01-03)
- Human verification checkpoint required before marking Phase 5 complete
- No blockers; all TypeScript errors are pre-existing in unrelated files

---
*Phase: 05-mermaid-diagrams*
*Completed: 2026-06-08*
