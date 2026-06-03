<template>
  <div
    v-if="page"
    class="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-lg border-l border-gray-200 overflow-y-auto z-40"
    role="dialog"
    aria-modal="true"
    :aria-label="`Details for ${pageTitle}`"
  >
    <!-- Header -->
    <div class="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
      <h2 class="font-semibold text-gray-900 truncate">{{ pageTitle }}</h2>
      <button
        class="text-gray-500 hover:text-gray-700 text-lg ml-4 flex-shrink-0"
        @click="emit('close')"
        aria-label="Close detail panel"
      >✕</button>
    </div>

    <!-- Properties -->
    <div class="p-4 space-y-4">
      <div
        v-for="[propName, prop] in Object.entries(page.properties)"
        :key="propName"
        class="border-b border-gray-200 pb-4"
      >
        <p class="text-xs font-medium text-gray-700 mb-1">{{ propName }}</p>
        <p class="text-sm text-gray-900">{{ renderPropValue(prop) }}</p>
      </div>

      <!-- Notion Link -->
      <div class="mt-4 pt-4 border-t border-gray-200">
        <a
          :href="notionLink"
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm text-blue-600 hover:underline"
        >Open in Notion &rarr;</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from 'vue'
import type { EnrichedPage } from '@/server/utils/relations'
import type { ColumnMappings } from '@/server/utils/config'

const props = defineProps<{
  page: EnrichedPage | null
  columnMappings: ColumnMappings
}>()

const emit = defineEmits<{
  'close': []
}>()

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))

const pageTitle = computed(() => {
  if (!props.page) return ''
  const titlePropName = props.columnMappings['title']
  if (titlePropName) {
    const prop = props.page.properties[titlePropName]
    if (prop?.type === 'title') return (prop as any).title?.[0]?.plain_text || 'Untitled'
    if (prop?.type === 'rich_text') return (prop as any).rich_text?.[0]?.plain_text || 'Untitled'
  }
  return props.page.id.slice(0, 8)
})

const notionLink = computed(() => {
  if (!props.page) return ''
  return `https://notion.so/${props.page.id.replace(/-/g, '')}`
})

const renderPropValue = (prop: any): string => {
  if (!prop) return 'empty'
  if (prop.type === 'title') return prop.title?.[0]?.plain_text || 'empty'
  if (prop.type === 'rich_text') return prop.rich_text?.map((t: any) => t.plain_text).join('') || 'empty'
  if (prop.type === 'select') return prop.select?.name || 'Not set'
  if (prop.type === 'multi_select') return prop.multi_select?.map((s: any) => s.name).join(', ') || 'None'
  if (prop.type === 'date') return prop.date?.start || 'No date'
  if (prop.type === 'checkbox') return prop.checkbox ? 'Yes' : 'No'
  if (prop.type === 'number') return prop.number != null ? String(prop.number) : 'empty'
  if (prop.type === 'relation') return `${prop.relation?.length || 0} linked`
  return JSON.stringify(prop)
}
</script>
