<template>
  <div class="min-h-screen bg-white">
    <!-- Page header -->
    <div class="p-6 pb-0">
      <NuxtLink to="/" class="text-sm text-blue-600 hover:underline mb-2 block">
        ← Back to sources
      </NuxtLink>
      <div class="flex items-center justify-between gap-4">
        <!-- Source selector (Gap 2/4 fix) -->
        <div class="flex items-center gap-3 min-w-0">
          <span class="text-sm text-gray-500 flex-shrink-0">Source:</span>
          <select
            v-if="allSources.length > 0"
            :value="sourceId"
            class="text-xl font-semibold text-gray-900 bg-transparent border-none outline-none cursor-pointer hover:text-blue-600 min-w-0 max-w-xs truncate"
            :aria-label="'Switch source — currently viewing ' + sourceName"
            @change="handleSourceChange"
          >
            <option
              v-for="src in allSources"
              :key="src.id"
              :value="src.id"
            >{{ src.name }}</option>
          </select>
          <!-- Fallback while sources are loading -->
          <h1 v-else class="text-xl font-semibold text-gray-900">
            {{ isLoading ? 'Loading...' : sourceName }}
          </h1>
        </div>
        <!-- Icon buttons: export (metro only), copy link, filter toggle -->
        <div class="flex items-center gap-1 flex-shrink-0">
          <!-- Export SVG — metro only (VueFlow nodes are HTML, not SVG) -->
          <button
            v-if="!isLoading && !fetchError && filteredPages.length > 0 && activeVizType === 'metro'"
            :disabled="isExporting"
            title="Export SVG"
            class="p-2 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40"
            @click="downloadSVG(metrovizContainerId, 'metro')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </button>

          <!-- Copy shareable link -->
          <button
            v-if="!isLoading && !fetchError && filteredPages.length > 0"
            :title="copyLinkSuccess === true ? 'Copied!' : copyLinkSuccess === false ? 'Copy failed' : 'Copy link'"
            class="p-2 rounded hover:bg-gray-100"
            :class="copyLinkSuccess === true ? 'text-green-600' : 'text-gray-500 hover:text-gray-900'"
            @click="handleCopyLink"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
          </button>

          <!-- Filter / visibility panel toggle -->
          <button
            :title="filterPanelOpen ? 'Close filters' : 'Open filters'"
            class="p-2 rounded"
            :class="filterPanelOpen ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'"
            @click="filterPanelOpen = !filterPanelOpen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div class="p-6">
      <LoadingSpinner v-if="isLoading" />

      <!-- Error state -->
      <ErrorAlert
        v-else-if="fetchError"
        heading="Failed to load visualization data"
        :message="`Check that your Notion integration token is valid and the database is accessible. (${fetchError.message ?? 'Unknown error'})`"
      />

      <!-- Empty state -->
      <div
        v-else-if="!isLoading && pages.length === 0"
        class="p-8 rounded bg-gray-100 border border-gray-200 text-center"
      >
        <p class="font-semibold text-gray-900 mb-2">No items in this source</p>
        <p class="text-sm text-gray-600">The Notion database contains no pages matching the current query.</p>
      </div>

      <!-- Not eligible -->
      <div
        v-else-if="!isMetroEligible && !isFlowEligible"
        class="p-4 rounded"
        style="border: 1px solid #ef4444; background: #fee2e2;"
      >
        <p class="font-semibold text-red-600 mb-1">Cannot visualize this source</p>
        <p class="text-sm text-gray-700">The source is missing required role mappings for any visualization type. Add a 'next' role to columnMappings in sources.json to enable flow visualization, or add both 'date' and 'next' roles for metro map.</p>
      </div>

      <!-- Viz area: main content + right panel layout -->
      <template v-else>
        <div class="flex gap-0">
          <!-- Main visualization column -->
          <div class="flex-1 min-w-0">
            <!-- Viz type label/toggle (UI-03 + Gap 4 fix) -->
            <div class="mb-4 flex items-center gap-2">
              <!-- When both types eligible: show interactive toggle buttons -->
              <template v-if="isMetroEligible && isFlowEligible">
                <button
                  :class="['px-4 py-2 rounded text-sm font-medium', activeVizType === 'metro' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700']"
                  @click="activeVizType = 'metro'"
                >
                  Metro Map
                </button>
                <button
                  :class="['px-4 py-2 rounded text-sm font-medium', activeVizType === 'flow' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700']"
                  @click="activeVizType = 'flow'"
                >
                  Process Flow
                </button>
              </template>
              <!-- When only one type eligible: show read-only label so user knows what they're viewing -->
              <span v-else class="px-4 py-2 rounded text-sm font-medium bg-blue-600 text-white">
                {{ activeVizType === 'metro' ? 'Metro Map' : 'Process Flow' }}
              </span>
            </div>

            <!-- Multi-source selector (metro only) -->
            <div v-if="activeVizType === 'metro' && allSources.length > 1" class="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span class="text-xs text-gray-500 font-medium">Additional Sources:</span>
              <label
                v-for="src in allSources"
                :key="src.id"
                class="flex items-center gap-1.5 select-none"
                :class="src.id === sourceId ? 'cursor-default' : 'cursor-pointer'"
              >
                <input
                  type="checkbox"
                  :checked="selectedSourceIds.has(src.id)"
                  :disabled="src.id === sourceId"
                  @change="toggleSourceSelection(src.id)"
                  class="w-3.5 h-3.5"
                  :class="src.id === sourceId ? 'cursor-default' : 'cursor-pointer'"
                />
                <span class="text-xs text-gray-700">{{ src.name }}</span>
              </label>
            </div>

            <!-- Metro map (VIZ-01) — receives filteredPages via metrovizData -->
            <MetrovizMap
              v-if="(activeVizType === 'metro' || !isFlowEligible) && isMetroEligible"
              ref="metrovizMapRef"
              :data="metrovizData"
              :source-title="sourceName"
              @node-click="handleMetroNodeClick"
            />

            <!-- Process flow (VIZ-02) — receives timeframe-filtered pages directly -->
            <FlowDiagram
              v-else-if="isFlowEligible"
              :data="filteredPages"
              :column-mappings="columnMappings"
              @node-click="handleFlowNodeClick"
            />

            <!-- D-10: Notion links list — primary + all visible extra-source pages -->
            <NotionLinksList
              :pages="allVisiblePages"
              :column-mappings="columnMappings"
            />
          </div>

          <!-- Right panel: visibility + timeframe panel -->
          <!-- :key forces re-mount on source navigation, resetting local panel state -->
          <FilterPanel
            :key="sourceId"
            :open="filterPanelOpen"
            :pages="allPagesForPanel"
            :column-mappings="columnMappings"
            :visible-node-ids="allVisibleIds"
            @update:open="filterPanelOpen = $event"
            @toggle-node="handleToggleNode"
            @set-nodes-visible="handleSetNodesVisible"
            @set-timeframe="applyTimeframeToVisibility"
          />
        </div>

        <!-- UI-05: Node detail panel (shown on node click) -->
        <NodeDetailPanel
          :page="selectedPage"
          :column-mappings="columnMappings"
          @close="selectedPage = null"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSourceData } from '@/composables/useSourceData'
import type { SourceApiResponse } from '@/composables/useSourceData'
import { useMetrovizData, mergeMetrovizData } from '@/composables/useMetrovizData'
import { useFilterState } from '@/composables/useFilterState'
import { useUrlState } from '@/composables/useUrlState'
import { useExport } from '@/composables/useExport'
import type { EnrichedPage } from '@/server/utils/relations'

const route = useRoute()
const sourceId = computed(() => route.params.sourceId as string)

// Phase 2: Existing source data fetch
const {
  pages,
  columnMappings,
  sourceName,
  isLoading,
  fetchError,
  isMetroEligible,
  isFlowEligible,
} = useSourceData(sourceId)

// Fetch all configured sources (for header nav + metro multi-source)
const { data: sourcesData } = useFetch('/api/sources')
const allSources = computed(() => sourcesData.value?.sources ?? [])

// Navigate to a different source when user selects from header dropdown
const handleSourceChange = (event: Event) => {
  const selectedId = (event.target as HTMLSelectElement).value
  if (selectedId && selectedId !== sourceId.value) {
    navigateTo(`/visualizations/${selectedId}?vizType=${activeVizType.value}`)
  }
}

// Multi-source selection for metro maps (primary source always included)
const selectedSourceIds = ref<Set<string>>(new Set([sourceId.value]))

watch(sourceId, (newId) => {
  selectedSourceIds.value = new Set([newId])
})

const extraSourceIds = computed(() =>
  [...selectedSourceIds.value].filter(id => id !== sourceId.value)
)

const toggleSourceSelection = (id: string) => {
  if (id === sourceId.value) return
  const next = new Set(selectedSourceIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedSourceIds.value = next
}

// Lazily fetch extra source data when multi-source selection changes
const { data: extraSourcesData, refresh: refreshExtraSources } = useAsyncData(
  'extra-sources',
  async () => {
    if (extraSourceIds.value.length === 0) return [] as SourceApiResponse[]
    return Promise.all(extraSourceIds.value.map(id => $fetch<SourceApiResponse>(`/api/sources/${id}`)))
  }
)

watch(extraSourceIds, () => { refreshExtraSources() })

// Flat array of all pages from extra sources
const extraPages = computed<EnrichedPage[]>(() =>
  (extraSourcesData.value ?? []).flatMap(d => d.pages as EnrichedPage[])
)

// Quick lookup for extra-source page IDs
const extraPageIds = computed(() => new Set(extraPages.value.map(p => p.id)))

// Visibility state for extra-source pages (initialized to all visible when pages arrive)
const extraVisibleIds = ref<Set<string>>(new Set())

watch(extraPages, (newPages, oldPages) => {
  const newIds = new Set(newPages.map(p => p.id))
  const oldIds = new Set((oldPages ?? []).map(p => p.id))
  const next = new Set(extraVisibleIds.value)
  for (const p of newPages) {
    if (!oldIds.has(p.id)) next.add(p.id)
  }
  for (const id of [...next]) {
    if (!newIds.has(id)) next.delete(id)
  }
  extraVisibleIds.value = next
})

// All pages for the FilterPanel (primary + extra sources combined)
const allPagesForPanel = computed<EnrichedPage[]>(() => [
  ...pages.value,
  ...extraPages.value,
])

// Visible pages from all sources — used for the Notion links list at the bottom
const allVisiblePages = computed<EnrichedPage[]>(() => [
  ...filteredPages.value,
  ...(extraSourcesData.value ?? []).flatMap(d =>
    (d.pages as EnrichedPage[]).filter(p => extraVisibleIds.value.has(p.id))
  ),
])

// Combined visible IDs for FilterPanel
const allVisibleIds = computed(() => new Set([
  ...visibleNodeIds.value,
  ...extraVisibleIds.value,
]))

// Route toggle events to primary or extra visibility state
const handleToggleNode = (pageId: string) => {
  if (extraPageIds.value.has(pageId)) {
    const next = new Set(extraVisibleIds.value)
    if (next.has(pageId)) next.delete(pageId)
    else next.add(pageId)
    extraVisibleIds.value = next
  } else {
    toggleNode(pageId)
  }
}

// Phase 3 — UI-04, UI-02: Filter state and node visibility
const {
  filteredPages,
  visibleNodeIds,
  activeFilters,
  toggleNode,
  setHiddenNodes,
  setActiveFilters,
} = useFilterState(pages, columnMappings)

// Phase 3 — UI-06: URL state management
const { urlState, copyShareLink } = useUrlState()

// Phase 3 — UI-03: Viz type (read from URL on mount, fallback to metro)
const activeVizType = ref<'metro' | 'flow'>('metro')

// Phase 3 — UI-05: Selected page for detail panel
const selectedPage = ref<EnrichedPage | null>(null)

// Reset panel state when the user switches sources
watch(sourceId, () => {
  selectedPage.value = null
})

// Parse a YYYY-MM-DD string as local midnight (avoids UTC offset shifting the date).
const parseLocalDate = (s: string): Date => {
  const parts = s.split('-').map(Number)
  return new Date(parts[0]!, (parts[1]! - 1), parts[2]!)
}

// Extract the date value from a page's date property (handles date, formula types).
// Always returns local midnight so comparisons with filter dates are consistent.
const getPageDate = (page: EnrichedPage, datePropName: string): Date | null => {
  const prop = page.properties[datePropName]
  if (!prop) return null
  if (prop.type === 'date') {
    const s = (prop as any).date?.start
    return s ? parseLocalDate(s) : null
  }
  if (prop.type === 'formula') {
    const f = (prop as any).formula
    if (f?.type === 'date') return f.date?.start ? parseLocalDate(f.date.start) : null
    if (f?.type === 'string' && f.string) return parseLocalDate(f.string)
  }
  return null
}

// Applying a timeframe updates visibleNodeIds directly so panel checkboxes reflect it.
// Clearing restores all nodes to visible.
const applyTimeframeToVisibility = (range: { start: string; end: string } | null) => {
  if (!range) {
    setHiddenNodes([])
    extraVisibleIds.value = new Set(extraPages.value.map(p => p.id))
    return
  }
  const start = parseLocalDate(range.start)
  const end = parseLocalDate(range.end)
  end.setHours(23, 59, 59, 999)

  const datePropName = columnMappings.value['date']
  const hiddenIds = pages.value
    .filter(p => {
      if (!datePropName) return true
      const d = getPageDate(p, datePropName)
      return d === null || d < start || d > end
    })
    .map(p => p.id)
  setHiddenNodes(hiddenIds)

  const nextExtra = new Set<string>()
  for (const d of extraSourcesData.value ?? []) {
    const extraDateProp = d.source.columnMappings['date']
    for (const p of d.pages as EnrichedPage[]) {
      if (!extraDateProp) continue
      const dt = getPageDate(p as EnrichedPage, extraDateProp)
      if (dt && dt >= start && dt <= end) nextExtra.add((p as EnrichedPage).id)
    }
  }
  extraVisibleIds.value = nextExtra
}

// Bulk visibility toggle used by FilterPanel group headers
const handleSetNodesVisible = (ids: string[], visible: boolean) => {
  const primaryIds = ids.filter(id => !extraPageIds.value.has(id))
  const extraIds = ids.filter(id => extraPageIds.value.has(id))

  if (primaryIds.length > 0) {
    const allIds = new Set(pages.value.map(p => p.id))
    const newVisible = new Set(visibleNodeIds.value)
    for (const id of primaryIds) {
      if (visible && allIds.has(id)) newVisible.add(id)
      else newVisible.delete(id)
    }
    setHiddenNodes([...allIds].filter(id => !newVisible.has(id)))
  }

  if (extraIds.length > 0) {
    const next = new Set(extraVisibleIds.value)
    for (const id of extraIds) {
      if (visible) next.add(id)
      else next.delete(id)
    }
    extraVisibleIds.value = next
  }
}

// Copy link state for toast feedback
const copyLinkSuccess = ref<boolean | null>(null) // null = not shown, true = success, false = error

// Metroviz component ref for containerId access
const metrovizMapRef = ref<any>(null)

// Computed: expose metroviz container ID for ExportButton (from defineExpose in MetrovizMap)
const metrovizContainerId = computed(() => metrovizMapRef.value?.containerId ?? '')

// Metro map data: visibility state already reflects timeframe (applied via applyTimeframeToVisibility)
const metrovizData = computed(() => {
  const primary = useMetrovizData(filteredPages.value, columnMappings.value, sourceName.value)
  const extras = (extraSourcesData.value ?? []).map(d => {
    const visiblePages = (d.pages as EnrichedPage[]).filter(p => extraVisibleIds.value.has(p.id))
    return useMetrovizData(visiblePages, d.source.columnMappings, d.source.name)
  })
  return extras.length > 0 ? mergeMetrovizData([primary, ...extras]) : primary
})

// Export
const { downloadSVG, isExporting } = useExport()

// Filter panel open/close state (toggled from the header icon button)
const filterPanelOpen = ref(false)

// UI-06: Restore state from URL on mount (shared link restoration)
onMounted(() => {
  const state = urlState.value
  // Restore viz type
  if (state.vizType && (state.vizType === 'metro' || state.vizType === 'flow')) {
    activeVizType.value = state.vizType
  }
  // Restore filters and hidden nodes (after pages load — watch for pages to be available)
  if (state.filters.length > 0 || state.hiddenNodes.length > 0) {
    const unwatch = watch(pages, (newPages) => {
      if (newPages.length > 0) {
        setActiveFilters(state.filters)
        setHiddenNodes(state.hiddenNodes)
        unwatch()
      }
    }, { immediate: true })
  }
})

// UI-06: Copy shareable link (explicit action only — not on every change)
const handleCopyLink = async () => {
  const state = {
    vizType: activeVizType.value,
    filters: activeFilters.value,
    hiddenNodes: pages.value
      .filter(p => !visibleNodeIds.value.has(p.id))
      .map(p => p.id),
  }
  const success = await copyShareLink(state)
  copyLinkSuccess.value = success
  // Clear toast after 2 seconds
  setTimeout(() => { copyLinkSuccess.value = null }, 2000)
}

// UI-05: Node click handler for FlowDiagram
const handleFlowNodeClick = (page: EnrichedPage) => {
  selectedPage.value = page
}

// UI-05: Node click handler for MetrovizMap (receives pageId string or null)
const handleMetroNodeClick = (pageId: string | null) => {
  if (pageId === null) {
    selectedPage.value = null
    return
  }
  const found = pages.value.find(p => p.id === pageId || p.id.replace(/-/g, '') === pageId)
  if (found) selectedPage.value = found
}
</script>
