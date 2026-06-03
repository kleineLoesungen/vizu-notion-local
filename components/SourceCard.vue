<template>
  <div class="p-4 rounded border border-gray-200 bg-white hover:shadow-md transition-shadow">
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

      <!-- No viz type available -->
      <span
        v-if="!isMetroEligible && !isFlowEligible"
        class="text-xs text-gray-400 py-2"
      >
        No visualization type available
      </span>

      <!-- Refresh button -->
      <button
        class="px-3 py-2 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
        :class="{ 'opacity-50 cursor-not-allowed': isRefreshing }"
        :disabled="isRefreshing"
        @click="emit('refresh')"
      >
        {{ isRefreshing ? 'Refreshing...' : 'Refresh' }}
      </button>
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
}

const props = defineProps<Props>()

const emit = defineEmits<{
  navigate: [vizType: 'metro' | 'flow']
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
