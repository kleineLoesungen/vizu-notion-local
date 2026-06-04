---
phase: quick
plan: 260604-vql
subsystem: visualization
tags: [metro, metroviz, word-wrap, tspan, zoom, auto-fit]
dependency_graph:
  requires: []
  provides: [word-wrapped event labels, fitToContent auto-zoom]
  affects: [vendor/metroviz/js/metro-renderer.js, components/MetrovizMap.vue]
tech_stack:
  added: []
  patterns: [tspan multi-line SVG text, getBBox-based auto-fit zoom]
key_files:
  modified:
    - vendor/metroviz/js/metro-renderer.js
    - components/MetrovizMap.vue
decisions:
  - "12-char word-boundary heuristic chosen for tspan line splitting — simple, no font metrics needed"
  - "fitToContent clamps scale to 1.5x max to prevent over-zoom on small diagrams"
  - "Silent catch around getBBox — may fail on hidden/zero-size SVG elements in some browsers"
metrics:
  duration: "~8 minutes"
  completed: "2026-06-04T20:54:26Z"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 2
---

# Quick Task 260604-vql: Metro Word-Wrap Event Labels with tspan

**One-liner:** tspan-based word-wrapping for metro event labels at 12-char boundaries + getBBox auto-fit zoom after every render.

## Objective

Improve metro event label readability with word-wrapping and ensure the map always scales to fill its container after each render.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Word-wrap event labels with tspan in renderLabels() | c24ab92 | vendor/metroviz/js/metro-renderer.js |
| 2 | Store zoom state + add fitToContent method in setupZoom() | 6a9e1c4 | vendor/metroviz/js/metro-renderer.js |
| 3 | Call fitToContent after render in MetrovizMap.vue | d36ce3e | components/MetrovizMap.vue |

## Changes Made

### Task 1 — tspan word-wrapping (metro-renderer.js renderLabels)

Replaced the single `.text(event.label)` bottom-label call with a word-split loop that builds lines at a ~12-character boundary, then renders each line as a `<tspan>` element with `dy="1.2em"` spacing. The top date label block is unchanged.

### Task 2 — fitToContent method (metro-renderer.js setupZoom)

- `this._zoom = zoom` and `this._svg = svg` stored in setupZoom() for later access.
- New `fitToContent(width, height)` method: queries the `<g>` element's `getBBox()`, calculates a scale that fits width/height with 40px padding (capped at 1.5x), then applies a `d3.zoomIdentity` transform. Silent catch for hidden-element getBBox failures.

### Task 3 — Auto-fit call (MetrovizMap.vue renderMap)

Inserted after `await nextTick()` and before `attachClickListener()`:

```js
if (rendererInstance?.fitToContent) {
    rendererInstance.fitToContent(
        container.clientWidth || container.getBoundingClientRect().width,
        container.clientHeight || container.getBoundingClientRect().height
    )
}
```

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `grep -n "tspan"` in metro-renderer.js → line 872 (FOUND)
- `grep -n "fitToContent"` in metro-renderer.js → line 969 (FOUND)
- `grep -n "fitToContent"` in MetrovizMap.vue → lines 98-99 (FOUND)
- Commits c24ab92, 6a9e1c4, d36ce3e all present in git log
