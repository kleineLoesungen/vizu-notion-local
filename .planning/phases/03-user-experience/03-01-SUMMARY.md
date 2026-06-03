---
phase: 03-user-experience
plan: 01
subsystem: ui
tags: [vue3, composables, url-state, filter, lru-cache, svg-export, nuxt, typescript]

# Dependency graph
requires:
  - phase: 02-visualization
    provides: EnrichedPage type, MetrovizMap and FlowDiagram components
  - phase: 01-backend-foundation
    provides: LRU cache in server/utils/notion.ts, getConfig() helper, Source types
provides:
  - ViewState and FilterCriteria interfaces for URL-safe state encoding
  - encodeViewState/decodeViewState round-trip URL helpers
  - useFilterState composable with filteredPages computed, toggleNode, applyFilter, removeFilter
  - useUrlState composable with pushState and copyShareLink for explicit share flow
  - useExport composable with XMLSerializer-based downloadSVG
  - POST /api/sources/:id/refresh endpoint that clears LRU cache for a source
affects:
  - 03-02 (dashboard page uses refresh endpoint)
  - 03-03 (viz page uses all 4 composables)
  - 03-04 (copy link flow uses useUrlState)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useFilterState composable encapsulates node visibility + property filter state, combined in filteredPages computed
    - encodeViewState/decodeViewState as symmetric pair in utils/ for testable URL serialization
    - clearCacheForDatabase exported from server/utils/notion.ts as a named helper rather than exposing the raw LRU cache
    - Explicit share action for URL state (copy-to-clipboard button) to avoid polluting browser history

key-files:
  created:
    - utils/state-encoding.ts
    - composables/useFilterState.ts
    - composables/useUrlState.ts
    - composables/useExport.ts
    - server/routes/api/sources/[id]/refresh.post.ts
  modified:
    - server/utils/notion.ts

key-decisions:
  - "Explicit share action (copy-to-clipboard) over continuous URL updates — avoids browser history pollution per RESEARCH.md recommendation"
  - "clearCacheForDatabase exported as named helper from notion.ts — keeps cache object private while enabling test-safe cache invalidation"
  - "filteredPages applies property filters first, then visibility toggles — order matters for UX (hidden nodes don't reappear when filters clear)"
  - "useFilterState.setHiddenNodes initializes from allIds to avoid hiding nodes that don't exist in current data"

patterns-established:
  - "Pattern: composables/use*.ts export a single named function that returns reactive state + action functions"
  - "Pattern: URL state uses JSON.stringify/parse for complex types (FilterCriteria arrays, hiddenNodes arrays)"
  - "Pattern: Server cache helpers exported as named functions — raw LRU cache stays private to server/utils/notion.ts"

requirements-completed:
  - UI-04
  - UI-06
  - UI-02

# Metrics
duration: 2min
completed: 2026-06-03
---

# Phase 3 Plan 1: State Management Infrastructure Summary

**Client-side filter/visibility state layer + URL encoding utilities + SVG export helper + POST cache-clear endpoint — 5 files providing the contracts all Phase 3 UI components build against**

## Performance

- **Duration:** 2 min
- **Started:** 2026-06-03T14:59:12Z
- **Completed:** 2026-06-03T15:00:58Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- ViewState/FilterCriteria interfaces with encodeViewState/decodeViewState URL round-trip in utils/state-encoding.ts
- useFilterState composable with reactive filteredPages (property filters + node visibility combined), toggleNode, applyFilter/removeFilter, setHiddenNodes, setActiveFilters
- useUrlState composable using Nuxt's useRoute/useRouter with explicit copy-to-clipboard share flow
- useExport composable with XMLSerializer + Blob API for self-contained SVG download
- clearCacheForDatabase helper exported from server/utils/notion.ts
- POST /api/sources/:id/refresh endpoint that validates source exists, clears LRU cache, and returns 200 with clearedAt timestamp

## Task Commits

Each task was committed atomically:

1. **Task 1: State encoding utilities and useFilterState composable** - `7592438` (feat)
2. **Task 2: useUrlState, useExport, server refresh route, and cache helper** - `ec7b611` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `utils/state-encoding.ts` - ViewState + FilterCriteria interfaces, encodeViewState/decodeViewState helpers
- `composables/useFilterState.ts` - Reactive filter/visibility state, filteredPages computed, URL restore helpers
- `composables/useUrlState.ts` - URL query param encoding/decoding with pushState + copyShareLink
- `composables/useExport.ts` - downloadSVG via XMLSerializer + Blob API, isExporting guard
- `server/routes/api/sources/[id]/refresh.post.ts` - POST endpoint for cache invalidation
- `server/utils/notion.ts` - Added clearCacheForDatabase exported function

## Decisions Made
- Explicit share action (copy-to-clipboard) over continuous URL updates — avoids browser history pollution per RESEARCH.md recommendation
- clearCacheForDatabase exported as named helper from notion.ts — keeps the raw LRU cache private
- filteredPages applies property filters first, then visibility toggles — ensures filtered-out pages don't reappear when visibility is toggled
- useFilterState.setHiddenNodes initializes from the full pages set, then removes hidden IDs — guards against URL state referencing pages not in current dataset

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 4 composables/utilities are ready for import by pages/index.vue (03-02) and pages/visualizations/[sourceId].vue (03-03)
- POST /api/sources/:id/refresh is live and ready for per-source refresh buttons
- URL state encoding is fully symmetric — downstream components pass ViewState in, get URL params out

---
*Phase: 03-user-experience*
*Completed: 2026-06-03*
