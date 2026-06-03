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
      <!-- Node Visibility -->
      <div>
        <h3 class="text-xs font-medium text-gray-700 mb-2">Node Visibility</h3>
        <div class="space-y-1 overflow-y-auto" style="max-height: 24rem;">
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

const props = defineProps<{
  pages: EnrichedPage[]
  columnMappings: ColumnMappings
  visibleNodeIds: Set<string>
}>()

const emit = defineEmits<{
  'toggle-node': [pageId: string]
}>()

const isCollapsed = ref(true)

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
