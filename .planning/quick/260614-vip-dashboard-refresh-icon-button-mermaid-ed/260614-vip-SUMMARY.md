---
phase: quick-260614-vip
plan: "01"
subsystem: UI
tags: [ux, dashboard, mermaid-editor, export]
dependency_graph:
  requires: []
  provides: [icon-refresh-button, download-svg-button]
  affects: [components/SourceCard.vue, pages/mermaid-editor.vue]
tech_stack:
  added: []
  patterns: [Tailwind animate-spin for spinner state, useExport composable reuse]
key_files:
  modified:
    - components/SourceCard.vue
    - pages/mermaid-editor.vue
decisions:
  - "animate-spin Tailwind class handles icon rotation — no custom CSS needed"
  - "downloadSVG reuses existing useExport composable rather than inline blob logic"
metrics:
  duration: "5 minutes"
  completed_date: "2026-06-14"
  tasks_completed: 2
  files_modified: 2
---

# Phase quick-260614-vip Plan 01: Dashboard refresh icon button + Mermaid editor Download SVG

**One-liner:** Icon-only circular-arrow refresh button in SourceCard top-right corner, and Download SVG button next to Fit to content in Mermaid editor.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Replace text Refresh button with absolute icon button in SourceCard | 7210c41 | components/SourceCard.vue |
| 2 | Add Download SVG button to Mermaid editor preview panel | 0ffdaec | pages/mermaid-editor.vue |

## What Was Built

**Task 1 — SourceCard icon refresh button:**
- Added `relative` to the outer card `<div>`
- Removed the old text `Refresh` / `Refreshing...` button from the flex row
- Added an `absolute top-2 right-2` circular-arrow SVG icon button
- Button applies `animate-spin` via `:class="{ 'animate-spin': isRefreshing }"` — no custom CSS
- Button is disabled while `isRefreshing` is true, with `disabled:opacity-40 disabled:cursor-not-allowed`

**Task 2 — Mermaid editor Download SVG:**
- Imported `useExport` from `@/composables/useExport` and destructured `downloadSVG`
- Wrapped the "Fit to content" button in a `flex items-center gap-3` row
- Added "Download SVG" button alongside it, calling `downloadSVG('mmd-editor-preview', 'mermaid-preview')`
- Produces filenames like `mermaid-preview-2026-06-14T....svg`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- [x] `components/SourceCard.vue` — modified, `absolute top-2 right-2` present, `animate-spin` present, old text Refresh removed
- [x] `pages/mermaid-editor.vue` — modified, `useExport` imported, `downloadSVG` destructured, "Download SVG" button present
- [x] Commit 7210c41 exists
- [x] Commit 0ffdaec exists
