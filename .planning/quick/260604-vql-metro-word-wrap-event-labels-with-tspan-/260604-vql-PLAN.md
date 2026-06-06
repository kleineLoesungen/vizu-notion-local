---
phase: quick
plan: 260604-vql
type: execute
wave: 1
depends_on: []
files_modified:
  - vendor/metroviz/js/metro-renderer.js
  - components/MetrovizMap.vue
autonomous: true
requirements: []
must_haves:
  truths:
    - "Event labels with long text wrap onto multiple lines instead of overflowing"
    - "After each render the map auto-fits to fill the visible container"
  artifacts:
    - path: "vendor/metroviz/js/metro-renderer.js"
      provides: "Word-wrapped tspan event labels + fitToContent method"
    - path: "components/MetrovizMap.vue"
      provides: "fitToContent call after every render"
  key_links:
    - from: "MetrovizMap.vue renderMap()"
      to: "rendererInstance.fitToContent()"
      via: "called after nextTick() before attachClickListener()"
---

<objective>
Improve metro event label readability with word-wrapping and ensure the map always scales to fill its container after each render.

Purpose: Long event labels currently overflow as single-line text. Auto-fit zoom ensures the full diagram is visible without manual zoom adjustments after data changes.
Output: Updated renderer with tspan word-wrap and fitToContent, MetrovizMap calling fitToContent post-render.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@vendor/metroviz/js/metro-renderer.js
@components/MetrovizMap.vue
</context>

<tasks>

<task type="auto">
  <name>Task 1: Word-wrap event labels with tspan in renderLabels()</name>
  <files>vendor/metroviz/js/metro-renderer.js</files>
  <action>
In `renderLabels()` (line 851), replace the first `group.append('text')` block (the bottom label with `fill: '#d32f2f'` and `.text(event.label)`) with the word-wrapped tspan version below. Leave the second `group.append('text')` (the top date label at `config.margins.top - 25`) completely unchanged.

Replace lines 852-860 (the bottom event label block) with:

```js
const words = (event.label || '').split(' ');
const lines = [];
let cur = '';
for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (test.length > 12 && cur) { lines.push(cur); cur = w; }
    else { cur = test; }
}
if (cur) lines.push(cur);

const textEl = group.append('text')
    .attr('x', event.x)
    .attr('y', bottomY + 20)
    .attr('text-anchor', 'middle')
    .attr('font-family', 'Helvetica, "Helvetica Neue", Arial, "Liberation Sans", sans-serif')
    .attr('font-size', '12px')
    .attr('font-weight', 'bold')
    .attr('fill', '#d32f2f');

lines.forEach((line, i) => {
    textEl.append('tspan')
        .attr('x', event.x)
        .attr('dy', i === 0 ? 0 : '1.2em')
        .text(line);
});
```
  </action>
  <verify>
    Grep confirms no bare `.text(event.label)` remains in the bottom label block:
    `grep -n "\.text(event\.label)" vendor/metroviz/js/metro-renderer.js` — should return no matches.
    Grep confirms tspan appending exists:
    `grep -n "tspan" vendor/metroviz/js/metro-renderer.js` — should return matches.
  </verify>
  <done>renderLabels() uses tspan for the bottom event label; the top date label is unchanged.</done>
</task>

<task type="auto">
  <name>Task 2: Store zoom state + add fitToContent method in setupZoom()</name>
  <files>vendor/metroviz/js/metro-renderer.js</files>
  <action>
In `setupZoom(svg, zoomGroup)` (around line 923):

1. After the `const zoom = d3.zoom()...` block, before `svg.call(zoom)`, add:
```js
this._zoom = zoom;
this._svg = svg;
```

2. After the closing `}` of `setupZoom`, add the new `fitToContent` method:
```js
fitToContent(width, height) {
    if (!this._zoom || !this._svg) return;
    try {
        const svgNode = this._svg.node();
        const g = svgNode.querySelector('g');
        if (!g) return;
        const bbox = g.getBBox();
        if (!bbox.width || !bbox.height) return;
        const pad = 40;
        const scale = Math.min(
            (width - pad * 2) / bbox.width,
            (height - pad * 2) / bbox.height,
            1.5
        );
        const tx = (width - bbox.width * scale) / 2 - bbox.x * scale;
        const ty = (height - bbox.height * scale) / 2 - bbox.y * scale;
        const t = d3.zoomIdentity.translate(tx, ty).scale(scale);
        this._svg.call(this._zoom.transform, t);
    } catch (e) {
        // getBBox may fail on hidden/zero-size elements
    }
}
```
  </action>
  <verify>
    `grep -n "_zoom\|_svg\|fitToContent" vendor/metroviz/js/metro-renderer.js` — should show all three identifiers present.
  </verify>
  <done>setupZoom stores this._zoom and this._svg; fitToContent method exists on the class.</done>
</task>

<task type="auto">
  <name>Task 3: Call fitToContent after render in MetrovizMap.vue</name>
  <files>components/MetrovizMap.vue</files>
  <action>
In `renderMap()`, after the `await nextTick()` line (currently line 96) and BEFORE `attachClickListener()`, insert:

```js
// Auto-fit to show all content after each render
if (rendererInstance?.fitToContent) {
    rendererInstance.fitToContent(
        container.clientWidth || container.getBoundingClientRect().width,
        container.clientHeight || container.getBoundingClientRect().height
    )
}
```

The final order in the try block must be:
1. `rendererInstance.render(layout)`
2. `await nextTick()`
3. fitToContent block (new)
4. `attachClickListener()`
  </action>
  <verify>
    `grep -n "fitToContent" components/MetrovizMap.vue` — should show the call present.
    `grep -n "attachClickListener\|fitToContent\|nextTick" components/MetrovizMap.vue` — fitToContent line must appear between nextTick and attachClickListener lines.
  </verify>
  <done>renderMap() calls fitToContent with container dimensions after every render, before attaching click listener.</done>
</task>

</tasks>

<verification>
After all tasks:
1. `grep -n "tspan" vendor/metroviz/js/metro-renderer.js` returns matches in renderLabels area
2. `grep -n "fitToContent" vendor/metroviz/js/metro-renderer.js` returns the method definition
3. `grep -n "fitToContent" components/MetrovizMap.vue` returns the call site
4. App starts without errors: `docker-compose up` or `npm run dev`
</verification>

<success_criteria>
- Event labels with multiple words split across lines at ~12-char boundaries (visible in metro diagram)
- After each data change / source switch the metro map fills its container without requiring manual zoom
- No JS errors in browser console related to getBBox or zoom transform
</success_criteria>

<output>
After completion, create `.planning/quick/260604-vql-metro-word-wrap-event-labels-with-tspan-/260604-vql-SUMMARY.md`
</output>
