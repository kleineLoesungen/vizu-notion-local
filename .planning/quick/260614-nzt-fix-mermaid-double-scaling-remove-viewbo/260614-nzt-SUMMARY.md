---
quick_task: 260614-nzt
date: "2026-06-14"
commit: 098a950
file_modified: composables/useMermaidTemplate.ts
tags: [mermaid, d3-zoom, svg, bug-fix]
---

# Quick Task 260614-nzt: Fix Mermaid Double-Scaling — Remove viewBox After Reading Dimensions

**One-liner:** Remove SVG viewBox attribute after reading natural dimensions so D3 zoom is the sole transform applied to Mermaid diagram content.

## Problem

The previous quick task (260614-nmf) removed `width`/`height` attributes from the Mermaid-rendered SVG and set `width: 100%; height: 100%` via CSS. However, the `viewBox` attribute was left in place. This caused two independent transforms to act simultaneously:

1. Browser viewBox scaling: the browser scaled SVG user-space content (e.g. a 3000×2000 viewBox) to fill the CSS container (e.g. 800×600), shrinking content by ~0.27×.
2. D3 zoom transform on `innerG`: `initMermaidZoom` computed a fit-to-content transform (e.g. scale ~0.27) and applied it via `innerG.setAttribute('transform', ...)`.

The compound effect was content scaled to ~0.07× of its natural size — effectively invisible. This explained both reported symptoms:
- "Nothing to see" on one diagram (double-scaled to invisible)
- Drag/zoom broken on large diagrams (wrong coordinate space because viewBox was still active)

## Fix

Added `svgEl.removeAttribute('viewBox')` immediately after `removeAttribute('width')` and `removeAttribute('height')` in `initMermaidZoom`.

Natural dimensions (`nw`, `nh`) are still read from the viewBox before it is removed, so the fit-to-content math remains correct.

Without viewBox:
- SVG user-space = CSS pixel-space (1:1 mapping)
- D3 zoom transform on `innerG` is the only transform in play
- Fit-to-content scale and translation are applied exactly once

## Change

**File:** `composables/useMermaidTemplate.ts`  
**Lines affected:** 111–115 (before) → 111–116 (after)

```typescript
// Before
svgEl.removeAttribute('width')
svgEl.removeAttribute('height')
svgEl.style.cssText = 'width: 100%; height: 100%; display: block; max-width: none;'

// After
svgEl.removeAttribute('width')
svgEl.removeAttribute('height')
svgEl.removeAttribute('viewBox')
svgEl.style.cssText = 'width: 100%; height: 100%; display: block; max-width: none;'
```

## Commit

`098a950` — fix(quick-260614-nzt): remove viewBox to eliminate double-scaling in Mermaid D3 zoom

## Deviations

None — single targeted line addition exactly as specified.
