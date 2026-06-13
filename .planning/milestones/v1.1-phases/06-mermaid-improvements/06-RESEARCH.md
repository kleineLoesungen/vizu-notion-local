# Phase 6: Mermaid Improvements - Research

**Researched:** 2026-06-12
**Domain:** Handlebars pre-processing, D3 zoom on injected SVG, Notion relation extraction, FilterPanel CSS
**Confidence:** HIGH — all findings from direct codebase inspection

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `{{attribute}}` in a template body → server replaces it with full Mermaid node definition `stableId[value]`, where `stableId` is a short hash and `value` is the raw Notion field value.
- **D-02:** Node shape is always `[ ]` (rectangle). No shape-modifier syntax.
- **D-03:** ID generation strategy: short hash of `(attributeName + value)` — stable within and across renders, no order dependency.
- **D-04:** Same attribute name + same value → always same ID globally. Intentionally merges nodes across sources.
- **D-05:** `{{attribute}}` always outputs the full `id[value]` form. No separate ID-only binding syntax.
- **D-06:** Remove `max-height: 20rem` cap on the inner list container. Panel itself uses `overflow-y-auto`; that is correct.
- **D-07:** "Related" = Notion relation properties. Related page IDs = targets of resolved relations.
- **D-08:** 1 hop only. Selected node → direct Notion-relation neighbours.
- **D-09:** "Show related" = bulk set hidden IDs (all except selected + neighbours) using existing `mermaidHiddenIdsMap` mechanism.
- **D-10:** Small "show related" icon button next to each node row in the Mermaid filter panel. Clicking triggers related-filter; clicking again (or toggling a checkbox) resets.
- **D-11:** Server includes `_relations: string[]` (list of directly related Notion page IDs) on each row in `/api/mermaid/[templateId]` response.
- **D-12:** D3 zoom — already in package.json at `"d3": "^7.9.0"`.
- **D-13:** Interaction model: Ctrl+scroll to zoom, drag to pan — same as Metro and Flow.
- **D-14:** Fit-to-content on load — follow `FlowDiagram.vue` pattern.
- **D-15:** Wrap Mermaid-rendered SVG content in `<g :transform="zoomTransform">` and apply `d3.zoom()` to outer SVG element.

### Claude's Discretion

- Exact hash function for node IDs (any stable short-hash, e.g. FNV-1a or djb2 mod 36, producing ~6-char alphanumeric prefix).
- Whether `_relations` is included only when template sources have relation-type columnMappings, or unconditionally (empty array is fine).
- Reset-zoom button placement (follow FlowDiagram if it has one, otherwise omit).
- Whether "show related" icon is a dedicated SVG icon or a Unicode glyph.

### Deferred Ideas (OUT OF SCOPE)

- Shape modifiers in bindings (`{{title:round}}`).
- Multi-hop related traversal (depth > 1).
- Click-on-diagram-node to trigger related filter.
- Hot-reload of templates.
</user_constraints>

---

## Summary

Phase 6 makes four targeted improvements to the Phase 5 Mermaid feature. All four are self-contained and touch distinct layers of the stack. The key discovery is that `templates.ts` pre-compiles Handlebars at load time (`Handlebars.compile(body)`), which means the node-ID hash helper must be registered **before** templates are loaded — or the template body must be rewritten before compilation. Given the compile-once pattern, registering a Handlebars helper is cleaner than post-processing the rendered output. The D3 zoom for Mermaid must account for the inject-via-innerHTML pattern: `mermaid.render()` produces an SVG string that is written into a container div; the outer SVG element does not exist in Vue's component tree until after this write, so the `initZoom()` call must happen in a `watch(diagramString, ...)` callback (already present in `useMermaidTemplate.ts`) using `nextTick()`. The `_relations` data is already on every page returned by `queryDatabase()` when `resolveRelations()` has been called — but the Mermaid route calls `queryDatabase()` directly, bypassing `resolveRelations()`. Extracting raw relation IDs from the page's `properties` (without resolving them) is sufficient for `_relations` and avoids the extra Notion API cost.

**Primary recommendation:** Register a Handlebars helper `nodeId` at template load time in `templates.ts`. Rewrite `{{attr}}` → `{{nodeId "attr" attr}}` in the template body string before `Handlebars.compile()`. The helper computes `fnv1a(attributeName + value)` returning a 7-char base-36 string safe for Mermaid node IDs.

---

## Standard Stack

### Core (no new dependencies)

| Library | Already At | Purpose |
|---------|-----------|---------|
| `handlebars` | 4.x | Template compilation + helper registration |
| `d3` | ^7.9.0 | Zoom/pan behaviour — already installed |
| `mermaid` | installed (Phase 5) | SVG render |

No new npm installs required for any of the four features.

---

## Architecture Patterns

### Recommended Project Structure (no structural changes)

The four features touch:

```
server/utils/templates.ts          # Feature 1: helper registration + template body rewrite
server/routes/api/mermaid/[templateId].get.ts  # Feature 3: add _relations to allRows
composables/useMermaidTemplate.ts  # Feature 4: add initZoom() + D3 zoom; Feature 3: extend rows type
components/FilterPanel.vue         # Feature 2: remove max-height; Feature 3: show-related button
pages/visualizations/[sourceId].vue  # Feature 3: handle show-related event
```

---

## Feature 1: Node ID Auto-Generation (Handlebars)

### The Compile-Once Constraint

`templates.ts` calls `Handlebars.compile(body)` once at startup. The compiled `TemplateDelegate` is stored in `_templates`. At request time the route calls `template.compiled(context)` — no re-compilation happens. This means:

- Handlebars helpers must be registered before `loadTemplates()` is called.
- Post-processing the rendered string is viable but fragile (regex on Mermaid syntax).
- Pre-processing the template body string before `compile()` is the cleanest option.

### Recommended Approach: Body Rewrite + Helper

**Step 1 — Register a helper in `templates.ts` (at module top, before `loadTemplates`):**

```typescript
// Source: Handlebars docs — registerHelper signature
Handlebars.registerHelper('nodeId', function(attrName: string, value: string) {
  const id = stableId(attrName, value)
  // Mermaid rectangle node definition: id[label]
  // Escape brackets in value to avoid breaking Mermaid syntax
  const safeValue = String(value).replace(/[\[\]]/g, '')
  return new Handlebars.SafeString(`${id}["${safeValue}"]`)
})
```

**Step 2 — Rewrite template body before `Handlebars.compile(body)`:**

In `loadTemplates()`, after parsing frontmatter, before `Handlebars.compile`:

```typescript
// Replace bare {{attr}} with {{nodeId "attr" attr}}
// Only rewrite top-level bindings (not inside #each / #if expressions)
// Regex: {{  optional whitespace  word-chars  optional whitespace  }}
// Must NOT rewrite helpers like {{#each}}, {{/each}}, {{> partial}}, {{! comment}}
const rewrittenBody = body.replace(
  /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g,
  (_, name) => `{{nodeId "${name}" ${name}}}`
)
compiled = Handlebars.compile(rewrittenBody)
```

**Why not post-process the rendered string?** The rendered output is a Mermaid diagram string. Regex-patching Mermaid syntax is error-prone: edge labels, subgraph names, and quoted strings all contain patterns that look like node references. Rewriting at the template-body level is deterministic.

**Why not a Handlebars block helper?** Block helpers (`{{#nodeId}}`) require the template author to change their syntax. The goal is zero author awareness — `{{attr}}` just works.

### Hash Function: FNV-1a (Pure JS, No Crypto)

**Recommended implementation (pure JS, no dependencies):**

```typescript
function stableId(attrName: string, value: string): string {
  // FNV-1a 32-bit hash, base-36 encoded, 7-char fixed output
  // Input: attributeName + value (D-03)
  const input = attrName + '\x00' + value  // null separator prevents "ab"+"c" == "a"+"bc"
  let h = 0x811c9dc5  // FNV offset basis
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0  // FNV prime, keep 32-bit unsigned
  }
  return 'n' + h.toString(36).padStart(6, '0')  // 'n' prefix ensures valid Mermaid ID (can't start with digit)
}
```

Output: `n` + 6 base-36 chars = 7 chars total. Example: `na3x7q2`. Always starts with `n` so it is valid as a Mermaid node ID even if the hash digits start with a number. Base-36 uses `[0-9a-z]` — all Mermaid-safe.

**Collision probability:** FNV-1a 32-bit → 4.3B unique values. For typical template sizes (tens to hundreds of distinct attribute+value pairs), collision probability is negligible.

### Gotchas — Feature 1

1. **`#each` context variables**: Inside `{{#each sourceName}}`, Handlebars context variables are the row fields. The rewrite regex replaces `{{fieldName}}` → `{{nodeId "fieldName" fieldName}}`. Inside `#each`, `fieldName` resolves correctly from the loop context. This works.

2. **Handlebars built-in keywords**: The regex `([a-zA-Z_][a-zA-Z0-9_]*)` would match `else`, `this`, `@key` etc. Need to exclude Handlebars keywords. The regex already excludes `@key` (contains `@`) and `this`. `else` is only valid inside `{{else}}` which is typically `{{else}}` not a standalone `{{else}}`. Safe to exclude explicitly: add a keyword blocklist `['else', 'log']` or filter them in the replacement function.

3. **Quoted strings in Handlebars**: `{{nodeId "attr" attr}}` — the `"attr"` literal string is the attribute name. The `attr` variable is the value from context. If the Notion field value contains double quotes, `SafeString` must escape them. The `replace(/[\[\]"]/g, '')` approach is simpler than escaping.

4. **Mermaid node ID reuse across `#each` blocks (D-04)**: Because the hash is deterministic on `(attrName, value)`, the same value in two `#each` blocks produces the same Mermaid node ID. Mermaid ignores duplicate node definitions (second definition silently ignored). The first `id["label"]` definition wins. This is the intended merge behaviour.

5. **Template authors can still write raw Mermaid**: Lines that don't contain `{{...}}` are passed through unchanged. Authors can still hardcode `id1 --> id2` edges by referencing the hash-generated IDs — but the context document should note that raw IDs are fragile. The preferred pattern is to reference the node via a binding in the same template block.

---

## Feature 2: Filter Panel Full Height

### Exact CSS Constraint Location

**File:** `components/FilterPanel.vue`

**Grouped list (line 82):**
```html
<div v-if="hasParentGroups" class="space-y-2 overflow-y-auto" style="max-height: 20rem;">
```

**Flat list (line 116):**
```html
<div v-else class="space-y-1 overflow-y-auto" style="max-height: 20rem;">
```

Both have `style="max-height: 20rem;"` as an **inline style** (not a Tailwind class). This is the constraint to remove.

The outer panel div (line 4) is:
```html
<div class="w-72 p-4 bg-gray-50 border-l border-gray-200 overflow-y-auto flex-shrink-0" ...>
```

The outer panel already has `overflow-y-auto`. After removing the inner `max-height` caps, the inner lists will size naturally and the outer panel's own `overflow-y-auto` will handle scrolling when the panel exceeds the viewport. This is the correct behaviour.

**Fix:** Remove `style="max-height: 20rem;"` from both inner list divs. No other changes needed.

### Gotcha — Feature 2

The outer panel div has no explicit `height` or `max-height` set via Tailwind. It relies on being inside a flex container that constrains its height. The viz page layout is:

```html
<div class="flex gap-0">
  <div class="flex-1 min-w-0">...</div>  <!-- main viz column -->
  <FilterPanel ... />  <!-- w-72, flex-shrink-0 -->
</div>
```

The flex row does not set `h-screen` or `overflow: hidden`. This means after removing the inner cap, the panel will expand to its content height — which is what D-06 wants. If the panel becomes taller than the viewport, the page scroll (not the panel) will handle it. For full viewport height behaviour, the outer panel div itself may need `h-screen` or `max-h-screen` + `overflow-y-auto`. The CONTEXT.md says "spans full viewport height" — this may require adding `h-screen overflow-y-auto` to the outer panel div as well. **Recommended fix:** Remove inner `max-height` caps AND add `max-h-screen` to the outer panel div so it never exceeds the viewport.

---

## Feature 3: Related Nodes Filter

### resolvedRelations Structure (from relations.ts)

`resolveRelations()` returns `EnrichedPage[]` where each page has:

```typescript
interface EnrichedPage extends PageObjectResponse {
  resolvedRelations: Record<string, PageObjectResponse[]>
  // key = Notion property name (e.g. "Projects", "Assignees")
  // value = array of full PageObjectResponse objects for related pages
}
```

The key is the **Notion property name** (not the columnMappings role name). Example:
```
page.resolvedRelations["Projects"] = [{ id: "abc-123", properties: {...}, ... }]
```

To get the raw page IDs of related pages:
```typescript
// All relation target IDs across all relation properties
const relationIds = Object.values(page.resolvedRelations)
  .flat()
  .map(p => p.id)
```

### Critical: Mermaid Route Bypasses resolveRelations

The Mermaid route (`server/routes/api/mermaid/[templateId].get.ts`) calls `queryDatabase(source.databaseId)` directly. It does NOT call `resolveRelations()`. The pages returned by `queryDatabase()` are `PageObjectResponse[]` — they have `properties` but no `resolvedRelations` field.

**Two implementation options for extracting `_relations`:**

**Option A — Extract raw IDs from `page.properties` (recommended):**
For each page, scan the properties for any `relation`-type property and collect the target IDs:

```typescript
function extractRelationIds(page: PageObjectResponse): string[] {
  const ids: string[] = []
  for (const prop of Object.values(page.properties)) {
    if (prop.type === 'relation') {
      for (const rel of (prop as any).relation as Array<{ id: string }>) {
        ids.push(rel.id)
      }
    }
  }
  return ids
}
```

This is fast (no extra API calls), uses already-fetched data, and returns all 1-hop relation target IDs regardless of whether those pages are in configuredSources.

**Option B — Call `resolveRelations()` from the Mermaid route:**
This would resolve the related pages fully but adds Notion API calls (one per related page, each fetched via `retrievePage()` which IS LRU-cached). For the purpose of `_relations`, we only need IDs — Option A is sufficient and free.

**Recommendation: Option A.** The IDs in raw `relation` properties are the Notion page IDs (UUID format). The client uses these IDs to match against the `id` field in `mermaidDiagram.rows` — which is also the Notion page ID. The match works.

### Server Route Changes

In `server/routes/api/mermaid/[templateId].get.ts`:

1. Change `allRows` type to include `_relations`:
```typescript
const allRows: Array<{ id: string; title: string; sourceName: string; _relations: string[] }> = []
```

2. When building `allRows`, extract relation IDs:
```typescript
allRows.push({
  id: row['id'] ?? '',
  title: row['title'] ?? '',
  sourceName,
  _relations: extractRelationIds(page),  // page from the pages[] array, not mappedRows
})
```

Note: The current code maps `pages` to `mappedRows` (flat string values) and then iterates `mappedRows` to build `allRows`. The `page` object (with `properties`) must be kept accessible when building `allRows`. Currently the code uses `mappedRows` for iteration — the loop structure needs to be adjusted so the original `page` reference is still in scope.

### Client Type Extension

In `composables/useMermaidTemplate.ts`:

```typescript
// Update MermaidTemplateResponse
export interface MermaidTemplateResponse {
  templateId: string
  title: string
  diagramString: string
  rows: Array<{ id: string; title: string; sourceName: string; _relations: string[] }>
}
```

### FilterPanel Changes

The filter panel currently passes `mermaidFakePages` (fake EnrichedPage objects) to FilterPanel. The `_relations` data on rows needs to reach the FilterPanel. There are two ways:

**Option A — Extend `mermaidFakePages` with `resolvedRelations`:**
In `[sourceId].vue`, when building `mermaidFakePages`, populate `resolvedRelations` from `_relations`:

```typescript
const mermaidFakePages = computed<EnrichedPage[]>(() =>
  mermaidDiagram.rows.value.map((row) => ({
    id: row.id,
    properties: { ... },  // existing synthetic props
    resolvedRelations: {
      __mermaid_relations: row._relations.map(relId => ({ id: relId, properties: {} }))
    },
  })) as unknown as EnrichedPage[]
)
```

The FilterPanel doesn't directly use `resolvedRelations` for the "show related" button — the parent page `[sourceId].vue` handles the logic. The FilterPanel only needs to know which row's button was clicked.

**Option B — Add `_relations` as a separate prop to FilterPanel (recommended for Mermaid-specific UX):**
The "show related" button is a Mermaid-specific feature. Rather than forcing it through the EnrichedPage abstraction, add a `relationsMap?: Record<string, string[]>` prop to FilterPanel that the Mermaid view populates. FilterPanel renders the button only when this prop is present and the row's ID is in the map.

This avoids polluting the EnrichedPage fake objects with fabricated `resolvedRelations`.

### show-related Event and Handler

**FilterPanel emits:**
```typescript
'show-related': [pageId: string]
```

**[sourceId].vue handler:**
```typescript
const handleShowRelated = (pageId: string) => {
  const tmplId = activeMermaidTemplateId.value
  const allRows = mermaidDiagram.rows.value
  const targetRow = allRows.find(r => r.id === pageId)
  if (!targetRow) return

  // Compute visible set: selected node + 1-hop neighbours
  const visibleIds = new Set([pageId, ...(targetRow._relations ?? [])])
  // All other IDs become hidden
  const allIds = allRows.map(r => r.id)
  const hiddenIds = allIds.filter(id => !visibleIds.has(id))

  mermaidHiddenIdsMap.value = {
    ...mermaidHiddenIdsMap.value,
    [tmplId]: new Set(hiddenIds),
  }
}
```

Note: `targetRow._relations` contains Notion page IDs. Some of these IDs may not be present in `allRows` (if the related page is from a database not included in this template's sources). The `filter(id => !visibleIds.has(id))` step correctly handles this — unresolvable relation targets are never in `allRows` and thus never hidden or shown.

### "Show Related" Button Placement

The current node row markup in FilterPanel (flat list, lines 116–131):

```html
<label
  v-for="page in pages"
  :key="page.id"
  class="flex items-center gap-2 text-xs cursor-pointer"
>
  <input type="checkbox" ... />
  <span class="truncate text-gray-700">{{ getPageTitle(page) }}</span>
</label>
```

The `<label>` element wraps both the checkbox and the title text. A button inside a `<label>` causes the label's click to trigger the checkbox, which is correct for the label click but the button click also fires the label click. **This is a gotcha**: placing a button inside `<label>` causes double-trigger.

**Recommendation:** Restructure the row from a `<label>` wrapper to a `<div>` wrapper:

```html
<div
  v-for="page in pages"
  :key="page.id"
  class="flex items-center gap-2 text-xs cursor-pointer"
>
  <label class="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer">
    <input type="checkbox" :checked="..." @change="..." class="w-4 h-4 flex-shrink-0" />
    <span class="truncate text-gray-700">{{ getPageTitle(page) }}</span>
  </label>
  <!-- Show related button — only when relationsMap prop is present -->
  <button
    v-if="relationsMap && relationsMap[page.id] !== undefined"
    class="flex-shrink-0 p-0.5 text-gray-400 hover:text-blue-600"
    title="Show related"
    @click.stop="emit('show-related', page.id)"
  >
    <!-- SVG icon or Unicode: "⇌" or a small network icon -->
  </button>
</div>
```

The same restructuring applies to the grouped list's individual node rows (lines 99–112) for consistency.

### Gotchas — Feature 3

1. **Related IDs not in allRows**: Notion relation properties can link to pages in databases not included in the template's sources. These IDs appear in `_relations` but not in `mermaidDiagram.rows`. The handler must filter `hiddenIds` to only IDs that exist in `allRows` — otherwise the `mermaidHiddenIdsMap` could contain phantom IDs that never match any row.

2. **Reset behaviour**: D-10 says "clicking again or toggling a checkbox resets." The "toggle a checkbox" reset is implicit — `handleToggleNode` already mutates `mermaidHiddenIdsMap`. For "clicking again," the FilterPanel needs to track which node is the active "show related" target and toggle off. A `activeRelatedNodeId` ref in `[sourceId].vue` or inside the FilterPanel handles this.

3. **_relations always included**: The CONTEXT.md says "empty array is fine." Unconditionally including `_relations: []` for every row means the server doesn't need to know whether the template sources have relation-type columns. Simpler.

---

## Feature 4: D3 Zoom on Mermaid SVG

### The inject-via-innerHTML Problem

Mermaid renders by producing an SVG string via `mermaidInstance.render(renderId, diagramString)`. This string is then written into the container div:

```typescript
container.innerHTML = svg  // SVG is a string
```

After this write, the DOM contains an `<svg>` element as a direct child of `container`. This SVG element:
- Is NOT a Vue component SVG (no ref).
- Is NOT in Vue's virtual DOM — it was written imperatively.
- Has its own internal `<g>` grouping the diagram content.

The FlowDiagram.vue pattern uses a `ref="svgRef"` on a Vue-owned `<svg>` element, then calls `d3.select(svgRef.value)`. That pattern doesn't apply directly here.

### Adapted D3 Zoom Pattern for Mermaid

**Step 1 — After `container.innerHTML = svg`, get a reference to the injected SVG:**
```typescript
const svgEl = container.querySelector('svg') as SVGSVGElement | null
```

**Step 2 — The injected Mermaid SVG already has a wrapping `<g>` inside it (Mermaid always generates one).** D3 zoom works by applying a CSS transform to a `<g>` element. Mermaid's own `<g>` can be used directly — no extra wrapper needed.

**Step 3 — Apply D3 zoom to the `<svg>` element:**
```typescript
const d3 = (window as any).d3 ?? await import('d3')
if (!(window as any).d3) (window as any).d3 = d3

const innerG = svgEl.querySelector('g') as SVGGElement | null
if (!innerG) return

zoomBehavior = d3.zoom()
  .scaleExtent([0.1, 5])
  .filter((event: any) => event.type !== 'wheel' || event.ctrlKey || event.metaKey)
  .on('zoom', (event: any) => {
    innerG.setAttribute('transform', event.transform.toString())
  })

d3.select(svgEl).call(zoomBehavior).on('dblclick.zoom', null)
```

**Important:** Unlike FlowDiagram.vue which uses a Vue reactive `zoomTransform` ref bound to `<g :transform="...">`, here the `<g>` is a real DOM element set via `innerHTML` — the transform must be applied imperatively via `setAttribute`. A Vue reactive ref cannot bind to an imperatively-injected DOM element.

### Fit-to-Content on Load (D-14)

After the SVG is rendered and zoom is initialized, compute a translate+scale that fits the diagram into the container:

```typescript
function fitMermaidToContent(svgEl: SVGSVGElement, innerG: SVGGElement, zoomBehavior: any, d3: any) {
  const containerRect = svgEl.getBoundingClientRect()
  const contentRect = innerG.getBBox()  // bounding box of diagram content

  if (contentRect.width === 0 || contentRect.height === 0) return

  const scaleX = containerRect.width / (contentRect.width + 40)   // 20px padding each side
  const scaleY = containerRect.height / (contentRect.height + 40)
  const scale = Math.min(scaleX, scaleY, 1)  // cap at 1 to avoid over-zoom on small diagrams

  const tx = (containerRect.width - contentRect.width * scale) / 2 - contentRect.x * scale
  const ty = (containerRect.height - contentRect.height * scale) / 2 - contentRect.y * scale

  const initialTransform = d3.zoomIdentity.translate(tx, ty).scale(scale)
  d3.select(svgEl).call(zoomBehavior.transform, initialTransform)
  innerG.setAttribute('transform', initialTransform.toString())
}
```

**Note:** `getBBox()` requires the SVG to be in the DOM and rendered. Call this after `await nextTick()` following `container.innerHTML = svg`.

### Where to Put the Zoom Logic

Currently `renderDiagram()` in `useMermaidTemplate.ts` writes the SVG. Post-render zoom init belongs there or in a dedicated `initMermaidZoom()` function called from `renderDiagram()`. The composable should expose a ref to the current `zoomBehavior` and a `resetZoom()` function.

**The SVG container element in [sourceId].vue:**
```html
<div v-else class="p-6 bg-white rounded border border-gray-200 min-h-96">
  <div :id="mermaidDiagram.containerId.value" style="display: flex; justify-content: center;"></div>
</div>
```

The inner `display: flex; justify-content: center;` will center the SVG horizontally. **Gotcha:** After zoom init, the `<svg>` element has D3-controlled dimensions. Mermaid sets width/height on the SVG — these may be `100%` or a fixed pixel value. For zoom to work correctly with fit-to-content, set `width="100%"` and `height="100%"` on the SVG after injection, and set an explicit pixel height on the container div (e.g., `style="height: 70vh"`). Otherwise `getBBox()` may return zero dimensions.

### Cleanup

On component unmount, remove zoom listener:
```typescript
onBeforeUnmount(() => {
  if (currentSvgEl && d3Module) d3Module.select(currentSvgEl).on('.zoom', null)
})
```

The SVG is re-created on each `renderDiagram()` call (via `innerHTML`), so the previous zoom binding is discarded automatically. The `onBeforeUnmount` guard handles the case where the component is destroyed while a zoom is active.

### FlowDiagram.vue Comparison

| Aspect | FlowDiagram.vue | Mermaid zoom |
|--------|----------------|--------------|
| SVG origin | Vue component template | Injected via innerHTML |
| G element | Vue-managed `<g :transform="zoomTransform">` | Mermaid-generated `<g>` via setAttribute |
| D3 target | `svgRef` (Vue ref) | `container.querySelector('svg')` |
| Fit-to-content | Not present (fixed padding layout) | Required — Mermaid SVG has its own coordinate space |
| Zoom hint text | "⌃ Ctrl + scroll to zoom · drag to pan" | Same text, same placement |

FlowDiagram.vue does NOT have a reset-zoom button. Per Claude's Discretion, omit it from Mermaid zoom as well.

### Gotchas — Feature 4

1. **Mermaid SVG viewBox**: Mermaid-generated SVGs have a `viewBox` attribute and usually a `width`/`height` set to match the content. D3 zoom ignores viewBox — it operates in the SVG coordinate space. Setting `width="100%"` on the SVG after injection ensures the SVG fills its container; keep `height` either auto-sized or use a percentage of viewport.

2. **Re-render clears zoom state**: Each call to `renderDiagram()` replaces `container.innerHTML`. This destroys the old SVG and the D3 zoom binding. The zoom init must run fresh after each render. This is correct behaviour (fit-to-content on every re-render).

3. **hiddenIds re-fetches trigger re-render**: When the user checks/unchecks nodes, `useMermaidTemplate` re-fetches the server route, which triggers `renderDiagram()`, which calls `initMermaidZoom()` again. The diagram re-fits to content. This is fine — it's a complete re-render, not a DOM patch.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hash function | Custom MD5/SHA | FNV-1a pure JS (inline) | No crypto dependency; 32-bit is enough for template scale |
| Zoom/pan | Manual wheel + mouse event listeners | D3 zoom (already installed) | Handles pinch, momentum, transform math, event filtering |
| SVG transform math | Custom scale+translate | `d3.zoomIdentity.translate().scale()` | D3 transform object handles compose correctly |

---

## Common Pitfalls

### Pitfall 1: Button Inside Label Causes Double Checkbox Toggle
**What goes wrong:** Placing `<button>` inside `<label>` — clicking the button also fires the label's click, toggling the checkbox.
**Why it happens:** `<label>` forwards clicks to its associated input. Buttons inside a label are within the label's click target.
**How to avoid:** Restructure the row from a `<label>` wrapper to a `<div>` wrapper. Move the `<label>` to wrap only the checkbox + text span.

### Pitfall 2: Handlebars Keyword Tokens Get Rewritten
**What goes wrong:** The regex `{{else}}` or `{{this}}` gets rewritten to `{{nodeId "else" else}}`.
**Why it happens:** `else` and `this` match `[a-zA-Z_][a-zA-Z0-9_]*`.
**How to avoid:** Add a blocklist in the rewrite function: `const HB_KEYWORDS = new Set(['else', 'this', 'log', '@key', '@index', '@first', '@last'])`. Skip rewriting if the matched name is in the blocklist.

### Pitfall 3: `getBBox()` Returns Zero on Hidden Elements
**What goes wrong:** `svgEl.getBBox()` returns `{width:0, height:0}` and fit-to-content calculation produces NaN/Infinity.
**Why it happens:** `getBBox()` returns zero on elements not yet painted or when the SVG is hidden (`display:none`).
**How to avoid:** Guard with `if (contentRect.width === 0 || contentRect.height === 0) return`. The container must not have `display:none` when `getBBox()` is called.

### Pitfall 4: Mermaid SVG Width="100%" Breaks fit-to-content
**What goes wrong:** `svgEl.getBoundingClientRect()` returns zero width because the SVG inherits `0px` from its unmeasured container.
**Why it happens:** The container div doesn't have explicit dimensions; flex layout hasn't resolved yet at the time `getBBox()` runs.
**How to avoid:** Set an explicit pixel height on the container div (e.g., `style="height: 60vh; width: 100%"`), or call `fitToContent` in a `requestAnimationFrame` callback after `nextTick()`.

### Pitfall 5: allRows Loop Doesn't Have Original Page Reference
**What goes wrong:** Cannot call `extractRelationIds(page)` when building `allRows` because the loop variable is `row` (a mapped flat object), not the original `page`.
**Why it happens:** Current code iterates `mappedRows` to build `allRows`. The original `pages` array is out of scope at that point.
**How to avoid:** Use `pages.forEach((page, i) => { ...; allRows.push({ ..., _relations: extractRelationIds(page) }) })` instead of iterating `mappedRows`. Or zip `pages` and `mappedRows` by index.

---

## Code Examples

### FNV-1a Hash (Feature 1)
```typescript
// Stable node ID: FNV-1a 32-bit, base-36, 7 chars, always starts with 'n'
function stableId(attrName: string, value: string): string {
  const input = attrName + '\x00' + String(value)
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return 'n' + h.toString(36).padStart(6, '0')
}
```

### Handlebars Body Rewrite (Feature 1)
```typescript
const HB_KEYWORDS = new Set(['else', 'this', 'log'])
const rewrittenBody = body.replace(
  /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g,
  (match, name) => HB_KEYWORDS.has(name) ? match : `{{nodeId "${name}" ${name}}}`
)
```

### extractRelationIds (Feature 3)
```typescript
function extractRelationIds(page: PageObjectResponse): string[] {
  const ids: string[] = []
  for (const prop of Object.values(page.properties)) {
    if (prop.type === 'relation') {
      for (const rel of (prop as any).relation as Array<{ id: string }>) {
        ids.push(rel.id)
      }
    }
  }
  return ids
}
```

### D3 Zoom Init for Injected SVG (Feature 4)
```typescript
async function initMermaidZoom(containerId: string): Promise<void> {
  const container = document.getElementById(containerId)
  if (!container) return
  const svgEl = container.querySelector('svg') as SVGSVGElement | null
  if (!svgEl) return
  const innerG = svgEl.querySelector('g') as SVGGElement | null
  if (!innerG) return

  if (!d3Module) {
    d3Module = (window as any).d3 ?? await import('d3')
    if (!(window as any).d3) (window as any).d3 = d3Module
  }

  // Set SVG dimensions for proper bounding box calculation
  svgEl.setAttribute('width', '100%')

  zoomBehavior = d3Module.zoom()
    .scaleExtent([0.1, 5])
    .filter((event: any) => event.type !== 'wheel' || event.ctrlKey || event.metaKey)
    .on('zoom', (event: any) => {
      innerG.setAttribute('transform', event.transform.toString())
    })

  d3Module.select(svgEl).call(zoomBehavior).on('dblclick.zoom', null)

  // Fit to content
  await nextTick()
  const containerRect = svgEl.getBoundingClientRect()
  const contentRect = innerG.getBBox()
  if (contentRect.width > 0 && containerRect.width > 0) {
    const scale = Math.min(
      containerRect.width / (contentRect.width + 40),
      containerRect.height / (contentRect.height + 40),
      1
    )
    const tx = (containerRect.width - contentRect.width * scale) / 2 - contentRect.x * scale
    const ty = Math.max(10, (containerRect.height - contentRect.height * scale) / 2 - contentRect.y * scale)
    const t = d3Module.zoomIdentity.translate(tx, ty).scale(scale)
    d3Module.select(svgEl).call(zoomBehavior.transform, t)
    innerG.setAttribute('transform', t.toString())
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mermaid 9: `mermaid.render()` modifies existing element | Mermaid 10+: produces SVG string, removes element with renderId | Mermaid 10 | Why `renderDiagram` uses ephemeral `renderId` not the container ID — already handled in Phase 5 |
| D3 zoom on static SVG | D3 zoom on innerHTML-injected SVG | Phase 6 (new) | Transform must be applied imperatively via `setAttribute`, not via Vue reactive ref |

---

## Open Questions

1. **Mermaid SVG container height**
   - What we know: Current container is `<div class="p-6 bg-white rounded border border-gray-200 min-h-96">` with an inner flex div.
   - What's unclear: Whether `min-h-96` (24rem = 384px) is sufficient for fit-to-content to work on large diagrams, or whether a `height: 60vh` explicit container is needed.
   - Recommendation: Set `style="height: 60vh; overflow: hidden; position: relative"` on the outer container div (same as FlowDiagram's `.flow-canvas` which has `max-height: 70vh`).

2. **Show-related reset trigger**
   - What we know: D-10 says "clicking again or toggling a checkbox resets."
   - What's unclear: Whether "clicking again" means re-clicking the same button (toggle off), or clicking any other button/checkbox.
   - Recommendation: Track `activeRelatedNodeId` in `[sourceId].vue`. If the same button is clicked while already active, call `handleSetNodesVisible(allIds, true)` to restore all visible. Any checkbox toggle via `handleToggleNode` already mutates `mermaidHiddenIdsMap` so it implicitly breaks the related-filter state.

3. **Handlebars `@key` and `@index` in templates**
   - What we know: Some Handlebars templates use `@key` and `@index` inside `#each` blocks.
   - What's unclear: Whether the rewrite regex would match them (it won't — `@` is not in `[a-zA-Z_]`).
   - Recommendation: Confirmed safe — the regex only matches word characters, not `@`-prefixed Handlebars variables.

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)
- `components/FilterPanel.vue` — inline style `max-height: 20rem` confirmed at lines 82 and 116
- `server/utils/templates.ts` — compile-once pattern confirmed; `Handlebars.compile(body)` at startup
- `server/routes/api/mermaid/[templateId].get.ts` — `queryDatabase()` called directly (no `resolveRelations`)
- `server/utils/relations.ts` — `EnrichedPage.resolvedRelations` shape confirmed: `Record<string, PageObjectResponse[]>` keyed by Notion property name
- `server/utils/notion.ts` — `queryDatabase()` returns `PageObjectResponse[]` with raw `properties`
- `composables/useMermaidTemplate.ts` — inject-via-innerHTML pattern confirmed; `container.innerHTML = svg`
- `components/FlowDiagram.vue` — D3 zoom pattern confirmed: `d3Module.zoom()`, `filter()` for Ctrl+scroll, `on('zoom', ...)`, `zoomBehavior.transform` for fit

### Secondary (MEDIUM confidence)
- FNV-1a algorithm: well-known hash function, pure JS implementation is standard
- Handlebars helper registration: `Handlebars.registerHelper()` is the documented API; SafeString prevents double-escaping

---

## Metadata

**Confidence breakdown:**
- Feature 1 (Handlebars node IDs): HIGH — code path fully read; pattern is standard Handlebars
- Feature 2 (FilterPanel height): HIGH — exact lines identified from source
- Feature 3 (_relations extraction): HIGH — `relations.ts` structure fully confirmed; raw property IDs confirmed present in `page.properties`
- Feature 4 (D3 zoom): HIGH — FlowDiagram.vue pattern fully read; innerHTML difference documented with adaptation

**Research date:** 2026-06-12
**Valid until:** 2026-07-12 (30 days — stable codebase, no external API changes)
