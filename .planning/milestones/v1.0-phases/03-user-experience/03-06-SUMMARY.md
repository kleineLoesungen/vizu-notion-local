---
phase: 03-user-experience
plan: "06"
subsystem: ui
tags: [nuxt, vue3, usefetch, navigation, dropdown]

# Dependency graph
requires:
  - phase: 03-04
    provides: viz page ([sourceId].vue) with header, nav links, and all Phase 3 components assembled
provides:
  - Source selector dropdown in viz page header fetching all sources from /api/sources
  - Single-action source switching from any viz page without returning to dashboard
affects: [03-user-experience, 04-deployment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useFetch auto-import used in page component for lightweight secondary data fetch"
    - "navigateTo auto-import for programmatic navigation with query params"
    - "bg-transparent border-none on select element to style as heading while remaining interactive"

key-files:
  created: []
  modified:
    - pages/visualizations/[sourceId].vue

key-decisions:
  - "Source selector styled bg-transparent border-none to read visually as a heading while remaining a real <select> element — no custom dropdown component needed"
  - "handleSourceChange preserves activeVizType via ?vizType= query param so user stays on their current viz type after switching source"
  - "Fallback <h1> shown while allSources is still loading — avoids layout shift from empty select"

patterns-established:
  - "Secondary useFetch in page component: fetch lightweight source list independently of main data fetch"

requirements-completed: [UI-01, UI-03]

# Metrics
duration: 2min
completed: 2026-06-03
---

# Phase 3 Plan 06: Source Selector Summary

**Source selector `<select>` dropdown in viz page header, fetching all sources from `/api/sources`, allowing single-action source switching with active source pre-selected**

## Performance

- **Duration:** 2 min
- **Started:** 2026-06-03T15:40:46Z
- **Completed:** 2026-06-03T15:41:43Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `useFetch('/api/sources')` call to viz page for full source list
- Replaced static `<h1>` heading with interactive `<select>` dropdown styled as a heading
- Currently viewed source is pre-selected via `:value="sourceId"`
- Selecting a different source navigates to `/visualizations/{id}?vizType={current}` preserving viz type
- Fallback `<h1>` shown while sources list is still loading (avoids layout issues on slow fetch)
- Back to sources link preserved as secondary navigation

## Task Commits

Each task was committed atomically:

1. **Task 1: Add source selector to viz page header** - `5396f5a` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `pages/visualizations/[sourceId].vue` - Added source selector dropdown with useFetch, allSources computed, handleSourceChange; replaced static h1 with interactive select element

## Decisions Made
- Source selector styled with `bg-transparent border-none outline-none` so it reads visually as the page heading but functions as a real native `<select>` element — no custom dropdown component needed, works on all browsers
- `handleSourceChange` passes `?vizType=${activeVizType.value}` so user stays on their current viz type (metro/flow) after switching source
- Fallback `<h1>` element (not empty select) shown while `allSources.length === 0` — cleaner UX than an empty or partially-loaded dropdown

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Source selector closes Gap 2 (source switching from viz page) and the source-selector portion of Gap 4
- Phase 03 gap-closure plans complete — ready for Phase 4 deployment work
- All viz page UX improvements from Phase 3 are integrated

## Self-Check: PASSED

All claimed files exist and all task commits verified.

---
*Phase: 03-user-experience*
*Completed: 2026-06-03*
