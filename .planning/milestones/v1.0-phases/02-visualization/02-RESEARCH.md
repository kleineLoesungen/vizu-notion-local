# Phase 2: Visualization - Research

**Researched:** 2026-06-02
**Domain:** Data visualization component layer (metro maps, process flows)
**Confidence:** HIGH

## Summary

Phase 2 implements the visualization rendering layer that consumes the Phase 1 API and renders Notion data as interactive metro-style maps (Metroviz) and process flow diagrams (Vue Flow). The two visualization libraries have fundamentally different data models and APIs:

- **Metroviz** is a standalone vanilla JavaScript library that expects a structured JSON format with zones, lines, and stations positioned on a timeline (X-axis = time, Y-axis = zones/lines). It requires vanilla JS initialization and DOM manipulation, but Notion's hierarchical role-based data (date, parent, next, tag) maps naturally to its concepts.
- **Vue Flow** is a Vue 3 component framework for node-edge graphs, requiring only the `next` role to function. It uses composables for state management and is fully reactive.

TailwindCSS v4 is not yet installed and requires a new Vite plugin setup (not the older @nuxtjs/tailwindcss module). Metroviz must be vendored locally since no npm package exists. The phase does **not** include the interactive UI shell (source switcher, filters, URL state) — those are Phase 3.

**Primary recommendation:** Start with the metro map (VIZ-01) as it's the primary use case; implement process flow (VIZ-02) after metro functionality is confirmed working. Focus on data transformation from Notion's role-based model to each library's expected format rather than library customization.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Vendor Metroviz locally into `/vendor/metroviz/` — copy from github.com/rstockm/Metroviz. No npm package exists; vendoring keeps Docker builds fully offline and gives control over patches.
- **D-02:** Trim Metroviz to v1 must-haves only — wrap only what's needed for stations, lines, zones, and global events. Skip themes, zoom controls, and other features not required for Phase 2.
- **D-03:** Integrate Metroviz via Vue wrapper component using `onMounted` / `useTemplateRef`. Metroviz is vanilla JS with SVG output — no Vue reactivity. Data changes trigger re-initialization, not reactive updates.
- **D-04:** A source is **metro map eligible** if its `columnMappings` contains both `date` AND `next` roles (minimum).
- **D-05:** A source is **flow eligible** if its `columnMappings` contains `next` (minimum).
- **D-06:** A source with both `date` + `next` is eligible for **both** viz types — user can switch freely between them.
- **D-07:** Any source with `title` + `date` roles (regardless of other roles) can be used as a **global events overlay** on a metro map — rendered as vertical timeline markers spanning all lines.
- **D-08:** Detection is permissive, not a hard gate. Sources missing optional roles render in a degraded/simpler mode rather than being blocked.
- **D-09:** `date` role → positions a station on the X-axis timeline.
- **D-10:** `next` role → defines sequential connections between stations along a line.
- **D-11:** `parent` role (optional) → organizes stations into hierarchy lines. Items with the same parent share a line.
- **D-12:** `tag` role (optional) → groups lines into Metroviz zones (horizontal bands). If absent, all lines go into a single default zone.
- **D-13:** Station label = `title` role value only. Clean, readable even with many stations.
- **D-14:** Use `@vue-flow/core` for process flow visualization. User confirmed Vue Flow; no simpler alternative needed.
- **D-15:** Flow viz requires only `next` role (minimum). `next` defines the edges between nodes. No date positioning needed.
- **D-16:** Process flow is not the primary use case for Phase 2 — implement after metro map is working.

### Claude's Discretion

- TailwindCSS installation and configuration
- Vue component file structure (pages, components, composables)
- Exact Metroviz JSON data format transformation (adapt to whatever the vendored library's API requires)
- Loading states, error states, empty states
- Responsive layout within the visualization canvas

### Deferred Ideas (OUT OF SCOPE)

- **Timeline visualization (Gantt-style)** — User noted metro map X-axis is a timeline. A dedicated Gantt/timeline view is VIZ-04 in v2 requirements. Not in scope for Phase 2.
- **Cross-source global events in UI** — The data model supports it (any source with `title` + `date` can overlay), but the UI to select which source to use as global events belongs in Phase 3 (source switcher / viz controls).
- **Process flow before/after sequencing at sub-goal level** — Mentioned during discussion. Vue Flow handles this via the `next` role, but the UI controls for switching between flow and metro are Phase 3.

## Phase Requirements

| ID | Description | Research Support |
|---|---|---|
| VIZ-01 | Metro map visualization (Metroviz) renders hierarchical Notion data as a metro-line style diagram | Metroviz library structure, data model (zones/lines/stations), and Notion-to-Metroviz transformation rules documented. Integration via Vue wrapper component supported via onMounted/useTemplateRef. |
| VIZ-02 | Process flow visualization (Vue Flow) renders sequential/workflow Notion data as a node-edge flow diagram | Vue Flow composables (useVueFlow, useNodeConnections) and node/edge data structures documented. Mapping `next` role to edges, generating node positions. |
| VIZ-03 | Available visualization types for a given source are derived from config data type mappings — user selects from valid options only | Role detection logic (D-04 through D-08) documented. API already surfaces availableRoles in /api/sources/[id] response. No additional role detection code needed in Phase 2. |

## Standard Stack

### Core Visualization Libraries
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Metroviz | Latest (github.com/rstockm/Metroviz) | Metro-map style hierarchy visualization | User-specified; de facto standard for tech roadmap timelines; niche library requires vendoring |
| @vue-flow/core | ^1.48+ | Process flow / flowchart visualization | Official Vue 3 flow library; native Composition API; strong community |

### Supporting Stack
| Library | Version | Purpose | Installation |
|---------|---------|---------|--------------|
| @tailwindcss/vite | ^4.x | CSS utility framework, required for v4 plugin setup | `npm install --save-dev @tailwindcss/vite` + vite plugin config |
| TailwindCSS | ^4.x | Core styling utilities | Installed as peer dep of @tailwindcss/vite |

**Version verification (npm registry):**
- @vue-flow/core: Latest 1.48.2 (4 months ago per WebSearch result) — production-ready
- TailwindCSS v4: Active, Rust-based Oxide engine, 5-100x faster than v3
- Metroviz: github.com/rstockm/Metroviz master branch (no version tags, treat as development library)

### Installation

```bash
# Core visualization
npm install @vue-flow/core

# Styling
npm install --save-dev @tailwindcss/vite tailwindcss
```

**Note:** Metroviz has no npm package — must be vendored. Phase 0/Wave 0 task.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Metroviz (vendored) | npm metroviz package (if existed) | No official package; community forks like bartromgens/metroflow are different projects (HTML canvas, not SVG/D3) |
| Vue Flow | React Flow | Would require Nuxt headless mode; defeats Vue 3 choice |
| Vue Flow | Cytoscape.js or Graphology | Lower-level, require more custom node/edge rendering; Vue Flow is more purpose-built for interactive flows |
| TailwindCSS v4 @tailwindcss/vite | @nuxtjs/tailwindcss module | v4 Vite plugin is the canonical Tailwind approach; @nuxtjs/tailwindcss is v3 / older pattern |

## Architecture Patterns

### Recommended Project Structure

```
pages/
├── index.vue              # Entry page — lists sources, allows viz selection
└── sources/
    └── [id].vue          # Visualization page for a single source (metro map or flow)

components/
├── MetrovizMap.vue        # Metro map wrapper (vanilla JS initialization)
├── FlowDiagram.vue        # Vue Flow process flow wrapper
├── VisualizationLayout.vue # Shared layout (loading, error, empty states)
└── (Phase 3: UI controls — source switcher, viz selector, filters)

composables/
├── useSourceData.ts       # Fetches /api/sources/[id], transforms to viz-specific shapes
├── useMetrovizData.ts     # Transforms EnrichedPage[] to Metroviz zones/lines/stations
└── useFlowData.ts         # Transforms EnrichedPage[] to Vue Flow nodes/edges

assets/
├── css/
│   └── main.css          # TailwindCSS @import; Metroviz SVG overrides
└── fonts/
    └── (optional)

vendor/
└── metroviz/              # Local copy of rstockm/Metroviz (ES6 modules, no bundling)
    ├── index.js           # Entry point
    ├── metroviz.js        # Core library
    ├── styles.css         # Metroviz default styles (to be overridden)
    └── ...
```

### Pattern 1: Metroviz Vanilla JS Integration via Vue Wrapper

**What:** Metroviz is a standalone vanilla ES6 module library. It exposes a constructor that accepts a target DOM element and configuration JSON. No Vue reactivity — changes trigger full re-initialization.

**When to use:** When rendering metro maps from hierarchical Notion data with time-based positioning.

**Example:**

```typescript
// components/MetrovizMap.vue
<template>
  <div ref="container" class="metroviz-canvas"></div>
</template>

<script setup lang="ts">
import { useTemplateRef, onMounted } from 'vue'
import Metroviz from '@/vendor/metroviz/index.js'

const props = defineProps<{
  data: MetrovizData  // zones, lines, stations, globalEvents
}>()

const container = useTemplateRef<HTMLDivElement>('container')
let metrovizInstance: Metroviz | null = null

onMounted(() => {
  if (container.value) {
    // Metroviz constructor: new Metroviz(element, config)
    metrovizInstance = new Metroviz(container.value, {
      title: props.data.title,
      timeline: props.data.timeline,  // { start, end }
      zones: props.data.zones,
      lines: props.data.lines,
      globalEvents: props.data.globalEvents,
    })
  }
})

// Watch for data changes — re-initialize (D-03)
watch(
  () => props.data,
  (newData) => {
    if (metrovizInstance && container.value) {
      // Destroy and re-create
      container.value.innerHTML = ''
      metrovizInstance = new Metroviz(container.value, {
        title: newData.title,
        timeline: newData.timeline,
        zones: newData.zones,
        lines: newData.lines,
        globalEvents: newData.globalEvents,
      })
    }
  }
)
</script>

<style scoped>
.metroviz-canvas {
  width: 100%;
  height: 600px;
  border: 1px solid #e5e7eb;
}
</style>
```

**Source:** Decision D-03 from CONTEXT.md; Vue 3.5 useTemplateRef pattern from [Vue.js Docs](https://vuejs.org/guide/essentials/template-refs/); onMounted lifecycle from [Vue.js Composition API](https://vuejs.org/api/composition-api-lifecycle.html)

### Pattern 2: Vue Flow Reactive Node-Edge Graph

**What:** Vue Flow provides a composable-based state management system. Nodes and edges are reactive refs. The `useVueFlow()` composable gives access to graph state, methods to add/remove nodes/edges, and lifecycle hooks.

**When to use:** When rendering process flow diagrams where edges represent sequential steps (via `next` role).

**Example:**

```typescript
// components/FlowDiagram.vue
<template>
  <VueFlow class="flow-canvas">
    <Background />
    <Controls />
  </VueFlow>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { VueFlow, useVueFlow, Background, Controls } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'

const props = defineProps<{
  nodes: Array<{ id: string; data: { label: string }; position: { x: number; y: number } }>
  edges: Array<{ id: string; source: string; target: string }>
}>()

const { setNodes, setEdges } = useVueFlow()

onMounted(() => {
  setNodes(props.nodes)
  setEdges(props.edges)
})

watch(
  () => ({ nodes: props.nodes, edges: props.edges }),
  ({ nodes, edges }) => {
    setNodes(nodes)
    setEdges(edges)
  }
)
</script>

<style scoped>
.flow-canvas {
  width: 100%;
  height: 600px;
  background: white;
  border: 1px solid #e5e7eb;
}
</style>
```

**Source:** [Vue Flow Composables Docs](https://vueflow.dev/guide/composables.html); useVueFlow pattern from [Vue Flow Getting Started](https://vueflow.dev/guide/getting-started.html)

### Pattern 3: Data Transformation Composables

**What:** Notion's role-based data model (columnMappings) must be transformed into library-specific shapes. Composables handle this mapping and return viz-ready structures.

**When to use:** For decoupling data fetching from visualization. Composables consume EnrichedPage[] from API, output Metroviz or Vue Flow config.

**Example: Metroviz Transformation**

```typescript
// composables/useMetrovizData.ts
import type { EnrichedPage } from '@/server/utils/relations'
import type { ColumnMappings } from '@/server/utils/config'

interface MetrovizData {
  title: string
  timeline: { start: string; end: string }
  zones: Array<{ id: string; name: string }>
  lines: Array<{ id: string; name: string; zoneId: string; color: string }>
  stations: Array<{ id: string; lineId: string; date: string; type: string; title: string }>
}

export function useMetrovizData(
  pages: EnrichedPage[],
  columnMappings: ColumnMappings
): MetrovizData {
  // D-09: Extract dates for X-axis timeline
  const dates = pages
    .map(p => p.properties[columnMappings.date]?.formula?.string)
    .filter(Boolean)
    .sort()

  const timeline = {
    start: dates[0] || '2026-Q1',
    end: dates[dates.length - 1] || '2026-Q4',
  }

  // D-12: Group by tag role → zones; group by parent → lines
  const zones = new Map<string, { id: string; name: string }>()
  const lines = new Map<string, { id: string; name: string; zoneId: string; color: string }>()
  const stations: MetrovizData['stations'] = []

  for (const page of pages) {
    const tag = page.properties[columnMappings.tag]?.select?.name || 'Default'
    const parentId = /* extract from resolvedRelations or parent */ ''
    const title = page.properties[columnMappings.title]?.title?.[0]?.plain_text || 'Untitled'
    const date = page.properties[columnMappings.date]?.formula?.string || ''

    // Ensure zone exists
    if (!zones.has(tag)) {
      zones.set(tag, { id: tag, name: tag })
    }

    // Ensure line exists for parent
    const lineId = parentId || 'default-line'
    if (!lines.has(lineId)) {
      lines.set(lineId, {
        id: lineId,
        name: 'Line ' + lineId.slice(0, 8),
        zoneId: tag,
        color: generateColorForLine(lineId),
      })
    }

    // Add station
    stations.push({
      id: page.id,
      lineId,
      date,
      type: 'Milestone',
      title,
    })
  }

  return {
    title: 'Roadmap',
    timeline,
    zones: Array.from(zones.values()),
    lines: Array.from(lines.values()),
    stations,
  }
}
```

**Source:** Phase 1 API response structure (EnrichedPage, ColumnMappings); Metroviz data model from [rstockm/Metroviz](https://github.com/rstockm/Metroviz)

### Anti-Patterns to Avoid

- **Attempting to make Metroviz reactive via Vue:** Metroviz is vanilla JS and doesn't integrate with Vue's reactivity system. Do NOT try to mutate Metroviz-managed DOM directly; instead, re-initialize the library when data changes (D-03).
- **Hardcoding role names in transformation logic:** Column mappings are user-defined. Use `columnMappings` dict to look up property names, never assume fixed Notion column names like "Status" or "Timeline".
- **Fetching Notion data in the visualization component:** Data fetching belongs in composables or server-side. Visualization components should be pure — accept data as props, render it.
- **Storing Notion data in Pinia or global state:** Server routes and composables are sufficient. Avoid adding a frontend state management layer unless truly necessary (Phase 3 may add it for filters/selections).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|------------|-------------|-----|
| Timeline positioning & automatic routing | Custom SVG path generator for timeline graphs | Metroviz (already handles D3.js routing, label collision avoidance) | Metro maps require sophisticated collision detection, D3.js integration, and responsive scaling — months of work |
| Node-edge graph rendering & interaction | Custom canvas/SVG node-edge layer with drag/select | Vue Flow (@vue-flow/core) | Vue Flow includes zoom, pan, selection, mini-map, and comprehensive state management out of box |
| Notion role-to-visualization detection | Hardcoded if/else chains for each role combo | Composable with ColumnMappings dict lookup | Roles are user-defined; a single transformation function is maintainable; hardcoding breaks when config changes |
| CSS framework utilities | Hand-written utility classes or component library | TailwindCSS | Reduces CSS file size by 90%+ via PurgeCSS; utility-first pairs naturally with Vue components |

**Key insight:** Both Metroviz and Vue Flow are opinionated libraries that handle complex visualizations. Attempting to build custom alternatives (custom D3 routes, custom canvas rendering) introduces months of debugging, accessibility issues, and browser compatibility headaches. These libraries exist because the problem is harder than it appears.

## Common Pitfalls

### Pitfall 1: Metroviz Initialization Timing with DOM Not Ready

**What goes wrong:** Attempting to initialize Metroviz in `<script>` or `setup()` before the DOM ref is available. Metroviz constructor requires a real DOM element — passing undefined/null crashes silently or renders blank.

**Why it happens:** Vue's onMounted lifecycle is an afterthought for developers coming from vanilla JS. Easy to assume setup() runs after mount.

**How to avoid:** **Always** initialize Metroviz in `onMounted()` hook or with `watch(() => container.value)` guard. Never initialize in setup(); wait for `container.value` to be non-null.

**Warning signs:** White/blank canvas even after data prop updates. Check browser console for "Cannot read property 'appendChild' of null" errors.

### Pitfall 2: Metroviz Does NOT Integrate with Vue Reactivity

**What goes wrong:** Updating `props.data` expects the visualization to re-render automatically. Instead, the Metroviz SVG is stale; changes are invisible.

**Why it happens:** Metroviz is a standalone library. It doesn't expose a Vue composable or reactive API. Once initialized, it owns the DOM — Vue can't patch it.

**How to avoid:** When data changes (via watch), **destroy and re-create** the Metroviz instance. Clear the container's innerHTML, then call the constructor again (D-03). This is not inefficient for Phase 2 (user interactions are Phase 3); data updates are typically user-triggered refreshes.

**Warning signs:** Vue DevTools shows data updated, but diagram unchanged. Check if watch() triggers on data changes; verify container.innerHTML is cleared before re-init.

### Pitfall 3: Role Detection Treats Missing Roles as Errors

**What goes wrong:** Source with only `title` + `next` (no `date`) is rejected as "not metro-eligible." User expects a degraded flow rendering instead.

**How to avoid:** Detection is **permissive** (D-08). Missing optional roles should not block rendering; instead, degrade gracefully. Example: metro map without `parent` role treats all stations as a single line. Flow without `date` positions nodes horizontally, not on timeline.

**Warning signs:** Blank page or error toast for sources with incomplete role sets. Check that VIZ-03 detection logic allows optional roles to be missing.

### Pitfall 4: Confusing Metroviz "Zone" with Vue Component Scope

**What goes wrong:** Thinking "zone" is a Vue component that can be conditionally rendered or passed as a slot. Zones are data objects in Metroviz JSON — they don't have lifecycle or reactivity.

**How to avoid:** Metroviz config is entirely data-driven. Zones, lines, and stations are all passive JSON objects passed to the constructor. Don't try to wrap them as Vue components.

**Warning signs:** Attempting to use `v-if` or `v-for` inside the Metroviz SVG. This won't work; all rendering happens in Metroviz's constructor.

### Pitfall 5: Vue Flow Nodes Without Unique Position Coordinates

**What goes wrong:** Passing Vue Flow nodes without `position: { x, y }`. Nodes stack on top of each other or render off-screen.

**How to avoid:** Every node MUST have x, y coordinates. The transformation composable must generate these (e.g., based on `next` chain order). Vue Flow's auto-layout is available but requires additional config.

**Warning signs:** All nodes clustered at origin (0,0) or invisible. Check browser console for Vue Flow warnings.

### Pitfall 6: Notion Pagination Silently Truncates Large Databases

**What goes wrong:** Querying a Notion database with >100 items returns only first 100. Phase 1 API handles pagination, but if visualization code directly calls queryDatabase, pagination is missed.

**How to avoid:** **Always** fetch data via Phase 1 API (`/api/sources/[id]`), never directly call Notion SDK. Phase 1 handles pagination, relation resolution, and caching. Visualization layer consumes the enriched result.

**Warning signs:** Visualization renders incomplete data (missing stations or nodes). Cross-check item count in visualization vs. actual Notion database.

## Code Examples

Verified patterns from official sources:

### Metroviz Initialization Pattern

```javascript
// Source: Decision D-03, pattern from github.com/rstockm/Metroviz
import Metroviz from '@/vendor/metroviz/index.js'

const element = document.querySelector('#metroviz-container')
const instance = new Metroviz(element, {
  title: 'Technology Roadmap',
  timeline: {
    start: '2026-Q1',
    end: '2026-Q4'
  },
  zones: [
    { id: 'backend', name: 'Backend Services' }
  ],
  lines: [
    { id: 'line-1', name: 'API Layer', zoneId: 'backend', color: '#FF6B6B' }
  ],
  stations: [
    { id: 'station-1', lineId: 'line-1', date: '2026-Q1', type: 'Start', title: 'Project Kickoff' }
  ],
  globalEvents: [
    { date: '2026-Q2', title: 'Release v1.0' }
  ]
})
```

### Vue Flow Nodes and Edges Pattern

```typescript
// Source: https://vueflow.dev/guide/getting-started.html
import { useVueFlow } from '@vue-flow/core'

const { setNodes, setEdges } = useVueFlow()

const nodes = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Node 1' },
    position: { x: 250, y: 5 }
  },
  {
    id: '2',
    data: { label: 'Node 2' },
    position: { x: 100, y: 100 }
  }
]

const edges = [
  {
    id: 'e1->2',
    source: '1',
    target: '2'
  }
]

setNodes(nodes)
setEdges(edges)
```

### TailwindCSS v4 Configuration in Nuxt

```typescript
// nuxt.config.ts
// Source: https://tailwindcss.com/docs/installation/framework-guides/nuxt
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  css: ['@/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
})
```

```css
/* assets/css/main.css */
/* Source: TailwindCSS v4 Vite plugin docs */
@import "tailwindcss";

/* Metroviz SVG overrides */
.metroviz-canvas svg {
  @apply w-full h-auto;
}
```

### Data Transformation: Notion Role to Vue Flow

```typescript
// composables/useFlowData.ts
// Source: Phase 1 API structure, Vue Flow node/edge spec
import type { EnrichedPage } from '@/server/utils/relations'
import type { ColumnMappings } from '@/server/utils/config'

export function useFlowData(pages: EnrichedPage[], columnMappings: ColumnMappings) {
  const nextRoleName = Object.entries(columnMappings).find(([role]) => role === 'next')?.[1]

  if (!nextRoleName) {
    return { nodes: [], edges: [] }
  }

  const nodes = pages.map((page, idx) => ({
    id: page.id,
    data: {
      label: page.properties[columnMappings.title]?.title?.[0]?.plain_text || 'Untitled'
    },
    position: { x: idx * 250, y: 100 } // Simple left-to-right layout
  }))

  const edges: Array<{ id: string; source: string; target: string }> = []
  const pageMap = new Map(pages.map(p => [p.id, p]))

  for (const page of pages) {
    const nextProp = page.properties[nextRoleName]
    if (nextProp?.type === 'relation') {
      const nextIds = (nextProp as any).relation || []
      for (const { id: targetId } of nextIds) {
        if (pageMap.has(targetId)) {
          edges.push({
            id: `${page.id}->${targetId}`,
            source: page.id,
            target: targetId
          })
        }
      }
    }
  }

  return { nodes, edges }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| TailwindCSS v3 @nuxtjs/tailwindcss module | TailwindCSS v4 @tailwindcss/vite plugin | 2024 (TW v4 release) | v4 uses Rust-based Oxide engine; builds 5-100x faster; requires Vite plugin instead of PostCSS |
| React Flow pattern | Vue Flow replicated most React Flow features for Vue 3 | 2021+ (Vue Flow dev) | Vue Flow brings React's mature flowchart UX to Vue ecosystem; native Composition API support |
| Manual Metroviz JSON serialization | Composable-based data transformation | This project | Decouples visualization logic from data fetching; reusable transformers for multiple viz types |

**Deprecated/outdated:**
- TailwindCSS v3 with PostCSS — v4 Oxide engine is faster and simpler (no tailwind.config.js needed in most cases)
- @nuxtjs/tailwindcss for v4 — canonical approach is @tailwindcss/vite Vite plugin
- GraphQL or custom REST adapters for visualization data — composables consuming Phase 1 API are sufficient

## Validation Architecture

*Skipped per config: workflow.nyquist_validation = false*

## Open Questions

1. **Metroviz vendor integration: ES6 vs. bundled module?**
   - What we know: Metroviz uses ES6 modules; github.com/rstockm/Metroviz has no build step. Vendoring will copy raw source to `/vendor/metroviz/`.
   - What's unclear: Does vendored Metroviz require any build preprocessing (TypeScript compilation, CSS extraction)? Or is raw copy sufficient?
   - Recommendation: Phase 0 task: Copy vendor/metroviz from repo; test import in MetrovizMap.vue. If import fails, check for missing build artifacts.

2. **Metroviz color generation for lines: randomized vs. deterministic?**
   - What we know: Decision D-11 groups by parent → one line per parent. Each line needs a color. Metroviz may provide a color palette.
   - What's unclear: Should line colors be random, deterministic from parent ID hash, or user-configurable?
   - Recommendation: Use deterministic hash of line ID for reproducible colors. Store in a helper function `generateColorForLine(lineId: string): string`. Phase 3 can add user color picker if needed.

3. **Vue Flow auto-layout for horizontal process flows?**
   - What we know: Vue Flow has a composable-based architecture for managing nodes/edges. Positioning is manual (x, y coords) by default.
   - What's unclear: Does Vue Flow provide automatic layout algorithms (Dagre, ELK)? Or must transformation composable calculate positions?
   - Recommendation: For Phase 2, use simple left-to-right layout: position x based on topological sort of `next` chain. If complexity grows (Phase 3+), explore @vue-flow/layouts package.

4. **Error handling: what if a referenced page (via `next`) is deleted?**
   - What we know: Phase 1 API's resolveRelations uses Promise.allSettled, silently skipping deleted pages.
   - What's unclear: Does visualization layer need to warn user about broken links, or silently skip orphaned edges?
   - Recommendation: For Phase 2, silently skip (consistent with Phase 1). Phase 3 can add diagnostics ("2 dangling references; refresh database").

5. **Responsive canvas sizing: fixed height or flex?**
   - What we know: Visualization components need bounded height (600px?) to render SVG/canvas.
   - What's unclear: Should canvas height be hardcoded, responsive to viewport, or user-resizable (Phase 3 feature)?
   - Recommendation: Phase 2: fixed height (600px) is simplest. Phase 3: add drag-to-resize handle if user feedback indicates need.

## Sources

### Primary (HIGH confidence)

- **Phase 1 API** (`/api/sources/[id].get.ts`) — Returns EnrichedPage[], meta.availableRoles, source.columnMappings
- **rstockm/Metroviz GitHub** — Data model (zones, lines, stations, global events), vanilla JS initialization pattern
- **Vue Flow Official Docs** ([vueflow.dev](https://vueflow.dev)) — Composable API, nodes/edges structure, integration with Nuxt 3
- **TailwindCSS v4 Installation Guide** ([tailwindcss.com/docs/installation/framework-guides/nuxt](https://tailwindcss.com/docs/installation/framework-guides/nuxt)) — @tailwindcss/vite Vite plugin, CSS import, nuxt.config setup
- **Vue 3 useTemplateRef** ([vuejs.org](https://vuejs.org/guide/essentials/template-refs/)) — Composition API template refs for DOM access in onMounted
- **@notionhq/client v2.3.0** (pinned in package.json) — PageObjectResponse type, relation properties structure

### Secondary (MEDIUM confidence)

- **Metroviz GitHub Pages** ([rstockm.github.io/Metroviz](https://rstockm.github.io/Metroviz)) — Features, station types, global events; tested via WebFetch
- **Vue Flow npm package** ([npm.org/@vue-flow/core](https://www.npmjs.com/package/@vue-flow/core)) — Version 1.48.2, last published 4 months ago; production-ready
- **TailwindCSS v4 Differences** ([felixastner.com](https://felixastner.com/articles/integrating-tailwind-css-v4-with-vue-and-nuxt-and-differences-from-v3)) — v3 vs. v4 migration, Oxide engine benefits

### Tertiary (LOW confidence - marked for validation)

- Metroviz color palette API — Not explicitly documented in README; assumed to be either parameterized or requiring custom generation. **Validation needed:** Check vendored source for exports.
- Vue Flow auto-layout plugins — Mentioned in research but not verified in official docs. **Validation needed:** Confirm availability and Phase 2 necessity.

## Metadata

**Confidence breakdown:**
- **Standard Stack (HIGH):** TailwindCSS v4 and Vue Flow are officially documented; versions verified on npm. Metroviz is user-specified; library vetted by user acceptance.
- **Architecture Patterns (HIGH):** Phase 1 API contracts documented in working code; Vue Flow and Metroviz patterns verified against official sources.
- **Data Transformation (MEDIUM):** EnrichedPage structure confirmed in Phase 1 code; role-based mapping is design decision from CONTEXT.md. Actual Metroviz JSON format inferred from GitHub docs — exact API shape TBD after vendoring.
- **Pitfalls (MEDIUM):** Common patterns identified from library docs; Phase 1 experience provides context. Some edge cases (deleted page handling, responsive sizing) are assumptions needing validation.

**Research date:** 2026-06-02
**Valid until:** 2026-06-30 (TailwindCSS v4 and Vue Flow are stable; Metroviz is development-tracked, reassess if repo changes)
**Reassess triggers:** Metroviz repo updates vendored features, @vue-flow/core major version bump, TailwindCSS v4 becomes v5
