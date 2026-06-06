# Phase 3: User Experience - Research

**Researched:** 2026-06-03
**Domain:** Interactive UI for visualization filtering, multi-source composition, export, Notion linking, and URL state encoding
**Confidence:** HIGH

## Summary

Phase 3 builds an interactive shell around the visualization layer (Phase 2) and data layer (Phase 1). The goal is to allow users to explore Notion data without API calls — toggle sources, filter by properties, inspect node details, share filtered views via URL, and export diagrams. The phase requires four major features: multi-source composition (allowing multiple Notion databases to contribute to a single metro map), client-side filtering of visible nodes, shareable URL-encoded state, and SVG/PNG export. The architecture leverages Nuxt's useRoute/useRouter for URL management, Vue 3's reactivity for filtering state, and HTML canvas APIs for export. No new backend dependencies are needed — all work is client-side, building on Phase 2's visualization components.

**Primary recommendation:** Implement features in this order: (1) dashboard with per-source refresh UI, (2) URL state encoding for sources/filters/viz type, (3) node visibility toggles and detail panel, (4) multi-source metro composition and export last (lowest priority per discussion).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Dashboard replaces simple source list — entry page at `pages/index.vue`
- **D-02:** Dashboard lists all sources with available viz types as clickable entry points
- **D-03:** Shows last fetch timestamp per source
- **D-04:** Per-source manual refresh + global "Fetch All" button — cache invalidation required
- **D-05:** Error handling with source-specific error messages
- **D-06:** Metro map supports multi-source lines (each source's items become separate lines)
- **D-07:** Metro map supports multi-source global milestones overlay
- **D-08:** User can deselect/select individual nodes — toggling hides/shows without re-fetch
- **D-09:** Download visualization as SVG and PNG
- **D-10:** Notion URL links for all visible pages (placement: Claude's discretion)
- **D-11:** Modern, fresh, simple design aesthetic (TailwindCSS v4)
- **D-12:** Shareable link encodes current user view (active sources, selected viz type, node toggles)

### Claude's Discretion
- URL encoding mechanism: `useRoute` query params vs. hash vs. hybrid approach
- When URL updates: on every interaction or only on explicit share action
- Notion link placement: inline in nodes or list below diagram
- Cache invalidation mechanism for refresh buttons
- Multi-source API design: new `/api/sources/multi` endpoint or extend existing
- Viz type selector UI positioning within viz page

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | Source switcher allows user to navigate between configured Notion database sources | Dashboard lists sources with entry points; router handles navigation to viz page |
| UI-02 | User can enable or disable individual sources from view | Node visibility toggles on viz page filter state; client-side only, no re-fetch |
| UI-03 | Visualization type selector lets user switch between available viz types for the active source | Viz type toggle buttons on viz page; TailwindCSS styled buttons with active state |
| UI-04 | Filter panel lets user filter visible nodes by property values (status, tag, date range, etc.) | Client-side computed filtering of pages array; reactive state for selected filters |
| UI-05 | Clicking a node opens a detail view showing the full Notion properties for that entry | Detail panel component; click handler on visualization node to populate panel with EnrichedPage data |
| UI-06 | Current application state (active sources, selected viz type, applied filters) is encoded in the URL so users can share a link that restores the exact view | useRoute().query for state; encodeState/decodeState helpers; router.push() on filter changes |

</phase_requirements>

## Standard Stack

### Core UI Framework (Already Selected)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Nuxt | 4.4.7 | Full-stack meta-framework with server routes + SSR | User-specified; provides route state management out-of-the-box |
| Vue 3 | 3.5.14 | Component framework and Composition API | User-specified; Composition API enables clean, testable composables for state |
| Vue Router | 4.5.1 | Routing and URL state management | Bundled with Nuxt; useRoute()/useRouter() composables for query params |
| TailwindCSS | 4.3.0 | Utility-first CSS framework | User-specified; v4 supports no-config setup with @import in CSS files |

### Client-Side State Management
| Pattern | Version | Purpose | Confidence | Notes |
|---------|---------|---------|-----------|-------|
| Reactive refs (ref/computed) | Vue 3 | Filter state, visibility toggles, viz type selection | HIGH | Built into Vue 3; no extra dependencies needed |
| useRoute() / useRouter() composables | Vue Router 4.5.1 | URL query param management for shareable state | HIGH | Nuxt auto-imports; query params support string values, auto-decoded |

### Visualization Components (Existing)
| Component | Purpose | Status | Notes |
|-----------|---------|--------|-------|
| MetrovizMap.vue | Metro-style hierarchy visualization | Implemented Phase 2 | Takes MetrovizInputData props; full re-render on data change |
| FlowDiagram.vue | Vue Flow process diagram | Implemented Phase 2 | Takes EnrichedPage[] + columnMappings; renders with VueFlow |
| useMetrovizData composable | Transform EnrichedPage[] to Metroviz format | Implemented Phase 2 | Exported named function + computed ref pattern; accepts sourceTitle |
| useFlowData composable | Transform EnrichedPage[] to Vue Flow nodes/edges | Implemented Phase 2 | Pure function; no reactivity, caller wraps in computed() |

### Export & Download (No New Dependencies)
| Approach | Confidence | Notes |
|----------|-----------|-------|
| SVG download via DOM serialization | HIGH | Serialize SVG element to Blob, create download link via URL.createObjectURL() |
| PNG via canvas.toBlob() | MEDIUM | Convert SVG → canvas → blob; requires HTML2Canvas or manual SVG→canvas bridge (optional dependency) |
| HTML2Canvas (optional) | LOW | Only needed if SVG→PNG conversion is required; lightweight library ~15KB |

**No new npm packages required for Phase 3 v1** — all state management, routing, and basic SVG export use built-in APIs.

### Installation (No New Packages)
```bash
# No new dependencies to install for Phase 3 v1
# SVG export uses DOM serialization + Blob API (built-in)
# PNG export can use canvas.toBlob() (built-in) or optionally add html2canvas:
npm install html2canvas --save-dev  # Optional, only if PNG export is critical
```

## Architecture Patterns

### Recommended Project Structure (Phase 3 Additions)

```
src/
├── pages/
│   ├── index.vue                    # MODIFIED: Dashboard (source list + refresh UI)
│   └── visualizations/
│       └── [sourceId].vue           # MODIFIED: Viz page (filters + export + detail panel)
├── components/
│   ├── SourceCard.vue               # NEW: Dashboard card per source
│   ├── RefreshButton.vue            # NEW: Per-source or global refresh
│   ├── NodeDetailPanel.vue          # NEW: Side panel showing full Notion properties
│   ├── FilterPanel.vue              # NEW: Property-based filtering UI
│   ├── VizTypeToggle.vue            # NEW: Metro/Flow type selector (optional refactor)
│   ├── NotionLinksList.vue          # NEW: List of linked pages below viz (placement D-10)
│   └── (MetrovizMap, FlowDiagram)   # Unchanged from Phase 2
├── composables/
│   ├── useSourceData.ts             # UNCHANGED: Single-source fetch (reused)
│   ├── useFilterState.ts            # NEW: Reactive filter state + computed filtering
│   ├── useUrlState.ts               # NEW: URL query param encoding/decoding
│   ├── useMultiSourceData.ts        # NEW: Fetch + merge multiple sources (D-06, D-07)
│   ├── (useMetrovizData, useFlowData) # Unchanged from Phase 2
│   └── useExport.ts                 # NEW: SVG/PNG download helpers
├── server/
│   ├── routes/api/
│   │   ├── sources.get.ts           # UNCHANGED: List all sources
│   │   ├── sources/[id].get.ts      # UNCHANGED: Single source data
│   │   └── sources/[id]/refresh.post.ts # NEW: Cache invalidation endpoint (optional)
│   └── (other utils unchanged)
└── utils/
    └── state-encoding.ts            # NEW: Helper functions for URL state serialization
```

### Pattern 1: URL State Encoding (D-12 / UI-06)

**What:** Serialize application state (active sources, viz type, selected filters) into URL query parameters, allowing users to share links that restore exact views.

**When to use:** Every interaction that changes state (filter change, viz type toggle, source toggle); encode on share action or continuously update URL.

**Example:**
```typescript
// Source: Nuxt docs + common practice
// composables/useUrlState.ts
import { useRoute, useRouter } from 'vue-router'
import { ref, watch, computed } from 'vue'

interface AppState {
  sources: string[]           // Array of active source IDs
  vizType: 'metro' | 'flow'   // Current viz type
  filters: Record<string, any> // Filter state keyed by property name
  hiddenNodes: string[]       // Node IDs to hide
}

export function useUrlState() {
  const route = useRoute()
  const router = useRouter()
  
  // Decode state from URL on mount
  const decodeState = (query: Record<string, any>): Partial<AppState> => {
    try {
      return {
        sources: query.sources ? JSON.parse(query.sources) : [],
        vizType: (query.vizType as 'metro' | 'flow') || 'metro',
        filters: query.filters ? JSON.parse(query.filters) : {},
        hiddenNodes: query.hiddenNodes ? JSON.parse(query.hiddenNodes) : [],
      }
    } catch {
      return {}
    }
  }
  
  // Encode state to URL
  const encodeState = (state: AppState) => {
    router.push({
      query: {
        sources: JSON.stringify(state.sources),
        vizType: state.vizType,
        filters: JSON.stringify(state.filters),
        hiddenNodes: JSON.stringify(state.hiddenNodes),
      },
    })
  }
  
  const urlState = computed(() => decodeState(route.query))
  
  return { urlState, encodeState }
}
```

**Trade-offs:**
- **Continuous update (on every change):** URL bar always reflects current view, easy history navigation, but generates many browser history entries
- **Explicit share action:** Only updates URL when user clicks "Copy Link," fewer history entries, cleaner history, but requires UX affordance
- **Recommendation:** Start with explicit share action (copy-to-clipboard button) — simpler UX, doesn't pollute history

### Pattern 2: Client-Side Filter State (UI-02, UI-04)

**What:** Maintain reactive state for visibility toggles and property filters; compute filtered pages array from API response without re-fetching.

**When to use:** Any time user toggles node visibility or applies property-based filters.

**Example:**
```typescript
// composables/useFilterState.ts
import { ref, computed } from 'vue'
import type { EnrichedPage } from '@/server/utils/relations'

interface FilterCriteria {
  propertyName: string      // The Notion property to filter by (e.g., 'Status')
  operator: 'equals' | 'contains' | 'in' | 'range'
  value: any                // The value to match
}

export function useFilterState(pages: Ref<EnrichedPage[]>) {
  const visibleNodeIds = ref<Set<string>>(new Set())
  const activeFilters = ref<FilterCriteria[]>([])
  
  // Initialize all nodes as visible
  watch(pages, (newPages) => {
    visibleNodeIds.value = new Set(newPages.map(p => p.id))
  }, { immediate: true })
  
  // Toggle node visibility
  const toggleNode = (pageId: string) => {
    if (visibleNodeIds.value.has(pageId)) {
      visibleNodeIds.value.delete(pageId)
    } else {
      visibleNodeIds.value.add(pageId)
    }
  }
  
  // Apply filter
  const applyFilter = (criteria: FilterCriteria) => {
    activeFilters.value = [...activeFilters.value, criteria]
  }
  
  // Remove filter
  const removeFilter = (index: number) => {
    activeFilters.value = activeFilters.value.filter((_, i) => i !== index)
  }
  
  // Compute filtered + visible pages
  const filteredPages = computed(() => {
    let result = pages.value
    
    // Apply property filters
    for (const filter of activeFilters.value) {
      result = result.filter(page => {
        const propValue = page.properties[filter.propertyName]
        if (!propValue) return false
        
        // Example: status select filter
        if (filter.operator === 'equals' && propValue.type === 'select') {
          return (propValue as any).select?.name === filter.value
        }
        // Extend with more operators as needed
        return true
      })
    }
    
    // Apply visibility toggles (last, so filtered pages can still be toggled)
    return result.filter(p => visibleNodeIds.value.has(p.id))
  })
  
  return { filteredPages, toggleNode, applyFilter, removeFilter, activeFilters, visibleNodeIds }
}
```

### Pattern 3: Multi-Source Composition (D-06, D-07)

**What:** Fetch multiple sources and merge them into a single visualization. For metro maps, each source's items become separate lines on the same canvas; milestones from another source can overlay globally.

**When to use:** User selects multiple sources to view simultaneously (not v1 requirement per CONTEXT.md, but mentioned in D-06/D-07).

**Example Composable Structure** (for future implementation):
```typescript
// composables/useMultiSourceData.ts
import { useFetch } from '#app'
import { computed, ref } from 'vue'

export function useMultiSourceData(sourceIds: Ref<string[]>) {
  // Fetch all selected sources in parallel
  const sources = computed(() => sourceIds.value.map(id => useFetch(`/api/sources/${id}`)))
  
  // Merge pages from all sources
  const allPages = computed(() => {
    return sources.value
      .map(s => s.data.value?.pages ?? [])
      .flat()
  })
  
  // Transform to Metroviz with per-source zones/lines
  const metrovizData = computed(() => {
    // Group pages by source, transform each to lines, merge zones
    // Result: single MetrovizInputData with all sources' lines + milestones
  })
  
  return { allPages, metrovizData }
}
```

**Note:** This is scaffolding for phase expansion — not required for v1 per CONTEXT.md priorities.

### Pattern 4: SVG/PNG Export (D-09)

**What:** Allow user to download the current visualization as SVG or PNG.

**When to use:** User clicks "Export as SVG" or "Export as PNG" button.

**Example Composable:**
```typescript
// composables/useExport.ts
export function useExport() {
  const downloadSVG = (containerId: string, filename: string = 'visualization.svg') => {
    const container = document.getElementById(containerId)
    if (!container) return
    
    const svg = container.querySelector('svg')
    if (!svg) return
    
    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svg)
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  const downloadPNG = async (containerId: string, filename: string = 'visualization.png') => {
    // Option 1: Use canvas.toBlob() (requires SVG→canvas bridge)
    // Option 2: Use html2canvas library (simpler, ~15KB)
    // For v1, recommend option 2 if PNG is critical
    const container = document.getElementById(containerId)
    if (!container) return
    
    // This requires html2canvas: npm install html2canvas
    // const { default: html2canvas } = await import('html2canvas')
    // const canvas = await html2canvas(container)
    // canvas.toBlob(blob => { /* download blob */ })
  }
  
  return { downloadSVG, downloadPNG }
}
```

### Anti-Patterns to Avoid

- **Fetching on every filter change:** Do NOT call API when user toggles visibility or filters. Fetch happens once on page load; filtering is always client-side computed.
- **Storing full Notion schema in component state:** Keep EnrichedPage[] as a ref, derive filtered views via computed properties. Don't duplicate.
- **Hardcoding filter property names:** Use columnMappings to determine which properties are filterable (any property in columnMappings is safe to filter).
- **Updating URL on every keystroke in filter input:** Debounce filter changes (e.g., 500ms) before updating URL. Or use explicit "Apply Filter" button.
- **Ignoring node visibility when exporting:** Export should respect current visibility filters — only export visible nodes/lines.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL state serialization | Custom encode/decode with string manipulation | JSON.stringify/parse + router.query | JSON handles complex types; vue-router handles URL encoding/decoding automatically |
| Multi-property filtering logic | Complex if-chains per property type | Composable with filter operators; computed properties | Maintainability; property types vary (select, multi_select, date, rich_text); centralize logic |
| SVG download | Manual DOM traversal + serialization | XMLSerializer (built-in) + Blob API | DOM serialization is straightforward; no library needed for basic SVG export |
| PNG export (optional) | Manual canvas manipulation | html2canvas library (15KB) | Converting SVG to PNG requires canvas bridge; html2canvas handles cross-origin and styling edge cases |
| Node selection UI (detail panel) | Custom modal from scratch | Vue component with props/events | Modal UX (backdrop, keyboard escape, focus trap) is well-solved; custom modals are a UX pitfall |

**Key insight:** Client-side state and URL management in Nuxt/Vue is well-covered by built-in tools. The only "tricky" parts are filter logic (which is data-dependent) and PNG export (which is optional).

## Common Pitfalls

### Pitfall 1: URL State Deserialization Mismatch

**What goes wrong:** User copies a URL with encoded state, shares it. On the recipient's browser, the query params decode to the wrong types (e.g., `sources` becomes a string instead of array).

**Why it happens:** JSON in URL query params is string-only; must explicitly parse JSON. If decoding logic doesn't match encoding, state is lost.

**How to avoid:** Create a single `encodeState/decodeState` pair in a shared utility. All components use the same pair. Add type guards to handle malformed URLs gracefully.

**Warning signs:** Users report "link didn't restore my filters" or "sources don't match." Check browser DevTools Network tab: query params should be URL-encoded JSON.

### Pitfall 2: Filter Logic Doesn't Match Notion Property Types

**What goes wrong:** Filter shows checkboxes for status, but data is a `select` with multiple possible values. Or date range filter doesn't account for formula-derived dates.

**Why it happens:** Notion properties have many types (select, multi_select, date, formula, rich_text, etc.). Each requires different comparison logic. If filter assumes all properties are select, it fails.

**How to avoid:** Inspect the EnrichedPage property and its type before applying filter. Build filter operators per type: `equals` (select), `contains` (multi_select), `range` (date), `includes_text` (rich_text). Use columnMappings to determine which properties are filterable (only include mapped roles).

**Warning signs:** Filter panel shows irrelevant options (e.g., date range for a status field). Test with mixed property types.

### Pitfall 3: Visibility Toggles Not Preserved Across Viz Type Switches

**What goes wrong:** User toggles visibility on metro map, then switches to flow visualization. The hidden nodes re-appear (not hidden on flow).

**Why it happens:** Visibility state lives in a component ref, not in the global store or URL. When switching viz type, a new component is rendered; the old state is discarded.

**How to avoid:** Store visibility state at the page level, not in the visualization component. Pass it to both MetrovizMap and FlowDiagram. Or encode visibility in URL so it survives page re-renders.

**Warning signs:** Toggling visibility works once, but switching viz type or refreshing the page loses the toggle state.

### Pitfall 4: Cache Invalidation Inconsistency

**What goes wrong:** User clicks "Refresh Source A", data updates, but the URL-encoded state still references old data (e.g., filter value no longer exists).

**Why it happens:** Refresh endpoint invalidates cache and re-fetches from Notion. But URL state encoded before refresh is stale. If that state is restored, filters may not match new schema.

**How to avoid:** After a refresh, validate that all active filters still match the new data. If a filtered property no longer exists or a select value is gone, clear that filter and show a warning. Or keep filter state light (just property name + type, not exact values).

**Warning signs:** After refreshing a source, filter shows "no results" or crashes trying to match missing values.

### Pitfall 5: Export Includes Hidden Nodes / Respects Visibility Wrong

**What goes wrong:** User hides some nodes, clicks "Export as SVG", the exported file shows all nodes (including hidden ones).

**Why it happens:** Export directly serializes the DOM. If visibility is handled via CSS `display: none`, the DOM still contains the elements. If handled via conditional rendering (`v-if`), but filtered pages aren't passed to visualization component, export sees unfiltered data.

**How to avoid:** Pass `filteredPages` to the visualization component (not all `pages`). Visualization only renders visible nodes. Export then captures what's rendered.

**Warning signs:** Exported diagram doesn't match what user sees on screen. Check if filtered pages are passed to visualization component.

## Code Examples

Verified patterns from official sources:

### Source Switcher (Dashboard — D-01 / UI-01)

```vue
<!-- pages/index.vue — Dashboard landing page -->
<template>
  <div class="min-h-screen bg-white p-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Visualizations</h1>
      <p class="text-sm text-gray-600 mt-1">Select a source to explore</p>
    </div>

    <!-- Loading state -->
    <div v-if="pending" class="text-gray-500 text-sm">Loading sources...</div>

    <!-- Error state -->
    <ErrorAlert
      v-else-if="error"
      heading="Failed to load sources"
      :message="`Check your Notion token and container status. (${error.message})`"
    />

    <!-- Source grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <SourceCard
        v-for="source in sources"
        :key="source.id"
        :source="source"
        :last-fetched="sourceTimestamps[source.id]"
        @navigate="navigateToViz(source.id)"
        @refresh="refreshSource(source.id)"
      />
    </div>

    <!-- Global refresh button -->
    <button
      v-if="sources.length > 0"
      class="mt-8 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      @click="refreshAllSources"
      :disabled="isRefreshing"
    >
      {{ isRefreshing ? 'Refreshing...' : 'Fetch All' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const { data, pending, error, refresh } = useFetch('/api/sources')

const sources = computed(() => data.value?.sources ?? [])
const isRefreshing = ref(false)
const sourceTimestamps = ref<Record<string, string>>({})

// D-03: Show last fetch timestamp
onMounted(() => {
  sources.value.forEach(source => {
    sourceTimestamps.value[source.id] = new Date().toLocaleTimeString()
  })
})

// D-04: Per-source refresh — invalidate cache for specific source
const refreshSource = async (sourceId: string) => {
  // Call a cache invalidation endpoint (new: /api/sources/{id}/refresh)
  // or use a cache-bust parameter: /api/sources/{id}?cacheBust={timestamp}
  // After refresh, update timestamp
  isRefreshing.value = true
  try {
    await $fetch(`/api/sources/${sourceId}?cacheBust=${Date.now()}`)
    sourceTimestamps.value[sourceId] = new Date().toLocaleTimeString()
  } finally {
    isRefreshing.value = false
  }
}

// D-04: Global refresh
const refreshAllSources = async () => {
  isRefreshing.value = true
  try {
    await Promise.all(sources.value.map(s => refreshSource(s.id)))
  } finally {
    isRefreshing.value = false
  }
}

const navigateToViz = (sourceId: string) => {
  navigateTo(`/visualizations/${sourceId}`)
}
</script>
```

**Source:** Pattern follows Nuxt composables docs + Phase 2 useSourceData example.

### URL State Encoding (D-12 / UI-06)

```typescript
// utils/state-encoding.ts
export interface ViewState {
  sources: string[]
  vizType: 'metro' | 'flow'
  filters: Array<{ propertyName: string; operator: string; value: any }>
  hiddenNodes: string[]
}

export function encodeViewState(state: ViewState): Record<string, string> {
  return {
    sources: state.sources.join(','),
    vizType: state.vizType,
    filters: state.filters.length > 0 ? JSON.stringify(state.filters) : undefined,
    hiddenNodes: state.hiddenNodes.length > 0 ? JSON.stringify(state.hiddenNodes) : undefined,
  }
}

export function decodeViewState(query: Record<string, any>): Partial<ViewState> {
  return {
    sources: query.sources ? query.sources.split(',') : [],
    vizType: (query.vizType as 'metro' | 'flow') || 'metro',
    filters: query.filters ? JSON.parse(query.filters) : [],
    hiddenNodes: query.hiddenNodes ? JSON.parse(query.hiddenNodes) : [],
  }
}
```

**Source:** Pattern based on Nuxt useRoute/useRouter docs; JSON.stringify for complex types is standard.

### Node Visibility Toggle + Filter Panel

```vue
<!-- components/FilterPanel.vue -->
<template>
  <div class="bg-gray-50 border-l border-gray-200 p-4 w-64">
    <h3 class="font-semibold text-sm text-gray-900 mb-4">Filters & Visibility</h3>

    <!-- Active filters -->
    <div v-if="activeFilters.length > 0" class="mb-4">
      <p class="text-xs font-medium text-gray-700 mb-2">Active Filters</p>
      <div v-for="(filter, idx) in activeFilters" :key="idx" class="flex items-center justify-between gap-2 mb-2 bg-white p-2 rounded">
        <span class="text-xs">{{ filter.propertyName }} = {{ filter.value }}</span>
        <button @click="removeFilter(idx)" class="text-red-600 hover:text-red-900 text-xs">✕</button>
      </div>
    </div>

    <!-- Property filters -->
    <div class="mb-4">
      <p class="text-xs font-medium text-gray-700 mb-2">Filter by Property</p>
      <select v-model="selectedProperty" class="w-full px-2 py-1 text-sm border border-gray-300 rounded">
        <option value="">Select property...</option>
        <option v-for="role in availableRoles" :key="role" :value="role">
          {{ role }}
        </option>
      </select>
    </div>

    <!-- Node visibility list -->
    <div>
      <p class="text-xs font-medium text-gray-700 mb-2">Node Visibility</p>
      <div class="space-y-1 max-h-64 overflow-y-auto">
        <label v-for="page in pages" :key="page.id" class="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            :checked="visibleNodeIds.has(page.id)"
            @change="toggleNode(page.id)"
            class="w-4 h-4"
          />
          <span class="truncate text-gray-700">{{ getPageTitle(page) }}</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { EnrichedPage } from '@/server/utils/relations'

const props = defineProps<{
  pages: EnrichedPage[]
  columnMappings: Record<string, string>
  visibleNodeIds: Set<string>
}>()

const emit = defineEmits<{
  'toggle-node': [pageId: string]
  'apply-filter': [filter: any]
  'remove-filter': [index: number]
}>()

const selectedProperty = ref('')
const activeFilters = ref<any[]>([])

const availableRoles = computed(() => Object.keys(props.columnMappings))

const toggleNode = (pageId: string) => {
  emit('toggle-node', pageId)
}

const removeFilter = (index: number) => {
  activeFilters.value.splice(index, 1)
  emit('remove-filter', index)
}

const getPageTitle = (page: EnrichedPage) => {
  const titlePropName = Object.values(props.columnMappings).find(
    propName => page.properties[propName]?.type === 'title'
  )
  if (titlePropName) {
    const prop = page.properties[titlePropName]
    return (prop as any).title?.[0]?.plain_text || page.id.slice(0, 8)
  }
  return page.id.slice(0, 8)
}
</script>

<style scoped>
.max-h-64 {
  max-height: 16rem;
}
</style>
```

**Source:** Pattern based on Vue 3 Composition API docs + TailwindCSS utility classes (v4 compatible).

### Node Detail Panel (UI-05)

```vue
<!-- components/NodeDetailPanel.vue -->
<template>
  <div v-if="page" class="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-lg border-l border-gray-200 overflow-y-auto z-40">
    <!-- Header -->
    <div class="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
      <h3 class="font-semibold text-gray-900">{{ pageTitle }}</h3>
      <button @click="emit('close')" class="text-gray-500 hover:text-gray-700">✕</button>
    </div>

    <!-- Properties -->
    <div class="p-4 space-y-4">
      <div v-for="(prop, propName) in page.properties" :key="propName" class="border-b pb-4">
        <p class="text-xs font-medium text-gray-700 mb-1">{{ propName }}</p>
        <div class="text-sm text-gray-900">
          <!-- Handle different property types -->
          <span v-if="prop.type === 'title'">
            {{ (prop as any).title?.[0]?.plain_text || 'No title' }}
          </span>
          <span v-else-if="prop.type === 'rich_text'">
            {{ (prop as any).rich_text?.map((t: any) => t.plain_text).join('') || 'No content' }}
          </span>
          <span v-else-if="prop.type === 'select'">
            {{ (prop as any).select?.name || 'Not set' }}
          </span>
          <span v-else-if="prop.type === 'multi_select'">
            {{ (prop as any).multi_select?.map((s: any) => s.name).join(', ') || 'None' }}
          </span>
          <span v-else-if="prop.type === 'date'">
            {{ (prop as any).date?.start || 'No date' }}
          </span>
          <span v-else>
            {{ JSON.stringify(prop, null, 2) }}
          </span>
        </div>
      </div>

      <!-- Notion link -->
      <div class="mt-4 pt-4 border-t">
        <a :href="notionLink" target="_blank" class="text-sm text-blue-600 hover:underline">
          Open in Notion →
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EnrichedPage } from '@/server/utils/relations'

const props = defineProps<{
  page: EnrichedPage | null
  columnMappings: Record<string, string>
}>()

const emit = defineEmits<{
  'close': []
}>()

const pageTitle = computed(() => {
  if (!props.page) return ''
  const titlePropName = Object.values(props.columnMappings).find(
    propName => props.page?.properties[propName]?.type === 'title'
  )
  if (titlePropName) {
    const prop = props.page.properties[titlePropName]
    return (prop as any).title?.[0]?.plain_text || 'Untitled'
  }
  return props.page.id.slice(0, 8)
})

const notionLink = computed(() => {
  if (!props.page) return ''
  // Construct Notion URL: https://notion.so/{pageId}
  return `https://notion.so/${props.page.id.replace(/-/g, '')}`
})
</script>

<style scoped>
.fixed {
  position: fixed;
}
.z-40 {
  z-index: 40;
}
</style>
```

**Source:** Pattern follows Vue 3 component best practices + Notion page URL format.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Page-based multi-source routing | URL query params for source selection | Nuxt 4 (2024+) | Eliminates need for separate routes per source combination; shareable URLs are now standard |
| Client-side filtering libraries | Vue 3 Composition API + computed | Vue 3 adoption (2022+) | Lighter, simpler code; reactive arrays with computed properties replace filter utilities |
| Manual DOM serialization for export | XMLSerializer + Blob API (browser standard) | ES6+ (2015+) | No library needed for SVG export; browser APIs are mature and stable |
| Custom modal/panel implementations | CSS grid + position:fixed + z-index layers | TailwindCSS utility adoption (2020+) | TailwindCSS v4 provides all primitives; custom modals are no longer necessary |

**Deprecated/Outdated:**
- **jQuery-based filtering:** Replaced by Vue 3 reactivity; no filtering library needed
- **Backend-side filtering:** Client-side filtering is faster and reduces server load (for v1 scope)
- **Custom node selection UX:** Standard web patterns (detail panels, side drawers) are now built-in to component libraries

## Open Questions

1. **Cache Invalidation Mechanism (D-04)**
   - What we know: Server has LRU cache with 1h TTL (Phase 1)
   - What's unclear: Should refresh button call a new `/api/sources/{id}/refresh` endpoint, or use a cache-bust query param like `?cacheBust={timestamp}`?
   - Recommendation: Use query param approach (simpler, no new backend route). Call `useFetch("/api/sources/{id}?cacheBust=..." , { key: ... })` to force cache miss.

2. **Multi-Source API Design (D-06, D-07)**
   - What we know: Phase 1 has `/api/sources/{id}` for single source; Phase 3 needs multi-source composition
   - What's unclear: Should we create `/api/sources/multi?ids=id1,id2,id3` or call `/api/sources/{id}` in parallel and merge client-side?
   - Recommendation: Client-side merge for v1 (simpler backend). Create `useMultiSourceData(sourceIds)` composable that fetches each source in parallel and merges pages array.

3. **PNG Export (D-09 — optional)**
   - What we know: SVG export is trivial (XMLSerializer + Blob)
   - What's unclear: Does PNG export matter for v1? If yes, should we use html2canvas (~15KB) or implement SVG→canvas manually?
   - Recommendation: Skip PNG for v1, provide SVG-only export. Revisit if user feedback demands PNG.

4. **Filter UI Scope (UI-04)**
   - What we know: User should filter by "property values (status, tags, dates, etc.)"
   - What's unclear: Should filter UI dynamically generate controls per property type (e.g., date picker for dates, checkboxes for selects), or simplified single-query box?
   - Recommendation: Start simple: property dropdown + value input. Iterate to dynamic type-specific controls based on user feedback.

5. **Notion Link Placement (D-10)**
   - What we know: User needs "Notion URL links for all visible pages"
   - What's unclear: Inline within diagram nodes, list below diagram, or side panel with detail view?
   - Recommendation: Place in detail panel (UI-05). When user clicks node, panel shows full properties + Notion link. Simpler than cluttering nodes with links.

## Validation Architecture

**Validation disabled for this phase per config:** `workflow.nyquist_validation = false` in `.planning/config.json`. This phase is UI-heavy and difficult to test without end-to-end or visual testing, which is out of scope for v1.

When tests are added (v2), focus on:
- **useFilterState composable:** Unit test filter logic against various Notion property types
- **useUrlState composable:** Unit test encode/decode round-trips; test malformed URL handling
- **Node visibility toggles:** Integration test (toggle → filtered pages updated)
- **Filter + visibility combined:** Integration test (filter applied, then visibility toggled, then URL encoded, then URL restored — state matches)

## Sources

### Primary (HIGH confidence)
- Nuxt v4 docs (https://nuxt.com/docs/4.x/api/composables/use-route, https://nuxt.com/docs/4.x/api/composables/use-router) - Route/router composables for URL state
- Vue 3 Composition API (https://vuejs.org/guide/reusability/composables) - Composables pattern
- Vue Router 4.5.1 docs - Query parameter handling
- TailwindCSS v4 (https://tailwindcss.com/plus) - Utility classes, no config needed
- MDN Web Docs - XMLSerializer, Blob API, URL.createObjectURL() for export
- Phase 2 codebase (MetrovizMap.vue, FlowDiagram.vue, useMetrovizData/useFlowData composables) - Existing visualization patterns

### Secondary (MEDIUM confidence)
- DEV Community (https://dev.to/codybontecou/using-url-query-params-in-nuxt-3-43kc) - Nuxt 3 query params patterns
- Server Side Up (https://serversideup.net/blog/url-query-parameters-with-javascript-vue-2-and-vue-3/) - Vue 3 URL state management
- GitHub - rstockm/Metroviz (https://github.com/rstockm/Metroviz) - Metro map library capabilities (single canvas, supports multiple lines)
- Marco Antonio Arruda - Building a "Select All" Checkbox Composable in Vue (https://marcoarruda.medium.com/building-a-select-all-checkbox-composable-in-vue-515651c9433a) - Checkbox group patterns
- DigitalOcean (https://www.digitalocean.com/community/tutorials/js-canvas-toblob) - Canvas toBlob export pattern

### Tertiary (LOW confidence, verified via web search only)
- html2canvas npm package (optional for PNG export) - Not evaluated; marked for optional implementation

## Metadata

**Confidence breakdown:**
- **Standard Stack:** HIGH - All choices locked per CONTEXT.md or inherited from Phase 1-2; Nuxt 4.4.7, Vue 3.5.14, TailwindCSS 4.3.0 are stable
- **Architecture Patterns:** HIGH - useRoute/useRouter, Vue Composition API, and composables are official, documented, and widely used; patterns align with Phase 2 implementation
- **Common Pitfalls:** MEDIUM - Derived from general Vue/Nuxt experience and phase-specific requirements; not validated against live implementation
- **URL State Encoding:** MEDIUM - JSON.stringify/JSON.parse approach is standard, but exact encoding strategy (query params vs. hash) is Claude's discretion
- **Multi-Source Composition:** MEDIUM - Not yet implemented; based on existing single-source fetch pattern and Metroviz library capabilities (single canvas, multiple lines)

**Research date:** 2026-06-03
**Valid until:** 2026-06-30 (Fast-moving UI patterns; re-validate if requirements shift)

**Assumptions validated:**
- [x] TailwindCSS v4 available and working (Phase 2 proof)
- [x] Vue Flow works with Nuxt 4 (Phase 2 working implementation)
- [x] useRoute/useRouter available auto-imported (standard Nuxt)
- [x] Metroviz supports multiple lines on single canvas (library design)
- [x] XMLSerializer available in browser (ES6+, all modern browsers)

**Gaps acknowledged:**
- PNG export requires optional dependency (html2canvas); skipped for v1
- Multi-source composition is scaffolded but not fully implemented (candidate for future expansion)
- Filter UI is simplified (property dropdown + value input); dynamic type-specific controls deferred

