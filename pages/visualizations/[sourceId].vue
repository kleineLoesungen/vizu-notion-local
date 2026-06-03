<template>
  <div class="min-h-screen bg-white p-6">
    <!-- Page header -->
    <div class="mb-4">
      <NuxtLink to="/" class="text-sm text-blue-600 hover:underline mb-2 block">← Back to sources</NuxtLink>
      <h1 class="text-xl font-semibold text-gray-900">
        {{ isLoading ? 'Loading...' : `Visualization: ${sourceName}` }}
      </h1>
    </div>

    <!-- Loading state -->
    <LoadingSpinner v-if="isLoading" />

    <!-- Error state -->
    <ErrorAlert
      v-else-if="fetchError"
      heading="Failed to load visualization data"
      :message="`Check that your Notion integration token is valid and the database is accessible. (${fetchError.message ?? 'Unknown error'})`"
    />

    <!-- Empty state: source has no items -->
    <div
      v-else-if="!isLoading && pages.length === 0"
      class="p-4 rounded text-gray-600"
      style="border: 1px solid #d1d5db; background: #f3f4f6;"
    >
      <p class="font-semibold mb-1">No items in this source</p>
      <p class="text-sm">The Notion database contains no pages matching the current query.</p>
    </div>

    <!-- Not viz-eligible -->
    <div
      v-else-if="!isMetroEligible && !isFlowEligible"
      class="p-4 rounded text-gray-600"
      style="border: 1px solid #ef4444; background: #fee2e2;"
    >
      <p class="font-semibold text-red-600 mb-1">Cannot visualize this source</p>
      <p class="text-sm text-gray-700">The source is missing required role mappings for any visualization type. Add a 'next' role to columnMappings in sources.json to enable flow visualization, or add both 'date' and 'next' roles for metro map.</p>
    </div>

    <!-- Visualization area -->
    <template v-else>
      <!-- Viz type toggle (shown when both types are available — D-06) -->
      <div v-if="isMetroEligible && isFlowEligible" class="mb-4 flex gap-2">
        <button
          :class="['px-4 py-2 rounded text-sm font-medium', activeVizType === 'metro' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700']"
          @click="activeVizType = 'metro'"
        >
          Metro Map
        </button>
        <button
          :class="['px-4 py-2 rounded text-sm font-medium', activeVizType === 'flow' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700']"
          @click="activeVizType = 'flow'"
        >
          Process Flow
        </button>
      </div>

      <!-- Metro map (VIZ-01) -->
      <MetrovizMap
        v-if="(activeVizType === 'metro' || !isFlowEligible) && isMetroEligible"
        :data="metrovizData"
        :source-title="sourceName"
      />

      <!-- Process flow (VIZ-02) -->
      <FlowDiagram
        v-else-if="isFlowEligible"
        :data="pages"
        :column-mappings="columnMappings"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSourceData } from '@/composables/useSourceData'
import { useMetrovizData } from '@/composables/useMetrovizData'

const route = useRoute()
const sourceId = computed(() => route.params.sourceId as string)

const {
  pages,
  columnMappings,
  sourceName,
  isLoading,
  fetchError,
  isMetroEligible,
  isFlowEligible,
} = useSourceData(sourceId)

// Default to metro map when both types are eligible (D-16)
const activeVizType = ref<'metro' | 'flow'>('metro')

// Transform pages to Metroviz format (computed — reactive to page changes)
const metrovizData = computed(() => useMetrovizData(pages.value, columnMappings.value, sourceName.value))
</script>
