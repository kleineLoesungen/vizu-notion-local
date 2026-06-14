---
phase: quick-260614-nmf
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - composables/useMermaidTemplate.ts
autonomous: true
requirements:
  - fix-drag-zoom-large-mermaid
must_haves:
  truths:
    - "Dragging and zooming works across the full diagram area for large Mermaid SVGs"
    - "Fit-to-content centers and scales the diagram on initial render"
    - "Zooming out then dragging to edges reaches content that was previously clipped"
  artifacts:
    - path: "composables/useMermaidTemplate.ts"
      provides: "D3 zoom attached to SVG element, transform applied to inner <g>"
  key_links:
    - from: "initMermaidZoom"
      to: "svgEl (100%/100% fill)"
      via: "d3Module.select(svgEl).call(zoomBehavior)"
    - from: "zoom handler"
      to: "innerG.setAttribute('transform', ...)"
      via: "event.transform.toString()"
---

<objective>
Fix drag and zoom being unresponsive on large Mermaid diagrams by switching from container-div zoom + CSS SVG transform to the canonical SVG-fill + inner-g-transform pattern.

Purpose: Large SVGs (e.g. 3000x2000px) rendered with `position: absolute` keep their full layout box, causing the container's `overflow: hidden` to clip pointer events outside the visible scale area. Attaching D3 zoom to the SVG itself (set to 100%/100%) and transforming its inner `<g>` fixes the hit area entirely.

Output: Rewritten `initMermaidZoom` in `composables/useMermaidTemplate.ts`.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@composables/useMermaidTemplate.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rewrite initMermaidZoom to use SVG-fill + inner-g-transform pattern</name>
  <files>composables/useMermaidTemplate.ts</files>
  <action>
Replace the `initMermaidZoom` function body (lines 83–134) with the canonical pattern. Keep all surrounding code (imports, reactive refs, watchers, `renderDiagram`) unchanged.

**New `initMermaidZoom` implementation:**

1. Query the SVG and its inner `<g>`:
   ```ts
   const svgEl = container.querySelector('svg') as SVGSVGElement | null
   if (!svgEl) return
   const innerG = svgEl.querySelector('g') as SVGGElement | null
   if (!innerG) return
   currentSvgEl = svgEl
   ```

2. Set SVG to fill the container (remove all position/absolute styling):
   ```ts
   svgEl.removeAttribute('width')
   svgEl.removeAttribute('height')
   svgEl.style.cssText = 'width: 100%; height: 100%; display: block; max-width: none;'
   ```
   Do NOT set `position: absolute`, `top`, `left`, `transformOrigin`, or `overflow` on the SVG.

3. Lazy-load D3 (keep existing pattern):
   ```ts
   if (!d3Module) {
     d3Module = (window as any).d3 ?? await import('d3')
     if (!(window as any).d3) (window as any).d3 = d3Module
   }
   ```

4. Create zoom behavior — transform `innerG` via `setAttribute`, not CSS:
   ```ts
   zoomBehavior = d3Module.zoom()
     .scaleExtent([0.1, 5])
     .filter((event: any) => event.type !== 'wheel' || event.ctrlKey || event.metaKey)
     .on('zoom', (event: any) => {
       innerG.setAttribute('transform', event.transform.toString())
     })
   ```
   `event.transform.toString()` produces `translate(x,y) scale(k)` — valid SVG transform syntax.

5. Attach zoom to the SVG element (not the container div):
   ```ts
   d3Module.select(svgEl).call(zoomBehavior).on('dblclick.zoom', null)
   container.style.cursor = 'grab'
   container.addEventListener('mousedown', () => { container.style.cursor = 'grabbing' })
   container.addEventListener('mouseup', () => { container.style.cursor = 'grab' })
   ```

6. Fit-to-content using SVG `viewBox` attribute (Mermaid always sets it):
   ```ts
   await nextTick()
   const cw = container.clientWidth
   const ch = container.clientHeight
   let nw = 0, nh = 0
   const vb = svgEl.getAttribute('viewBox')
   if (vb) {
     const parts = vb.split(/[\s,]+/).map(Number)
     nw = parts[2] ?? 0
     nh = parts[3] ?? 0
   }
   if (!nw || !nh) {
     nw = parseFloat(svgEl.getAttribute('width') || '0')
     nh = parseFloat(svgEl.getAttribute('height') || '0')
   }
   if (nw > 0 && nh > 0 && cw > 0 && ch > 0) {
     const scale = Math.min(cw / nw, ch / nh, 1)
     const tx = (cw - nw * scale) / 2
     const ty = (ch - nh * scale) / 2
     const t = d3Module.zoomIdentity.translate(tx, ty).scale(scale)
     d3Module.select(svgEl).call(zoomBehavior.transform, t)
   }
   ```
   Note: `removeAttribute('width'/'height')` is called before this block, so the fallback path reads from the already-removed attribute — move the `removeAttribute` calls AFTER reading natural dimensions, or store them first:
   ```ts
   // Read natural size BEFORE removing attributes
   const nwAttr = svgEl.getAttribute('width')
   const nhAttr = svgEl.getAttribute('height')
   svgEl.removeAttribute('width')
   svgEl.removeAttribute('height')
   svgEl.style.cssText = 'width: 100%; height: 100%; display: block; max-width: none;'
   // ... then use nwAttr/nhAttr as fallback
   ```

7. Update `onBeforeUnmount` to detach zoom from SVG (not container):
   ```ts
   onBeforeUnmount(() => {
     if (currentSvgEl && d3Module) {
       d3Module.select(currentSvgEl).on('.zoom', null)
     }
     currentSvgEl = null
   })
   ```
   Replace the existing `onBeforeUnmount` at line 54–56 with this.
  </action>
  <verify>
    <automated>cd /Users/sebastianwiller/Documents/github/vizu-notion-local && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>
    TypeScript compilation reports no errors in useMermaidTemplate.ts. The function attaches D3 zoom to `svgEl`, transforms `innerG` via `setAttribute`, and removes SVG position/absolute styling. onBeforeUnmount detaches from `currentSvgEl`.
  </done>
</task>

</tasks>

<verification>
After implementation, manually verify in browser:
- Open a Mermaid template that produces a large diagram (many nodes)
- Drag from center and from edges — entire diagram area should be draggable
- Ctrl+scroll (or pinch) zooms in/out and panning remains responsive at all zoom levels
- On initial render the diagram is centered and scaled to fit the container
- Switching templates unmounts cleanly (no stale zoom listeners in DevTools event panel)
</verification>

<success_criteria>
Drag and zoom are responsive across the full diagram area for large Mermaid SVGs. The initial fit-to-content centers the diagram. No TypeScript errors introduced.
</success_criteria>

<output>
No SUMMARY.md required for quick tasks. Commit with message:
`fix(quick-260614-nmf): attach D3 zoom to SVG element and transform inner g for large diagram pan/zoom`
</output>
