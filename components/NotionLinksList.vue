<template>
  <div v-if="pages.length > 0" class="mt-8 pt-4 border-t border-gray-200">
    <h2 class="text-sm font-semibold text-gray-900 mb-2">Notion Pages</h2>
    <ul class="space-y-1">
      <li v-for="page in pages" :key="page.id">
        <a
          :href="getNotionLink(page)"
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm text-blue-600 hover:underline"
        >{{ getPageTitle(page) }}</a>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { EnrichedPage } from '@/server/utils/relations'
import type { ColumnMappings } from '@/server/utils/config'

const props = defineProps<{
  pages: EnrichedPage[]
  columnMappings: ColumnMappings
}>()

const getPageTitle = (page: EnrichedPage): string => {
  const titlePropName = props.columnMappings['title']
  if (titlePropName) {
    const prop = page.properties[titlePropName]
    if (prop?.type === 'title') return (prop as any).title?.[0]?.plain_text || page.id.slice(0, 8)
    if (prop?.type === 'rich_text') return (prop as any).rich_text?.[0]?.plain_text || page.id.slice(0, 8)
  }
  // Fallback for pages from extra sources with different column mappings
  for (const prop of Object.values(page.properties)) {
    if (prop.type === 'title') return (prop as any).title?.[0]?.plain_text || page.id.slice(0, 8)
  }
  return page.id.slice(0, 8)
}

const getNotionLink = (page: EnrichedPage): string =>
  `https://notion.so/${page.id.replace(/-/g, '')}`
</script>
