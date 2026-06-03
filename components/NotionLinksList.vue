<template>
  <div v-if="pages.length > 0" class="mt-8 pt-4 border-t border-gray-200">
    <h2 class="text-sm font-semibold text-gray-900 mb-2">Notion Pages</h2>
    <table class="w-full text-sm">
      <tbody>
        <tr v-for="page in sortedPages" :key="page.id" class="border-b border-gray-100 last:border-0">
          <td class="py-1 pr-4 text-gray-500 whitespace-nowrap w-28">{{ getPageDate(page) }}</td>
          <td class="py-1">
            <a
              :href="getNotionLink(page)"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-600 hover:underline"
            >{{ getPageTitle(page) }}</a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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
  for (const prop of Object.values(page.properties)) {
    if (prop.type === 'title') return (prop as any).title?.[0]?.plain_text || page.id.slice(0, 8)
  }
  return page.id.slice(0, 8)
}

const getPageDate = (page: EnrichedPage): string => {
  const datePropName = props.columnMappings['date']
  if (datePropName) {
    const prop = page.properties[datePropName]
    if (prop?.type === 'date') {
      const start = (prop as any).date?.start
      if (start) return start
    }
  }
  return '—'
}

const sortedPages = computed(() =>
  [...props.pages].sort((a, b) => {
    const da = getPageDate(a)
    const db = getPageDate(b)
    if (da === '—' && db === '—') return 0
    if (da === '—') return 1
    if (db === '—') return -1
    return da.localeCompare(db)
  })
)

const getNotionLink = (page: EnrichedPage): string =>
  `https://notion.so/${page.id.replace(/-/g, '')}`
</script>
