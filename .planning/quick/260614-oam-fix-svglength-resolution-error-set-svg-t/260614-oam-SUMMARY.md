---
quick_task: 260614-oam
date: 2026-06-14
commit: b4bb91e
files_modified:
  - composables/useMermaidTemplate.ts
---

# Quick Task 260614-oam: Fix SVGLength resolution error — set SVG to explicit container pixel dimensions instead of CSS percentage width/height

## One-liner

Replaced CSS `width: 100%; height: 100%` on the SVG element with explicit `setAttribute('width', cw)` / `setAttribute('height', ch)` pixel values (read after `await nextTick()`), and moved `viewBox` removal to after layout is known, eliminating the "Could not resolve relative length" SVGLength error thrown when D3 reads `svgEl.width.baseVal.value` via the SVG attribute DOM API.

## Root Cause

`initMermaidZoom` was setting SVG dimensions via CSS `style.cssText = 'width: 100%; height: 100%; ...'` while simultaneously removing the `width` and `height` SVG attributes. When D3 (or Mermaid internally) reads `svgEl.width.baseVal.value` — the SVG attribute DOM API — it sees no attribute set and falls back to the SVG default, which is a percentage-based length. `SVGLength.value` on a percentage throws "Could not resolve relative length" because there is no established viewport to resolve against at the time of the read.

## Fix

Three coordinated changes to `initMermaidZoom` in `composables/useMermaidTemplate.ts`:

1. **Moved viewBox removal and dimension setting to after `await nextTick()`** — container dimensions are only reliable after layout; previously `removeAttribute('viewBox')` was called before `nextTick()`.

2. **Replaced `removeAttribute('width')` + `removeAttribute('height')` + CSS `%` with `setAttribute('width', String(cw))` + `setAttribute('height', String(ch))`** — explicit pixel values in the SVG attribute DOM resolve without a viewport, eliminating the SVGLength error.

3. **Replaced `style.cssText = '...'` with targeted `style.display = 'block'; style.maxWidth = 'none'`** — avoids blowing away Mermaid's existing inline styles; only the two properties that actually need overriding are set.

The resulting SVG has no `viewBox` (so SVG user space = CSS pixel space, 1:1, no double-scaling) and explicit pixel `width`/`height` attributes (so `svgEl.width.baseVal.value` resolves correctly).

## Files Modified

- `composables/useMermaidTemplate.ts` — `initMermaidZoom` function fully replaced (20 insertions, 20 deletions)

## No Deviations

Fix was a direct replacement of the function as specified. No architectural changes, no additional files touched.
