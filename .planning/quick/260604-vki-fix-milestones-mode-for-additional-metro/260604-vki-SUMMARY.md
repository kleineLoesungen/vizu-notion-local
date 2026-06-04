---
phase: quick
plan: 260604-vki
subsystem: visualization
tags: [metro, milestones, composable, typescript]
key-files:
  modified:
    - composables/useMetrovizData.ts
    - pages/visualizations/[sourceId].vue
decisions:
  - useMetrovizMilestoneEvents produces events[] with empty lines/zones — Metroviz renders these as vertical axis markers, not metro lines
  - mergeMetrovizData now flatMaps events from all datasets so milestone events survive multi-source merges
  - effectiveMappings workaround removed — routing to the correct function is cleaner than stripping keys
metrics:
  duration: ~5 minutes
  completed: "2026-06-04T20:46:50Z"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 2
---

# Quick Task 260604-vki: Fix Milestones Mode for Additional Metro Sources

**One-liner:** Milestone-mode extra sources now call `useMetrovizMilestoneEvents` which produces Metroviz event markers on the timeline axis instead of line segments.

## What Was Done

### Task 1: Fix composable (useMetrovizData.ts)

Three changes:

1. `MetrovizInputData.events` type fixed from the empty tuple `[]` to `Array<{ date: string; label: string }>` — the interface now matches what Metroviz actually expects for event markers.

2. `mergeMetrovizData` events merge fixed from hardcoded `[]` to `datasets.flatMap(d => d.events ?? [])` — events from all merged datasets are now combined, so milestone events survive a multi-source merge.

3. New export `useMetrovizMilestoneEvents(pages, columnMappings, sourceTitle)` added at end of file — takes `EnrichedPage[]`, extracts `date` + `title` per page, returns a `MetrovizInputData` with populated `events[]` and empty `lines`/`zones`. Helper functions `extractDate`, `extractTitle`, `snapToMonthStart`, `snapToNextMonthStart` (already defined earlier) are reused directly.

### Task 2: Route milestones mode in [sourceId].vue

1. Import updated to include `useMetrovizMilestoneEvents`.

2. `extrasData` computed block updated: the `effectiveMappings` workaround (stripping the `next` key and calling `useMetrovizData`) is replaced with an explicit branch — `mode === 'milestones'` calls `useMetrovizMilestoneEvents`, `mode === 'line'` calls `useMetrovizData`. The full `d.source.columnMappings` is passed in both branches with no key-stripping needed.

## Commits

| Hash | Message |
|------|---------|
| c5dabb0 | feat(quick-260604-vki): milestones mode routes extra sources to event markers |

## Verification

`npx nuxi typecheck` — no new errors introduced. All pre-existing errors are in unrelated code and predate this task.

## Deviations from Plan

None — plan executed exactly as written.
