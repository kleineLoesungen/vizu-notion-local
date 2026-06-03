<template>
  <div
    class="bg-gray-50 border-l border-gray-200 overflow-y-auto flex-shrink-0"
    :class="isCollapsed ? 'w-10' : 'w-64 p-4'"
    role="region"
    aria-label="Visibility"
  >
    <!-- Header row: toggle button + title -->
    <div class="flex items-center p-2" :class="isCollapsed ? 'justify-center' : 'justify-between'">
      <h2 v-if="!isCollapsed" class="font-semibold text-sm text-gray-900">Visibility</h2>
      <button
        class="text-gray-500 hover:text-gray-900 focus:outline-none text-base leading-none"
        :aria-label="isCollapsed ? 'Expand visibility panel' : 'Collapse visibility panel'"
        @click="isCollapsed = !isCollapsed"
      >{{ isCollapsed ? '›' : '‹' }}</button>
    </div>

    <!-- Panel body — only shown when expanded -->
    <template v-if="!isCollapsed">

      <!-- Timeframe filter (only when source has a date role) -->
      <div v-if="hasDateRole" class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-xs font-medium text-gray-700">Timeframe</h3>
          <button
            v-if="activeShortcut"
            class="text-xs text-blue-600 hover:underline"
            @click="clearTimeframe"
          >Clear</button>
        </div>
        <div class="flex flex-col gap-1">
          <button
            v-for="[key, label] in shortcuts"
            :key="key"
            class="px-2 py-1.5 rounded text-xs font-medium text-left transition-colors"
            :class="activeShortcut === key
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'"
            @click="applyShortcut(key as ShortcutKey)"
          >{{ label }}</button>
        </div>
      </div>

      <!-- Node Visibility -->
      <div>
        <h3 class="text-xs font-medium text-gray-700 mb-2">Node Visibility</h3>
        <div class="space-y-1 overflow-y-auto" style="max-height: 20rem;">
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
import { ref, computed } from 'vue'
import type { EnrichedPage } from '@/server/utils/relations'
import type { ColumnMappings } from '@/server/utils/config'

type ShortcutKey = '4w' | '3m' | '6m'

const shortcuts: [ShortcutKey, string][] = [
  ['4w', 'Next 4 weeks'],
  ['3m', 'Next 3 months'],
  ['6m', 'Next 6 months'],
]

const props = defineProps<{
  pages: EnrichedPage[]
  columnMappings: ColumnMappings
  visibleNodeIds: Set<string>
}>()

const emit = defineEmits<{
  'toggle-node': [pageId: string]
  'set-timeframe': [range: { start: string; end: string } | null]
}>()

const isCollapsed = ref(true)
const activeShortcut = ref<ShortcutKey | null>(null)
const hasDateRole = computed(() => !!props.columnMappings['date'])

const applyShortcut = (key: ShortcutKey) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(today)
  if (key === '4w') end.setDate(end.getDate() + 28)
  else if (key === '3m') end.setMonth(end.getMonth() + 3)
  else if (key === '6m') end.setMonth(end.getMonth() + 6)
  activeShortcut.value = key
  emit('set-timeframe', {
    start: today.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  })
}

const clearTimeframe = () => {
  activeShortcut.value = null
  emit('set-timeframe', null)
}

const getPageTitle = (page: EnrichedPage): string => {
  const titlePropName = props.columnMappings['title']
  if (titlePropName) {
    const prop = page.properties[titlePropName]
    if (prop?.type === 'title') return (prop as any).title?.[0]?.plain_text || page.id.slice(0, 8)
    if (prop?.type === 'rich_text') return (prop as any).rich_text?.[0]?.plain_text || page.id.slice(0, 8)
  }
  // Fallback for pages from other sources with different column mappings
  for (const prop of Object.values(page.properties)) {
    if (prop.type === 'title') return (prop as any).title?.[0]?.plain_text || page.id.slice(0, 8)
  }
  return page.id.slice(0, 8)
}
</script>
