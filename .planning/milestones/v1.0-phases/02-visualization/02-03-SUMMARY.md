---
phase: 02-visualization
plan: "03"
subsystem: ui
tags: [vue-flow, composables, visualization, eligibility-detection]

# Dependency graph
requires:
  - phase: 02-01
    provides: "@vue-flow/core installed, TailwindCSS v4 configured"
  - phase: 01-03
    provides: "EnrichedPage type, /api/sources/:id endpoint"
provides:
  - "useFlowData(pages, columnMappings) composable — transforms EnrichedPage[] to Vue Flow nodes/edges"
  - "useSourceData(sourceId) composable — fetches API data with VIZ-03 eligibility helpers"
  - "isMetroEligible/isFlowEligible pure functions for viz-type gating"
  - "FlowDiagram.vue — Vue Flow wrapper component rendering process flow graphs"
affects: [02-04, phase-3-ux]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure function composables (useFlowData is stateless, no Vue reactivity dependency)"
    - "Computed-over-composable pattern in FlowDiagram.vue — props feed into computed(() => useFlowData(...))"
    - "Named eligibility exports (isMetroEligible, isFlowEligible) separate from Nuxt composable (useSourceData)"

key-files:
  created:
    - composables/useFlowData.ts
    - composables/useSourceData.ts
    - components/FlowDiagram.vue
  modified: []

key-decisions:
  - "useFlowData is a pure function (no reactivity) — callers wrap in computed() for reactivity"
  - "Left-to-right node layout: x = idx * 250, y = 100 for all nodes (simple horizontal row per RESEARCH.md)"
  - "Orphaned edge targets silently skipped via pageIds.has() guard (consistent with Phase 1 Promise.allSettled pattern)"
  - "isMetroEligible and isFlowEligible exported as named pure functions alongside useSourceData composable"

patterns-established:
  - "Eligibility detection: named pure functions exported separately, also exposed as computed refs inside useSourceData"
  - "Flow layout: flat horizontal row as starting point — future plans may introduce tree/DAG layout"

requirements-completed: [VIZ-02, VIZ-03]

# Metrics
duration: recovered
completed: 2026-06-03
---

# Phase 02 Plan 03: Process Flow Visualization Summary

**Vue Flow process flow composables and component: useFlowData transforms EnrichedPage[] to nodes/edges, FlowDiagram.vue renders @vue-flow/core, useSourceData exposes VIZ-03 role-based viz-type eligibility detection**

## Performance

- **Duration:** recovered (socket error interrupted tracking)
- **Started:** 2026-06-03
- **Completed:** 2026-06-03
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `useFlowData` composable transforms EnrichedPage[] into Vue Flow nodes (x = idx*250, y = 100) and edges (from `next` role relations), with orphaned-target protection
- `useSourceData` composable wraps `useFetch('/api/sources/:id')` and exposes column mappings, available roles, pages, loading state, and computed eligibility flags
- `isMetroEligible` (requires `date` AND `next`) and `isFlowEligible` (requires `next`) implement VIZ-03 detection rules D-04 and D-05
- `FlowDiagram.vue` wraps `@vue-flow/core` with reactive `nodes`/`edges` from props, correct node styling per UI-SPEC, and empty-state fallback

## Task Commits

Each task was committed atomically:

1. **Task 1: useFlowData + useSourceData composables** - `c4845e2` (feat)
2. **Task 2: FlowDiagram.vue Vue Flow wrapper component** - `4958313` (feat)

**Plan metadata:** (this commit — docs: complete flow diagram plan)

## Files Created/Modified

- `composables/useFlowData.ts` — Pure function: EnrichedPage[] + ColumnMappings → { nodes: FlowNode[], edges: FlowEdge[] }
- `composables/useSourceData.ts` — Nuxt composable: wraps /api/sources/:id, exposes eligibility helpers (isMetroEligible, isFlowEligible)
- `components/FlowDiagram.vue` — Vue Flow wrapper: accepts `data` + `columnMappings` props, renders process flow graph with styled nodes

## Decisions Made

- **useFlowData as pure function**: No Vue reactivity inside the function body — keeps it testable and context-free. Callers (FlowDiagram.vue) wrap with `computed()`.
- **Flat horizontal layout**: x = idx * 250, y = 100. Simple left-to-right row per RESEARCH.md open question 3 — sufficient for v1, extensible later.
- **Orphan guard**: `pageIds.has(targetId)` before pushing edges — consistent with Phase 1's `Promise.allSettled` silent-drop pattern for deleted/external pages.
- **Dual export pattern**: `isMetroEligible`/`isFlowEligible` exported as standalone named functions AND exposed as `computed` refs inside `useSourceData` — enables both reactive template use and standalone unit testing.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Session ended with a socket error after both implementation commits completed successfully. SUMMARY.md and metadata commit were the only missing artifacts.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- VIZ-02 (process flow) and VIZ-03 (eligibility detection) are complete
- `useSourceData` is ready for use in `visualizations/[sourceId].vue` (02-04)
- `FlowDiagram.vue` is ready for integration in the visualization page
- `isMetroEligible`/`isFlowEligible` can gate which viz tabs are shown per source

---
*Phase: 02-visualization*
*Completed: 2026-06-03*
