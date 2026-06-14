---
phase: quick-260614-nmf
plan: "01"
subsystem: composables/useMermaidTemplate
tags: [mermaid, d3-zoom, svg, pan-zoom, fix]
dependency_graph:
  requires: []
  provides: [working drag/zoom for large Mermaid SVGs]
  affects: [composables/useMermaidTemplate.ts]
tech_stack:
  added: []
  patterns: [SVG-fill + inner-g-transform D3 zoom pattern]
key_files:
  created: []
  modified:
    - composables/useMermaidTemplate.ts
decisions:
  - "Attach D3 zoom to svgEl (not container div) so hit area matches SVG bounds at all zoom levels"
  - "Transform inner <g> via setAttribute (not CSS) to stay in SVG coordinate space"
  - "Read viewBox dimensions before removeAttribute to preserve natural size for fit-to-content"
metrics:
  duration: "~10 minutes"
  completed: "2026-06-14"
  tasks_completed: 1
  files_modified: 1
---

# Quick Task 260614-nmf: Fix Drag and Zoom Broken on Larger Mermaid Diagrams — Summary

**One-liner:** Switched from CSS-transform-on-SVG to D3-zoom-on-SVG with inner-g setAttribute transform, fixing unresponsive drag/zoom on large Mermaid diagrams.

## What Was Done

Rewrote `initMermaidZoom` in `composables/useMermaidTemplate.ts` to use the canonical SVG-fill + inner-g-transform pattern.

**Root cause of the bug:** Large SVGs (e.g. 3000x2000px) positioned with `position: absolute; overflow: visible` kept their full layout box inside the container. D3 zoom was attached to the container div, so pointer events outside the visible (scaled-down) area fell outside the container's hit area. Dragging from the edges or after zooming out simply didn't register.

**Fix:**

1. SVG set to `width: 100%; height: 100%; display: block` — fills the container and provides the correct hit area at all zoom levels.
2. D3 zoom attached to `svgEl` (not container div) via `d3Module.select(svgEl).call(zoomBehavior)`.
3. Zoom handler calls `innerG.setAttribute('transform', event.transform.toString())` — transforms in SVG coordinate space, no CSS pixel / viewBox mismatch.
4. Natural dimensions read from `viewBox` attribute before `removeAttribute('width'/'height')` so fit-to-content math uses correct values.
5. `onBeforeUnmount` updated to detach zoom from `currentSvgEl` via `d3Module.select(currentSvgEl).on('.zoom', null)`.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 0a5c1f7 | fix(quick-260614-nmf): attach D3 zoom to SVG element and transform inner g for large diagram pan/zoom |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- composables/useMermaidTemplate.ts modified and committed at 0a5c1f7
- No TypeScript errors in useMermaidTemplate.ts (pre-existing errors in useFlowData.ts and useMetrovizData.ts are out of scope)
