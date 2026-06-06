---
phase: 03-user-experience
plan: "07"
subsystem: dashboard-timestamp-fix
tags: [dashboard, sessionStorage, timestamp, navigation, ux-gap-closure]

# Dependency graph
requires:
  - 03-02  # Dashboard with SourceCard grid and timestamp logic
  - 03-04  # viz page integration (navigation target whose return trip triggered the bug)
provides:
  - Correct dashboard timestamps: only updated after actual Notion cache refresh
  - sessionStorage persistence of timestamps across in-session navigation
affects:
  - pages/index.vue (timestamp init logic replaced, sessionStorage added)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - sessionStorage keyed by constant for cross-navigation state persistence
    - onMounted replaces watch({ immediate: true }) for load-once initialization
    - persistTimestamps() helper called only after refresh success (not on every source load)

# Key files
key-files:
  modified:
    - pages/index.vue

# Decisions
decisions:
  - "Remove watch(sources, { immediate: true }) — it fired on every component mount including return navigation, falsely updating timestamps"
  - "onMounted loads timestamps from sessionStorage once — survives navigation, cleared on full page reload"
  - "persistTimestamps() written only in refreshSource try block — guarantees timestamps only advance after real Notion fetch"
  - "Sources never refreshed in session show 'Never fetched' via existing SourceCard undefined fallback — no new code needed"

# Metrics
metrics:
  duration: "~5 minutes"
  completed: "2026-06-03"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 1
---

# Phase 03 Plan 07: Dashboard Timestamp Fix Summary

**One-liner:** sessionStorage-backed timestamps that only update after a successful Notion cache refresh, replacing the watch({ immediate: true }) that fired on every return navigation.

## What Was Built

Closed Gap 3: the dashboard timestamp was updating on every page visit because `watch(sources, ..., { immediate: true })` ran whenever the component mounted (including after returning from a viz page). The fix:

1. **Removed** the `watch(sources, ...)` block entirely — this was the root cause
2. **Added** `TIMESTAMP_STORAGE_KEY` constant for sessionStorage key
3. **Added** `onMounted` block that loads persisted timestamps from sessionStorage on component mount — survives navigation within the session, cleared on full page reload
4. **Added** `persistTimestamps()` helper that serializes the current timestamps map to sessionStorage
5. **Modified** `refreshSource` to call `persistTimestamps()` after a successful refresh — the only path that updates timestamps

Sources that have never been refreshed in the current session show "Never fetched" via the existing SourceCard `lastFetched` prop undefined fallback — no template changes required.

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix dashboard timestamp to reflect cache refreshes only | aca95f3 | pages/index.vue |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- pages/index.vue exists and contains all required changes
- Commit aca95f3 exists in git log
- `watch(sources` count: 0 (removed)
- `sessionStorage`, `TIMESTAMP_STORAGE_KEY`, `persistTimestamps`, `onMounted` all present
- `refreshSource`, `refreshAllSources`, `sourceTimestamps`, `:last-fetched` binding all preserved
