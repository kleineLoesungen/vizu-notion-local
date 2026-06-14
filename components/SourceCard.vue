<template>
  <div class="relative p-4 rounded border border-gray-200 bg-white hover:shadow-md transition-shadow">
    <!-- Refresh icon button (absolute top-right) -->
    <button
      class="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      :class="{ 'animate-spin': isRefreshing }"
      :disabled="isRefreshing"
      :title="isRefreshing ? 'Refreshing…' : 'Refresh'"
      @click="emit('refresh')"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    </button>

    <!-- Source name -->
    <p class="font-semibold text-gray-900 text-sm">{{ source.name }}</p>

    <!-- Last fetched timestamp -->
    <p class="text-xs text-gray-500 mt-1">
      <template v-if="lastFetched">Last fetched: {{ lastFetched }}</template>
      <span v-else class="text-gray-400">Never fetched</span>
    </p>

    <!-- Buttons row -->
    <div class="flex gap-2 mt-4 flex-wrap">
      <!-- Metro Map button (shown when eligible) -->
      <button
        v-if="isMetroEligible"
        class="px-3 py-2 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
        @click="emit('navigate', 'metro')"
      >
        Metro Map
      </button>

      <!-- Process Flow button (shown when eligible) -->
      <button
        v-if="isFlowEligible"
        class="px-3 py-2 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
        @click="emit('navigate', 'flow')"
      >
        Process Flow
      </button>

      <!-- Mermaid diagram template buttons -->
      <button
        v-for="tmpl in mermaidTemplates"
        :key="tmpl.id"
        class="px-3 py-2 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
        @click="emit('navigate-template', tmpl.id)"
      >
        {{ tmpl.title }}
      </button>

      <!-- No viz type available -->
      <span
        v-if="!isMetroEligible && !isFlowEligible && !mermaidTemplates.length"
        class="text-xs text-gray-400 py-2"
      >
        No visualization type available
      </span>

    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  source: {
    id: string
    name: string
    databaseId: string
    columnMappings: Record<string, string>
  }
  lastFetched?: string
  isRefreshing?: boolean
  mermaidTemplates?: Array<{ id: string; title: string }>
}

const props = withDefaults(defineProps<Props>(), {
  mermaidTemplates: () => [],
})

const emit = defineEmits<{
  navigate: [vizType: 'metro' | 'flow']
  'navigate-template': [templateId: string]
  refresh: []
}>()

// Derive eligible viz types from columnMappings keys
const isMetroEligible = computed(
  () =>
    Object.keys(props.source.columnMappings).includes('date') &&
    Object.keys(props.source.columnMappings).includes('next')
)

const isFlowEligible = computed(() =>
  Object.keys(props.source.columnMappings).includes('next')
)
</script>
