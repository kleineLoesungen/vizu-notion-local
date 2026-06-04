---
id: 260604-v9k
type: quick
date: "2026-06-04T20:33:15Z"
one_liner: "Per-source Milestones/Line toggle on metro Additional Sources bar using reactive display mode map"
tags: [metro, multi-source, ui, reactivity]
key_files:
  modified:
    - pages/visualizations/[sourceId].vue
decisions:
  - "reactive({}) used for sourceDisplayModes so Vue tracks property writes from template buttons without needing explicit set()"
  - "Toggle only shown when source is both checked and has 'next' in columnMappings — avoids UI noise for date-only overlay sources"
  - "Default mode inferred from columnMappings at init time; existing choices never overwritten by watcher"
---

# Quick Task 260604-v9k: Per-Source Display Mode Toggle on Metro

## Summary

Per-source Milestones/Line toggle on metro Additional Sources bar using reactive display mode map. Sources with both `date` and `next` roles in their columnMappings now show a small segmented button group inline with their checkbox when checked. Switching to Milestones strips `next` from the effective columnMappings passed to `useMetrovizData`, producing a flat milestone scatter. Switching back to Line restores full sequential rendering. Sources with only `date` default silently to milestones with no toggle shown.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 4b2e9b0 | feat(260604-v9k): add sourceDisplayModes state + mode-aware metrovizData |
| 2 | d817c13 | feat(260604-v9k): add segmented Milestones/Line toggle to Additional Sources row |

## Changes

### Task 1 — Script changes (`pages/visualizations/[sourceId].vue`)

- Added `reactive` to the Vue import list
- Declared `sourceDisplayModes = reactive<Record<string, 'milestones' | 'line'>>({})` after `selectedSourceIds`
- Watcher on `eligibleAdditionalSources` initializes each source's mode from its columnMappings (immediate)
- In `metrovizData` computed: for each extra source, reads `sourceDisplayModes[id]`, builds `effectiveMappings` by filtering out `next` when mode is `'milestones'`, passes to `useMetrovizData`

### Task 2 — Template changes (`pages/visualizations/[sourceId].vue`)

- Replaced `<label v-for>` in Additional Sources bar with `<div v-for>` wrapping the label plus an optional toggle
- Toggle `<template v-if>` guards: `selectedSourceIds.has(src.id) && 'next' in (src.columnMappings ?? {})`
- Two buttons (Milestones / Line) with active/inactive classes; click sets `sourceDisplayModes[src.id]` directly, triggering recomputation

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check

- [x] `pages/visualizations/[sourceId].vue` modified
- [x] Commit 4b2e9b0 exists
- [x] Commit d817c13 exists
- [x] `reactive` imported and used for `sourceDisplayModes`
- [x] No new untracked files
