<template>
  <div
    class="bg-gray-50 border-l border-gray-200 overflow-y-auto flex-shrink-0"
    :class="isCollapsed ? 'w-10' : 'w-64 p-4'"
    role="region"
    aria-label="Filters"
  >
    <!-- Header row: toggle button + title -->
    <div class="flex items-center p-2" :class="isCollapsed ? 'justify-center' : 'justify-between'">
      <h2 v-if="!isCollapsed" class="font-semibold text-sm text-gray-900">Filters &amp; Visibility</h2>
      <button
        class="text-gray-500 hover:text-gray-900 focus:outline-none text-base leading-none"
        :aria-label="isCollapsed ? 'Expand filters panel' : 'Collapse filters panel'"
        @click="isCollapsed = !isCollapsed"
      >{{ isCollapsed ? '›' : '‹' }}</button>
    </div>

    <!-- Panel body — only shown when expanded -->
    <template v-if="!isCollapsed">
      <!-- Active Filters -->
      <div class="mb-4">
        <h3 class="text-xs font-medium text-gray-700 mb-2">Active Filters</h3>
        <div
          v-for="(filter, idx) in activeFilters"
          :key="idx"
          class="flex items-center justify-between gap-2 mb-2 bg-white p-2 rounded text-xs"
        >
          <span class="truncate text-gray-800">{{ filter.propertyName }} = {{ filter.value }}</span>
          <button
            class="text-red-600 hover:text-red-900 text-xs cursor-pointer flex-shrink-0"
            @click="emit('remove-filter', idx)"
            :aria-label="`Remove filter: ${filter.propertyName} = ${filter.value}`"
          >✕</button>
        </div>
        <p v-if="activeFilters.length === 0" class="text-xs text-gray-400">No active filters</p>
      </div>

      <!-- Filter by Property -->
      <div class="mb-4">
        <h3 class="text-xs font-medium text-gray-700 mb-2">Filter by Property</h3>
        <select
          v-model="selectedProperty"
          class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
          aria-label="Select property to filter"
        >
          <option value="">Select property...</option>
          <option v-for="key in Object.keys(columnMappings)" :key="key" :value="key">
            {{ key }}
          </option>
        </select>
        <input
          v-model="filterValue"
          type="text"
          placeholder="Filter value..."
          class="w-full px-2 py-1 text-sm border border-gray-300 rounded mt-2"
          aria-label="Filter value"
          @keydown.enter="handleApplyFilter"
        />
        <button
          class="mt-2 px-3 py-2 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 w-full"
          @click="handleApplyFilter"
        >Apply Filter</button>
      </div>

      <!-- Node Visibility -->
      <div>
        <h3 class="text-xs font-medium text-gray-700 mb-2">Node Visibility</h3>
        <div class="space-y-1 overflow-y-auto" style="max-height: 16rem;">
          <label
            v-for="page in pages"
            :key="page.id"
            class="flex items-center gap-2 text-xs cursor-pointer"
          >
            <input
              type="checkbox"
              :checked="visibleNodeIds.has(page.id)"
              @change="emit('toggle-node', page.id)"
              class="w-4 h-4"
            />
            <span class="truncate text-gray-700">{{ getPageTitle(page) }}</span>
          </label>
        </div>
        <p v-if="pages.length === 0" class="text-xs text-gray-400">No pages loaded</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { EnrichedPage } from '@/server/utils/relations'
import type { ColumnMappings } from '@/server/utils/config'
import type { FilterCriteria } from '@/utils/state-encoding'

const props = defineProps<{
  pages: EnrichedPage[]
  columnMappings: ColumnMappings
  visibleNodeIds: Set<string>
  activeFilters: FilterCriteria[]
}>()

const emit = defineEmits<{
  'toggle-node': [pageId: string]
  'apply-filter': [criteria: FilterCriteria]
  'remove-filter': [index: number]
}>()

const isCollapsed = ref(false)

const selectedProperty = ref('')
const filterValue = ref('')

const getPageTitle = (page: EnrichedPage): string => {
  const titlePropName = props.columnMappings['title']
  if (titlePropName) {
    const prop = page.properties[titlePropName]
    if (prop?.type === 'title') return (prop as any).title?.[0]?.plain_text || page.id.slice(0, 8)
    if (prop?.type === 'rich_text') return (prop as any).rich_text?.[0]?.plain_text || page.id.slice(0, 8)
  }
  return page.id.slice(0, 8)
}

const handleApplyFilter = () => {
  if (!selectedProperty.value || !filterValue.value) return
  emit('apply-filter', {
    propertyName: selectedProperty.value,
    operator: 'equals',
    value: filterValue.value,
  })
  filterValue.value = ''
}
</script>
