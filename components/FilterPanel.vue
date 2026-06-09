<template>
  <div
    v-if="open"
    class="w-72 p-4 bg-gray-50 border-l border-gray-200 overflow-y-auto flex-shrink-0"
    role="region"
    aria-label="Visibility"
  >
    <!-- Panel header: title + close button -->
    <div class="flex items-center justify-between mb-3">
      <h2 class="font-semibold text-sm text-gray-900">Visibility</h2>
      <button
        class="text-gray-400 hover:text-gray-700 focus:outline-none"
        aria-label="Close visibility panel"
        @click="emit('update:open', false)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- ── Timeframe (only when source has a date role) ── -->
      <div v-if="hasDateRole" class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-xs font-medium text-gray-700">Timeframe</h3>
          <button v-if="activeShortcut" class="text-xs text-blue-600 hover:underline" @click="clearTimeframe">
            Clear
          </button>
        </div>

        <!-- Shortcut buttons -->
        <div class="flex flex-col gap-1">
          <button
            v-for="[key, label] in shortcuts"
            :key="key"
            class="px-2 py-1.5 rounded text-xs font-medium text-left transition-colors"
            :class="activeShortcut === key
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'"
            @click="applyShortcut(key as '4w' | '3m' | '6m')"
          >{{ label }}</button>

          <!-- Custom range toggle -->
          <button
            class="px-2 py-1.5 rounded text-xs font-medium text-left transition-colors"
            :class="activeShortcut === 'custom'
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'"
            @click="activeShortcut === 'custom' ? clearTimeframe() : (activeShortcut = 'custom')"
          >Custom range…</button>
        </div>

        <!-- Custom date inputs -->
        <div v-if="activeShortcut === 'custom'" class="mt-2 flex flex-col gap-1">
          <input
            :value="customStart"
            type="date"
            class="w-full px-2 py-1 text-xs border border-gray-300 rounded text-gray-900"
            aria-label="Start date"
            @change="setCustomStart"
          />
          <input
            :value="customEnd"
            type="date"
            class="w-full px-2 py-1 text-xs border border-gray-300 rounded text-gray-900"
            aria-label="End date"
            @change="setCustomEnd"
          />
          <button
            class="mt-1 px-2 py-1.5 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
            :disabled="!canApplyCustom"
            @click="applyCustom"
          >Apply</button>
        </div>
      </div>

      <!-- ── Node Visibility ── -->
      <div v-if="showNodeVisibility !== false">
        <h3 class="text-xs font-medium text-gray-700 mb-2">Node Visibility</h3>

        <!-- Grouped by parent (when parent role is configured) -->
        <div v-if="hasParentGroups" class="space-y-2 overflow-y-auto" style="max-height: 20rem;">
          <div v-for="group in parentGroups" :key="group.key">
            <!-- Group header row -->
            <div
              class="flex items-center gap-2 py-0.5 cursor-pointer group"
              @click="toggleGroup(group)"
            >
              <input
                type="checkbox"
                class="w-4 h-4 flex-shrink-0 pointer-events-none"
                :checked="groupAllChecked(group)"
                :indeterminate="groupIndeterminate(group)"
                @click.prevent
              />
              <span class="text-xs font-semibold text-gray-800 truncate">{{ group.label }}</span>
            </div>
            <!-- Individual nodes in group -->
            <label
              v-for="page in group.pages"
              :key="page.id"
              class="flex items-center gap-2 text-xs cursor-pointer pl-5 py-0.5"
            >
              <input
                type="checkbox"
                :checked="visibleNodeIds.has(page.id)"
                @change="onToggleNode(page.id)"
                class="w-3.5 h-3.5"
              />
              <span class="truncate text-gray-700">{{ getPageTitle(page) }}</span>
            </label>
          </div>
        </div>

        <!-- Flat list (no parent role configured) -->
        <div v-else class="space-y-1 overflow-y-auto" style="max-height: 20rem;">
          <label
            v-for="page in pages"
            :key="page.id"
            class="flex items-center gap-2 text-xs cursor-pointer"
          >
            <input
              type="checkbox"
              :checked="visibleNodeIds.has(page.id)"
              @change="onToggleNode(page.id)"
              class="w-4 h-4"
            />
            <span class="truncate text-gray-700">{{ getPageTitle(page) }}</span>
          </label>
        </div>

        <p v-if="pages.length === 0" class="text-xs text-gray-400">No pages loaded</p>
      </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { EnrichedPage } from '@/server/utils/relations'
import type { ColumnMappings } from '@/server/utils/config'

type ShortcutKey = '4w' | '3m' | '6m' | 'custom'

const shortcuts: [string, string][] = [
  ['4w', 'Next 4 weeks'],
  ['3m', 'Next 3 months'],
  ['6m', 'Next 6 months'],
]

const props = defineProps<{
  open: boolean
  pages: EnrichedPage[]
  columnMappings: ColumnMappings
  visibleNodeIds: Set<string>
  showNodeVisibility?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'toggle-node': [pageId: string]
  'set-nodes-visible': [ids: string[], visible: boolean]
  'set-timeframe': [range: { start: string; end: string } | null]
}>()

const activeShortcut = ref<ShortcutKey | null>(null)
const customStart = ref('')
const customEnd = ref('')
const hasDateRole = computed(() => !!props.columnMappings['date'])
const canApplyCustom = computed(() => customStart.value.length === 10 && customEnd.value.length === 10)

// ── Timeframe shortcuts ──

const applyShortcut = (key: '4w' | '3m' | '6m') => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(today)
  if (key === '4w') end.setDate(end.getDate() + 28)
  else if (key === '3m') end.setMonth(end.getMonth() + 3)
  else if (key === '6m') end.setMonth(end.getMonth() + 6)
  activeShortcut.value = key
  emit('set-timeframe', {
    start: today.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  })
}

const setCustomStart = (e: Event) => { customStart.value = (e.target as HTMLInputElement).value }
const setCustomEnd   = (e: Event) => { customEnd.value   = (e.target as HTMLInputElement).value }

const applyCustom = () => {
  if (!canApplyCustom.value) return
  emit('set-timeframe', { start: customStart.value, end: customEnd.value })
}

// Wrapper: clearing the active shortcut when the user manually toggles a node
// signals that the timeframe is no longer the source of truth for the selection.
const onToggleNode = (pageId: string) => {
  activeShortcut.value = null
  emit('toggle-node', pageId)
}

const clearTimeframe = () => {
  activeShortcut.value = null
  customStart.value = ''
  customEnd.value = ''
  emit('set-timeframe', null)
}

// ── Page title extraction (with fallback for extra-source pages) ──

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

// ── Parent grouping ──

const extractTitleFromAnyPage = (p: any): { key: string; label: string } => {
  for (const prop of Object.values(p.properties ?? {})) {
    if ((prop as any).type === 'title') {
      return { key: p.id, label: (prop as any).title?.[0]?.plain_text || p.id.slice(0, 8) }
    }
  }
  return { key: p.id, label: p.id.slice(0, 8) }
}

const getParentGroup = (page: EnrichedPage): { key: string; label: string } => {
  const parentPropName = props.columnMappings['parent']

  if (parentPropName) {
    // Resolved relations for primary-source parent role
    const resolved = page.resolvedRelations[parentPropName]
    if (resolved && resolved.length > 0) return extractTitleFromAnyPage(resolved[0]!)

    // Raw relation fallback
    const prop = page.properties[parentPropName]
    if (prop?.type === 'relation') {
      const rels = (prop as any).relation as Array<{ id: string }>
      if (rels && rels.length > 0) return { key: rels[0]!.id, label: rels[0]!.id.slice(0, 8) }
    }
    if (prop?.type === 'select') {
      const name = (prop as any).select?.name
      if (name) return { key: name, label: name }
    }
  }

  // For extra-source pages: scan all resolvedRelations for any resolved parent
  for (const relList of Object.values(page.resolvedRelations)) {
    if (relList && relList.length > 0) return extractTitleFromAnyPage(relList[0]!)
  }

  return { key: '__none__', label: 'Ungrouped' }
}

interface PageGroup { key: string; label: string; pages: EnrichedPage[] }

const parentGroups = computed((): PageGroup[] => {
  const map = new Map<string, PageGroup>()
  for (const page of props.pages) {
    const { key, label } = getParentGroup(page)
    if (!map.has(key)) map.set(key, { key, label, pages: [] })
    map.get(key)!.pages.push(page)
  }
  return [...map.values()]
})

const hasParentGroups = computed(() =>
  parentGroups.value.length > 1 ||
  (parentGroups.value.length === 1 && parentGroups.value[0]!.key !== '__none__')
)

// ── Group toggle helpers ──

const groupAllChecked = (g: PageGroup) => g.pages.every(p => props.visibleNodeIds.has(p.id))
const groupIndeterminate = (g: PageGroup) => !groupAllChecked(g) && g.pages.some(p => props.visibleNodeIds.has(p.id))

const toggleGroup = (g: PageGroup) => {
  activeShortcut.value = null
  const makeVisible = !groupAllChecked(g)
  emit('set-nodes-visible', g.pages.map(p => p.id), makeVisible)
}
</script>
