---
phase: 03-user-experience
plan: "04"
subsystem: viz-page-integration
tags: [vue3, nuxt, filter-panel, node-detail, url-state, svg-export, notion-links, visualization]

# Dependency graph
requires:
  - 03-01  # useFilterState, useUrlState, ViewState, FilterCriteria, state-encoding
  - 03-02  # Dashboard SourceCard grid (parallel plan)
  - 03-03  # FilterPanel, NodeDetailPanel, NotionLinksList, ExportButton components + node-click wiring
  - 02-02  # MetrovizMap component + useMetrovizData
  - 02-03  # FlowDiagram component + useSourceData
provides:
  - pages/visualizations/[sourceId].vue with full Phase 3 interactive feature set
  - URL state restoration on page load (vizType, filters, hiddenNodes)
  - Shareable link encoding via Copy Link button
  - Node detail panel on node click (both Metro and Flow)
  - SVG export via ExportButton wired to correct container per viz type
  - Notion links list below viz (filteredPages only)
affects:
  - User-facing visualization experience (all Phase 3 UI requirements)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - onMounted + watch(pages) pattern for deferred URL state restoration after async data load
    - metrovizMapRef.value?.containerId — optional chaining for defineExpose access from parent ref
    - Computed metrovizData from filteredPages.value (not raw pages) — ensures metro map respects filter state

key-files:
  created: []
  modified:
    - pages/visualizations/[sourceId].vue

key-decisions:
  - "filteredPages (not raw pages) passed to FlowDiagram, NotionLinksList, and metrovizData — ensures all components respect active filter + visibility state"
  - "URL state restored via onMounted + deferred watch(pages) — guards against restoring state before async pages are available"
  - "metrovizContainerId computed from ref — optional chaining handles null ref during SSR/mount cycle safely"

# Metrics
duration: ~3 min
completed: 2026-06-03
tasks_completed: 1
tasks_total: 2
files_modified: 1
---

# Phase 03 Plan 04: Viz Page Integration Summary

**One-liner:** Complete rewrite of pages/visualizations/[sourceId].vue assembling all Phase 3 components (FilterPanel, NodeDetailPanel, NotionLinksList, ExportButton) with URL state restoration, shareable link copy, and filter-aware data flow throughout.

## Performance

- **Duration:** ~3 min
- **Started:** 2026-06-03T15:08:30Z
- **Completed:** 2026-06-03
- **Tasks Executed:** 1 (Task 1 complete; Task 2 is human-verify checkpoint)
- **Files modified:** 1

## Accomplishments

- `pages/visualizations/[sourceId].vue` completely rewritten with all Phase 3 features
- `useFilterState` wired: filteredPages, visibleNodeIds, activeFilters, toggleNode, applyFilter, removeFilter, setHiddenNodes, setActiveFilters
- `useUrlState` wired: urlState read on onMounted for state restoration; copyShareLink called on Copy Link button
- `FilterPanel` placed in right column with all props and event handlers
- `NodeDetailPanel` shown when selectedPage is non-null; closes on ESC or close emit
- `ExportButton` wired with dynamic containerId (metrovizContainerId for metro, flow-viz-container for flow)
- `NotionLinksList` receives filteredPages (not raw pages) — respects filter state
- `FlowDiagram` receives filteredPages as :data; @node-click sets selectedPage
- `MetrovizMap` gets ref="metrovizMapRef" for containerId access; @node-click resolves pageId to full EnrichedPage
- Metro map data computed from filteredPages.value — export and metro rendering respect visibility
- URL state restored in onMounted: vizType applied immediately; filters/hiddenNodes deferred until pages load

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Overhaul visualizations/[sourceId].vue with all Phase 3 features | 917a772 | pages/visualizations/[sourceId].vue |
| 2 | checkpoint:human-verify | completed — gaps found | — |

## Deviations from Plan

None — plan executed exactly as written. The file was rewritten per the exact script + template specification in the plan.

## Known Stubs

None. All components receive real data sources:
- FilterPanel receives pages (raw for visibility list) and columnMappings
- FlowDiagram receives filteredPages (reactive, respects filters)
- MetrovizMap receives metrovizData computed from filteredPages
- NotionLinksList receives filteredPages
- NodeDetailPanel receives selectedPage (set on node click)
- ExportButton receives dynamic containerId based on activeVizType

## Human Verification: COMPLETED WITH GAPS

Human verification was performed on 2026-06-03. The following checks passed and the following gaps were identified.

### Checks Passed

- Dashboard with source cards renders correctly
- FilterPanel, NodeDetailPanel, NotionLinksList, ExportButton are present and wired
- Shareable URL encoding (Copy Link) is implemented
- Node visibility toggles and property-based filters are implemented
- SVG export button is present

### Gaps Found

**Gap 1: FilterPanel not collapsible — covers entire diagram on mobile**
- On mobile viewports the FilterPanel occupies the full screen width, obscuring the entire visualization.
- The panel has no collapse/expand control.
- Impact: Users on narrow screens cannot see the diagram at all while the filter panel is open.
- Required fix: Add a collapsible toggle (open/closed state) to FilterPanel; default to collapsed on narrow screens.

**Gap 2: No source selector on the visualization page**
- The viz page (`/visualizations/[sourceId]`) has no UI control to switch to a different source without going back to the dashboard.
- Users must navigate back to the dashboard and re-select a source.
- Required fix: Add a source selector dropdown (or equivalent control) on the viz page header that lists all configured sources and navigates to the chosen one.

**Gap 3: Dashboard timestamp reflects page view time, not cache refresh time**
- The timestamp shown on each source card always updates when the user clicks through to a diagram and returns, even when no cache refresh occurred.
- Expected behavior: the timestamp should reflect the last time data was fetched from Notion (cache refresh time), not the time the page was visited.
- Required fix: Timestamp should only update after a successful cache refresh (Refresh button click or initial load), not on each navigation event.

**Gap 4: No viz type selector and no source selector on visualization page**
- The viz type toggle (Metro Map / Process Flow) is only rendered when `isMetroEligible && isFlowEligible` — meaning it is hidden when only one type is eligible. Users have no way to understand what type is active.
- More critically: there is no source selector at all on the viz page — users cannot switch between sources without returning to the dashboard.
- This overlaps with Gap 2 but also calls out the viz type control specifically.
- Required fix: Always show the active viz type label; show the toggle only when both types are eligible. Add a source selector control.

## Self-Check: PASSED (with verification notes)

Files exist:
- pages/visualizations/[sourceId].vue — FOUND (202 lines added)

Commits exist:
- 917a772 — feat(03-04): integrate all Phase 3 components into viz page — FOUND

Human verification completed — gaps found — routing to gap closure phase.
