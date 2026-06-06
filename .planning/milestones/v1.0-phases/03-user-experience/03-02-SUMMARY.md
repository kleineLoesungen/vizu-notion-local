---
phase: 03-user-experience
plan: "02"
subsystem: dashboard-ui
tags: [dashboard, source-cards, refresh, navigation, vue-components]
dependency_graph:
  requires:
    - 03-01 (source refresh API endpoint /api/sources/:id/refresh)
    - 02-04 (pages/visualizations/[sourceId].vue navigation target)
    - 01-01 (server/routes/api/sources.get.ts response shape)
  provides:
    - Dashboard entry page with SourceCard grid
    - Per-source and global refresh with timestamp tracking
    - Navigation from source card to viz page with vizType query param
  affects:
    - pages/index.vue (fully replaced)
    - components/SourceCard.vue (new component)
tech_stack:
  added: []
  patterns:
    - useFetch for source list from /api/sources
    - ref + watch for per-source timestamp initialization on load
    - Immutable object spread pattern for refreshingMap/sourceTimestamps updates
    - Emits pattern (navigate, refresh) for SourceCard parent communication
key_files:
  created:
    - components/SourceCard.vue
  modified:
    - pages/index.vue
decisions:
  - "D-03: sourceTimestamps initialized via watch(sources, { immediate: true }) — sets current time as initial fetch time when sources first load"
  - "D-04: Per-source refresh sequence: POST /api/sources/:id/refresh → GET /api/sources/:id → update timestamp"
  - "D-05: Refresh errors logged to console.error only — non-blocking; card returns to normal state after failure"
  - "isMetroEligible/isFlowEligible derived inline in SourceCard from columnMappings keys (not imported from useSourceData) — dashboard gets sources from /api/sources which does not include availableRoles array"
metrics:
  duration_minutes: 12
  completed_date: "2026-06-03"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 2
---

# Phase 3 Plan 02: Dashboard with SourceCard Grid Summary

Dashboard entry page built: SourceCard component with viz type navigation/refresh, plus overhauled index.vue with 3-column grid, per-source timestamps, and global Fetch All.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | SourceCard component | 626195d | components/SourceCard.vue (new) |
| 2 | Dashboard page overhaul | c102246 | pages/index.vue (replaced) |

## What Was Built

### SourceCard Component (`components/SourceCard.vue`)

New component rendering a bordered card for a single Notion source:

- **Props:** `source` (id, name, databaseId, columnMappings), `lastFetched` (display string), `isRefreshing` (boolean)
- **Emits:** `navigate(vizType: 'metro' | 'flow')` and `refresh`
- Eligibility derived locally from `columnMappings` keys: Metro requires `date` + `next`, Flow requires `next`
- Shows "Never fetched" in muted text when `lastFetched` prop is absent
- Refresh button: disabled + `opacity-50` when `isRefreshing=true`, shows "Refreshing..."
- Card styling: `p-4 rounded border border-gray-200 bg-white hover:shadow-md transition-shadow`

### Dashboard Page (`pages/index.vue`)

Full replacement of the previous simple `<ul>` list:

- **Header:** "Visualizations" title (`text-4xl font-semibold`) + "Select a source to explore" subtitle
- **States:** LoadingSpinner → ErrorAlert (reused) → empty state box → SourceCard grid
- **Grid:** `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- **Per-source timestamps:** `watch(sources, { immediate: true })` sets current time when sources first load; updated on each per-source refresh
- **Per-source refresh:** `POST /api/sources/:id/refresh` then `GET /api/sources/:id` to warm cache, then timestamp update
- **Global Fetch All:** Refreshes sources sequentially; button disabled + shows "Fetching..." during any active refresh
- **Navigation:** `navigateTo('/visualizations/:id?vizType=metro|flow')` via Nuxt's `navigateTo`

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| SourceCard eligibility derived inline from columnMappings keys | /api/sources does not return availableRoles array; only columnMappings is available; rules are identical to isMetroEligible/isFlowEligible |
| Timestamps initialized via watch (not useFetch's onMounted) | Allows reactive initialization — if sources load asynchronously, watch fires with immediate: true pattern |
| Refresh errors non-blocking (console.error only) | Dashboard remains usable even if one source refresh fails; consistent with Phase 1 Promise.allSettled silent-drop pattern |
| Global Fetch All is sequential (not parallel) | Avoids Notion rate limit spikes; sequential guarantees all sources update before button re-enables |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data is wired from the live /api/sources endpoint. Timestamps are real time values. Refresh calls real server endpoints.

## Self-Check: PASSED

- `components/SourceCard.vue` exists: FOUND
- `pages/index.vue` contains `Visualizations`: FOUND
- `pages/index.vue` contains `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`: FOUND
- Commits 626195d and c102246 exist: FOUND
