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
          <div
            v-if="allSources.length > 0"
            :ref="sourceDropdown.containerRef"
            class="relative min-w-0"
            @keydown.escape="sourceDropdown.close()"
          >
            <button
              type="button"
              class="flex items-center gap-1.5 text-xl font-semibold text-gray-900 hover:text-blue-600 cursor-pointer truncate max-w-xs"
              :aria-label="'Switch source — currently viewing ' + sourceName"
              @click.stop="sourceDropdown.toggle()"
            >
              <span class="truncate">{{ sourceName }}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4 flex-shrink-0 transition-transform"
                :class="sourceDropdown.isOpen.value ? 'rotate-180' : ''"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div
              v-show="sourceDropdown.isOpen.value"
              class="absolute left-0 top-full mt-1 z-50 min-w-48 max-w-xs bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden transition-all duration-150"
              style="transform-origin: top left"
            >
              <button
                v-for="src in allSources"
                :key="src.id"
                type="button"
                class="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 truncate"
                :class="src.id === sourceId ? 'font-semibold text-blue-600 bg-blue-50' : 'text-gray-700'"
                @click="sourceDropdown.close(); goToSource(src.id)"
              >
                {{ src.name }}
              </button>
            </div>
          </div>
          <!-- Fallback while sources are loading -->
          <h1 v-else class="text-xl font-semibold text-gray-900">
            {{ isLoading ? 'Loading...' : sourceName }}
          </h1>
        </div>
        <!-- Icon buttons: export, copy link, filter toggle -->
        <div class="flex items-center gap-1 flex-shrink-0">
          <!-- Download SVG (metro) -->
          <button
            v-if="!isLoading && !fetchError && filteredPages.length > 0 && activeVizType === 'metro'"
            :disabled="isExporting"
            title="Download SVG"
            class="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40"
            @click="downloadSVG(metrovizContainerId)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span>SVG</span>
          </button>

          <!-- Download SVG (flow — now pure SVG, exports cleanly) -->
          <button
            v-if="!isLoading && !fetchError && filteredPages.length > 0 && activeVizType === 'flow'"
            :disabled="isExporting"
            title="Download SVG"
            class="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40"
            @click="downloadSVG('flow-viz-container')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span>SVG</span>
          </button>

          <!-- Download SVG (mermaid) -->
          <button
            v-if="activeVizType === 'mermaid' && !mermaidDiagram.isLoading.value && !mermaidDiagram.fetchError.value && !mermaidDiagram.renderError.value && mermaidDiagram.diagramString.value"
            :disabled="isExporting"
            title="Download SVG"
            class="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40"
            @click="downloadSVG(mermaidDiagram.containerId.value, `visualization-mermaid-${activeMermaidTemplateId}`)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span>SVG</span>
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
        v-else-if="!isMetroEligible && !isFlowEligible && !hasMermaidTemplates"
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
            <!-- Viz type label/toggle (UI-03 + Gap 4 fix + MERM-03 Mermaid buttons) -->
            <div class="mb-4 flex items-center gap-3 flex-wrap">
              <!-- Viz type toggle buttons — shown when any viz type is available -->
              <template v-if="isMetroEligible || isFlowEligible || hasMermaidTemplates">
                <button
                  v-if="isMetroEligible"
                  :class="['px-4 py-2 rounded text-sm font-medium', activeVizType === 'metro' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700']"
                  @click="activeVizType = 'metro'"
                >
                  Metro Map
                </button>
                <button
                  v-if="isFlowEligible"
                  :class="['px-4 py-2 rounded text-sm font-medium', activeVizType === 'flow' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700']"
                  @click="activeVizType = 'flow'"
                >
                  Process Flow
                </button>
                <!-- One button per Mermaid template that references this source (D-08) -->
                <button
                  v-for="tmpl in mermaidTemplates"
                  :key="tmpl.id"
                  :class="['px-4 py-2 rounded text-sm font-medium', activeVizType === 'mermaid' && activeMermaidTemplateId === tmpl.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700']"
                  @click="selectMermaidTemplate(tmpl.id)"
                >{{ tmpl.title }}</button>
              </template>

              <!-- Timeline axis toggle (metro only) -->
              <label v-if="activeVizType === 'metro'" class="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer ml-1">
                <input type="checkbox" v-model="showTimeline" class="w-3.5 h-3.5 cursor-pointer" />
                Timeline axis
              </label>
            </div>

            <!-- Multi-source selector (metro only) -->
            <div v-if="activeVizType === 'metro' && eligibleAdditionalSources.length > 0" class="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span class="text-xs text-gray-500 font-medium">Additional Sources:</span>
              <div
                v-for="src in eligibleAdditionalSources"
                :key="src.id"
                class="flex items-center gap-2"
              >
                <label class="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    :checked="selectedSourceIds.has(src.id)"
                    class="w-3.5 h-3.5 cursor-pointer"
                    @change="toggleSourceSelection(src.id)"
                  />
                  <span class="text-xs text-gray-700">{{ src.name }}</span>
                </label>

                <!-- Mode toggle: only shown when checked AND source has a 'next' role -->
                <template v-if="selectedSourceIds.has(src.id) && 'next' in (src.columnMappings ?? {})">
                  <div class="flex rounded overflow-hidden border border-gray-200 text-[10px]">
                    <button
                      type="button"
                      class="px-1.5 py-0.5"
                      :class="sourceDisplayModes[src.id] === 'milestones' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
                      @click="sourceDisplayModes[src.id] = 'milestones'"
                    >Milestones</button>
                    <button
                      type="button"
                      class="px-1.5 py-0.5 border-l border-gray-200"
                      :class="sourceDisplayModes[src.id] === 'line' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
                      @click="sourceDisplayModes[src.id] = 'line'"
                    >Line</button>
                  </div>
                </template>
              </div>
            </div>

            <!-- Metro map (VIZ-01) — receives filteredPages via metrovizData -->
            <!-- Hidden when Mermaid is active to avoid rendering in background -->
            <MetrovizMap
              v-if="activeVizType !== 'mermaid' && (activeVizType === 'metro' || !isFlowEligible) && isMetroEligible"
              ref="metrovizMapRef"
              :data="metrovizData"
              :source-title="sourceName"
              :show-timeline="showTimeline"
              @node-click="handleMetroNodeClick"
            />

            <!-- Process flow (VIZ-02) — receives timeframe-filtered pages directly -->
            <template v-else-if="activeVizType !== 'mermaid' && isFlowEligible">
              <!-- Flow node attribute picker -->
              <div v-if="flowAttributeOptions.length > 0" class="mb-3 flex items-center gap-2">
                <span class="text-xs text-gray-500 font-medium">Show in nodes:</span>
                <div
                  :ref="attrDropdown.containerRef"
                  class="relative"
                  @keydown.escape="attrDropdown.close()"
                >
                  <button
                    type="button"
                    class="flex items-center gap-1 text-xs border border-gray-200 rounded px-2 py-1 text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                    @click.stop="attrDropdown.toggle()"
                  >
                    <span>{{ flowNodeAttribute || 'None' }}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="w-3 h-3 flex-shrink-0 transition-transform"
                      :class="attrDropdown.isOpen.value ? 'rotate-180' : ''"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div
                    v-show="attrDropdown.isOpen.value"
                    class="absolute left-0 top-full mt-1 z-50 min-w-32 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden transition-all duration-150"
                  >
                    <button
                      type="button"
                      class="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50"
                      :class="!flowNodeAttribute ? 'font-semibold text-blue-600 bg-blue-50' : 'text-gray-700'"
                      @click="flowNodeAttribute = ''; attrDropdown.close()"
                    >None</button>
                    <button
                      v-for="role in flowAttributeOptions"
                      :key="role"
                      type="button"
                      class="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 truncate"
                      :class="flowNodeAttribute === role ? 'font-semibold text-blue-600 bg-blue-50' : 'text-gray-700'"
                      @click="flowNodeAttribute = role; attrDropdown.close()"
                    >{{ role }}</button>
                  </div>
                </div>
              </div>
              <FlowDiagram
                :data="filteredPages"
                :all-pages="pages"
                :column-mappings="columnMappings"
                :node-attribute="flowNodeAttribute || undefined"
                @node-click="handleFlowNodeClick"
              />
            </template>

            <!-- Mermaid diagram (MERM-03) — rendered client-side via mermaid.js -->
            <template v-else-if="activeVizType === 'mermaid' && activeMermaidTemplateId">
              <LoadingSpinner v-if="mermaidDiagram.isLoading.value" />
              <ErrorAlert
                v-else-if="mermaidDiagram.fetchError.value"
                heading="Failed to load diagram data"
                :message="`Could not fetch data for diagram: ${mermaidDiagram.fetchError.value?.message ?? 'Unknown error'}. Check that sources are configured correctly in sources.json and Notion integration is accessible.`"
              />
              <ErrorAlert
                v-else-if="mermaidDiagram.renderError.value"
                heading="Failed to render diagram"
                :message="`Template rendering failed: ${mermaidDiagram.renderError.value} — check the template syntax in config/${activeMermaidTemplateId}.mmd and consult Mermaid docs for valid syntax.`"
              />
              <div v-else class="p-6 bg-white rounded border border-gray-200 min-h-96">
                <div :id="mermaidDiagram.containerId.value" style="display: flex; justify-content: center;"></div>
              </div>
            </template>

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
            :pages="activeVizType === 'mermaid' ? mermaidFakePages : activeVizType === 'flow' ? pages : allPagesForPanel"
            :column-mappings="activeVizType === 'mermaid' ? mermaidColumnMappings : columnMappings"
            :visible-node-ids="activeVizType === 'mermaid' ? mermaidVisibleIds : allVisibleIds"
            :relations-map="activeVizType === 'mermaid' ? relationsMap : undefined"
            @update:open="filterPanelOpen = $event"
            @toggle-node="handleToggleNode"
            @set-nodes-visible="handleSetNodesVisible"
            @set-timeframe="applyTimeframeToVisibility"
            @show-related="handleShowRelated"
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
import { ref, computed, watch, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useSourceData } from '@/composables/useSourceData'
import type { SourceApiResponse } from '@/composables/useSourceData'
import { useMermaidTemplate } from '@/composables/useMermaidTemplate'
import { useMetrovizData, mergeMetrovizData, useMetrovizMilestoneEvents } from '@/composables/useMetrovizData'
import type { MetrovizInputData } from '@/composables/useMetrovizData'
import { useFilterState } from '@/composables/useFilterState'
import { useUrlState } from '@/composables/useUrlState'
import { useExport } from '@/composables/useExport'
import type { EnrichedPage } from '@/server/utils/relations'

const route = useRoute()
const sourceId = computed(() => route.params.sourceId as string)

// Shared factory for click-outside + Escape-aware dropdown instances
function useDropdown() {
  const isOpen = ref(false)
  const containerRef = ref<HTMLElement | null>(null)
  const toggle = () => { isOpen.value = !isOpen.value }
  const close = () => { isOpen.value = false }
  const onDocClick = (e: MouseEvent) => {
    if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
      close()
    }
  }
  onMounted(() => document.addEventListener('click', onDocClick, true))
  onBeforeUnmount(() => document.removeEventListener('click', onDocClick, true))
  return { isOpen, containerRef, toggle, close }
}

const sourceDropdown = useDropdown()
const attrDropdown = useDropdown()

const goToSource = (id: string) => {
  if (id !== sourceId.value) navigateTo(`/visualizations/${id}?vizType=${activeVizType.value}`)
}

// Phase 2: Existing source data fetch
const {
  pages,
  columnMappings,
  sourceName,
  isLoading,
  fetchError,
  isMetroEligible,
  isFlowEligible,
  hasMermaidTemplates,
  mermaidTemplates,
} = useSourceData(sourceId)

// Fetch all configured sources (for header nav + metro multi-source)
const { data: sourcesData } = useFetch('/api/sources')
const allSources = computed(() => sourcesData.value?.sources ?? [])

// Filter additional-source candidates to those eligible as metro overlays:
// - must have 'date' role (milestone overlay, positioned on the timeline axis)
// - must not be the current primary source
// Sources without 'date' cannot be meaningfully displayed on the metro map.
const eligibleAdditionalSources = computed(() =>
  allSources.value.filter(src =>
    src.id !== sourceId.value && 'date' in (src.columnMappings ?? {})
  )
)

// Multi-source selection for metro maps (primary source always included)
const selectedSourceIds = ref<Set<string>>(new Set([sourceId.value]))

watch(sourceId, (newId) => {
  selectedSourceIds.value = new Set([newId])
})

// Per-source display mode: 'line' (full next-graph) or 'milestones' (date-only overlay)
const sourceDisplayModes = reactive<Record<string, 'milestones' | 'line'>>({})

// Initialize display mode for newly eligible sources; never overwrite an existing choice.
watch(eligibleAdditionalSources, (sources) => {
  for (const src of sources) {
    if (!(src.id in sourceDisplayModes)) {
      sourceDisplayModes[src.id] = 'next' in (src.columnMappings ?? {}) ? 'line' : 'milestones'
    }
  }
}, { immediate: true })

// Fit to content when mode switches (milestones ↔ line changes diagram structure)
watch(() => ({ ...sourceDisplayModes }), async () => {
  await nextTick()
  await nextTick()
  metrovizMapRef.value?.fitZoom?.()
})

const extraSourceIds = computed(() =>
  [...selectedSourceIds.value].filter(id => id !== sourceId.value)
)

const toggleSourceSelection = async (id: string) => {
  if (id === sourceId.value) return
  const next = new Set(selectedSourceIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedSourceIds.value = next
  await nextTick()
  await nextTick()
  metrovizMapRef.value?.fitZoom?.()
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

// Route toggle events to primary, extra, or Mermaid visibility state
const handleToggleNode = (pageId: string) => {
  if (activeVizType.value === 'mermaid') {
    const tmplId = activeMermaidTemplateId.value
    const current = mermaidHiddenIdsMap.value[tmplId] ?? new Set<string>()
    const next = new Set(current)
    if (next.has(pageId)) next.delete(pageId)
    else next.add(pageId)
    mermaidHiddenIdsMap.value = { ...mermaidHiddenIdsMap.value, [tmplId]: next }
    return
  }
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
const { fetchSharedState, copyShareLink } = useUrlState()

// Phase 3 — UI-03: Viz type (read from URL on mount, fallback to metro)
// Phase 5 — MERM-03: Extended to include 'mermaid' as a third viz type
const activeVizType = ref<'metro' | 'flow' | 'mermaid'>('metro')

// Phase 5 — MERM-03: Active Mermaid template tracking
const activeMermaidTemplateId = ref<string>('')

function selectMermaidTemplate(templateId: string) {
  activeMermaidTemplateId.value = templateId
  activeVizType.value = 'mermaid'
}

// Hidden node IDs per template — persists across viz type switches so state is remembered
const mermaidHiddenIdsMap = ref<Record<string, Set<string>>>({})

const activeMermaidHiddenIds = computed<Set<string>>(
  () => mermaidHiddenIdsMap.value[activeMermaidTemplateId.value] ?? new Set<string>()
)

// Phase 5 — MERM-03: Mermaid diagram composable (SSR-safe, client-only rendering)
const mermaidDiagram = useMermaidTemplate(activeMermaidTemplateId, activeMermaidHiddenIds)

// Phase 3 — UI-05: Selected page for detail panel
const selectedPage = ref<EnrichedPage | null>(null)

// Reset panel state when the user switches sources
watch(sourceId, () => {
  selectedPage.value = null
  flowNodeAttribute.value = ''
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

// Active timeframe filter range — drives the metro axis domain when set.
const activeTimeframe = ref<{ start: string; end: string } | null>(null)

// Applying a timeframe updates visibleNodeIds directly so panel checkboxes reflect it.
// Clearing restores all nodes to visible.
const applyTimeframeToVisibility = (range: { start: string; end: string } | null) => {
  activeTimeframe.value = range
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
  if (activeVizType.value === 'mermaid') {
    const tmplId = activeMermaidTemplateId.value
    const current = mermaidHiddenIdsMap.value[tmplId] ?? new Set<string>()
    const next = new Set(current)
    for (const id of ids) {
      if (visible) next.delete(id)
      else next.add(id)
    }
    mermaidHiddenIdsMap.value = { ...mermaidHiddenIdsMap.value, [tmplId]: next }
    return
  }

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

// Fake EnrichedPage objects built from Mermaid rows — lets FilterPanel show node checkboxes
// using the same pattern as Metro/Flow without changing the FilterPanel component.
const mermaidFakePages = computed<EnrichedPage[]>(() =>
  mermaidDiagram.rows.value.map((row) => ({
    id: row.id,
    properties: {
      __mermaid_title: {
        type: 'title' as const,
        title: [{ plain_text: row.title || row.id.slice(0, 8) }],
      },
      __mermaid_source: {
        type: 'select' as const,
        select: { name: row.sourceName || 'Unknown' },
      },
    },
    resolvedRelations: {},
  })) as unknown as EnrichedPage[]
)

// Maps role 'title' and 'parent' → synthetic property keys used in mermaidFakePages.
// 'parent' triggers FilterPanel's group-by-source rendering with source-level toggle.
const mermaidColumnMappings = { title: '__mermaid_title', parent: '__mermaid_source' }

// Tracks which node's "show related" is currently active — null = no related-filter active
const activeRelatedNodeId = ref<string | null>(null)

// Maps each Mermaid row's page ID to its _relations array — passed to FilterPanel
// so it knows which nodes have a "show related" button (D-11)
const relationsMap = computed<Record<string, string[]> | undefined>(() => {
  const rows = mermaidDiagram.rows.value
  if (!rows.length) return undefined
  return Object.fromEntries(rows.map(r => [r.id, r._relations ?? []]))
})

// Handle "show related" button click from FilterPanel (D-09, D-10)
// Computes visible set = clicked node + its 1-hop _relations neighbours
// Clicking the already-active node resets all nodes to visible
const handleShowRelated = (pageId: string) => {
  const tmplId = activeMermaidTemplateId.value
  const allRows = mermaidDiagram.rows.value

  // Toggle off: clicking the active node resets all to visible
  if (activeRelatedNodeId.value === pageId) {
    activeRelatedNodeId.value = null
    mermaidHiddenIdsMap.value = { ...mermaidHiddenIdsMap.value, [tmplId]: new Set<string>() }
    return
  }

  activeRelatedNodeId.value = pageId
  const targetRow = allRows.find(r => r.id === pageId)
  if (!targetRow) return

  // Visible set: selected node + directly related page IDs that exist in allRows
  const allRowIds = new Set(allRows.map(r => r.id))
  const visibleIds = new Set([pageId, ...(targetRow._relations ?? []).filter(id => allRowIds.has(id))])

  // Hide all rows not in the visible set
  const hiddenIds = allRows.map(r => r.id).filter(id => !visibleIds.has(id))
  mermaidHiddenIdsMap.value = {
    ...mermaidHiddenIdsMap.value,
    [tmplId]: new Set(hiddenIds),
  }
}

// Visible IDs for Mermaid (inverse of hidden)
const mermaidVisibleIds = computed<Set<string>>(
  () => new Set(mermaidDiagram.rows.value.map((r) => r.id).filter((id) => !activeMermaidHiddenIds.value.has(id)))
)

// Copy link state for toast feedback
const copyLinkSuccess = ref<boolean | null>(null) // null = not shown, true = success, false = error

// Metroviz component ref for containerId access
const metrovizMapRef = ref<any>(null)

// Computed: expose metroviz container ID for ExportButton (from defineExpose in MetrovizMap)
const metrovizContainerId = computed(() => metrovizMapRef.value?.containerId ?? '')

// Snap an ISO date to the first day of its month.
const snapMonthStart = (d: string) => d.slice(0, 7) + '-01'
// Snap an ISO date to the first day of the following month.
const snapNextMonthStart = (d: string) => {
  const dt = new Date(d + 'T12:00:00Z')
  dt.setUTCMonth(dt.getUTCMonth() + 1, 1)
  return dt.toISOString().slice(0, 10)
}

// Metro map data: visibility state already reflects timeframe (applied via applyTimeframeToVisibility)
const metrovizData = computed(() => {
  // Only include datasets that actually have visible pages — empty datasets return a
  // '2026-Q1'/'2026-Q4' fallback timeline that would expand the axis to the maximum.
  const primaryData = filteredPages.value.length > 0
    ? useMetrovizData(filteredPages.value, columnMappings.value, sourceName.value)
    : null
  const extrasData = (extraSourcesData.value ?? [])
    .map(d => {
      const visiblePages = (d.pages as EnrichedPage[]).filter(p => extraVisibleIds.value.has(p.id))
      if (visiblePages.length === 0) return null
      const mode = sourceDisplayModes[d.source.id] ?? ('next' in (d.source.columnMappings ?? {}) ? 'line' : 'milestones')
      if (mode === 'milestones') {
        return useMetrovizMilestoneEvents(visiblePages, d.source.columnMappings, d.source.name)
      } else {
        return useMetrovizData(visiblePages, d.source.columnMappings, d.source.name)
      }
    })
    .filter((d): d is MetrovizInputData => d !== null)

  const visibleDatasets = primaryData ? [primaryData, ...extrasData] : extrasData

  // When no pages are visible, fall back to the timeframe bounds (if active) so the
  // axis shows the area the user is looking at rather than the empty default.
  if (visibleDatasets.length === 0) {
    const empty = useMetrovizData([], columnMappings.value, sourceName.value)
    if (activeTimeframe.value) {
      return {
        ...empty,
        timeline: {
          start: snapMonthStart(activeTimeframe.value.start),
          end: snapNextMonthStart(activeTimeframe.value.end),
        },
      }
    }
    return empty
  }

  return visibleDatasets.length === 1 ? visibleDatasets[0]! : mergeMetrovizData(visibleDatasets)
})

// Export
const { downloadSVG, isExporting } = useExport()

// Filter panel open/close state (toggled from the header icon button)
const filterPanelOpen = ref(false)

// Metro timeline axis visibility
const showTimeline = ref(true)

// Flow diagram: which secondary attribute to show inside nodes
const flowNodeAttribute = ref<string>('')

// Roles available for display in flow nodes (exclude structural roles)
const flowAttributeOptions = computed(() => {
  const exclude = new Set(['title', 'next', 'parent'])
  return Object.keys(columnMappings.value).filter(role => !exclude.has(role))
})

// UI-06: Restore state from URL on mount (shared link restoration)
onMounted(async () => {
  const query = useRoute().query

  // ?vizType= direct navigation from dashboard — processed before share-state fetch
  if (query.vizType === 'flow') activeVizType.value = 'flow'

  // ?template= deep-link Mermaid template — processed before share-state fetch
  if (query.template && typeof query.template === 'string') {
    const templateQuery = query.template
    const unwatch = watch(mermaidTemplates, (templates) => {
      if (!templates) return
      const match = templates.find((t) => t.id === templateQuery)
      if (match) {
        selectMermaidTemplate(match.id)
        unwatch()
      }
    }, { immediate: true })
  }

  // Shared state (?s=token or legacy ?v=) — overrides direct params when present
  const state = await fetchSharedState()
  if (!state) return

  // Restore Mermaid view — pre-load hidden IDs then activate the template
  if (state.vizType === 'mermaid' && state.mermaidTemplateId) {
    if (state.mermaidHiddenIds?.length) {
      mermaidHiddenIdsMap.value = {
        ...mermaidHiddenIdsMap.value,
        [state.mermaidTemplateId]: new Set(state.mermaidHiddenIds),
      }
    }
    const targetId = state.mermaidTemplateId
    const unwatchMermaid = watch(mermaidTemplates, (templates) => {
      const match = templates.find((t) => t.id === targetId)
      if (match) { selectMermaidTemplate(match.id); unwatchMermaid() }
    }, { immediate: true })
  } else if (state.vizType === 'metro' || state.vizType === 'flow') {
    activeVizType.value = state.vizType
  }

  // Restore all page-dependent state inside a watch so it runs after data loads.
  // This includes: filters, hiddenNodes (with invert-aware decode), selectedSourceIds,
  // and sourceDisplayModes.
  const hasStateToRestore = (
    state.filters.length > 0 ||
    state.hiddenNodes.length > 0 ||
    state.selectedSourceIds.length > 0 ||
    Object.keys(state.sourceDisplayModes).length > 0
  )
  if (hasStateToRestore) {
    const unwatch = watch(pages, (newPages) => {
      if (newPages.length > 0) {
        // Restore filters
        setActiveFilters(state.filters)

        // Restore hidden nodes — backward compat: apply inversion if stored as visible IDs
        const hiddenNodes = state.invertedSelection
          ? newPages.filter(p => !state.hiddenNodes.includes(p.id)).map(p => p.id)
          : state.hiddenNodes
        setHiddenNodes(hiddenNodes)

        // Restore extra source selections (primary source already in selectedSourceIds)
        if (state.selectedSourceIds.length > 0) {
          selectedSourceIds.value = new Set([sourceId.value, ...state.selectedSourceIds])
        }

        // Restore per-source display modes
        for (const [id, mode] of Object.entries(state.sourceDisplayModes)) {
          sourceDisplayModes[id] = mode as 'milestones' | 'line'
        }

        unwatch()
      }
    }, { immediate: true })
  }
})

// UI-06: Copy shareable link (explicit action only — not on every change)
const handleCopyLink = async () => {
  // Extra source IDs (primary is implicit from the route — excluded here)
  const extraSrcIds = [...selectedSourceIds.value].filter(id => id !== sourceId.value)

  // Per-source display modes — only keep entries for currently selected extra sources
  const activeModes: Record<string, string> = {}
  for (const id of extraSrcIds) {
    if (sourceDisplayModes[id]) activeModes[id] = sourceDisplayModes[id]
  }

  const isMermaid = activeVizType.value === 'mermaid'
  const state: import('@/utils/state-encoding').ViewState = {
    vizType: activeVizType.value,
    mermaidTemplateId: isMermaid ? activeMermaidTemplateId.value : undefined,
    mermaidHiddenIds: isMermaid ? [...activeMermaidHiddenIds.value] : [],
    filters: activeFilters.value,
    hiddenNodes: isMermaid ? [] : pages.value.filter(p => !visibleNodeIds.value.has(p.id)).map(p => p.id),
    invertedSelection: false,
    selectedSourceIds: extraSrcIds,
    sourceDisplayModes: activeModes,
  }
  const success = await copyShareLink(state, pages.value.length)
  copyLinkSuccess.value = success
  // Clear toast after 2 seconds
  setTimeout(() => { copyLinkSuccess.value = null }, 2000)
}

// Re-render when diagram string changes OR when switching back to mermaid.
// The container div is destroyed by v-if when leaving mermaid, so switching back
// creates a fresh empty div — we must re-inject the SVG even if diagramString
// hasn't changed.
watch(
  [() => mermaidDiagram.diagramString.value, activeVizType],
  async ([newStr, vizType]) => {
    if (!newStr || vizType !== 'mermaid') return
    await nextTick()
    await mermaidDiagram.renderDiagram(mermaidDiagram.containerId.value)
  }
)

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
