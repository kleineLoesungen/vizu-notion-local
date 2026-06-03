<template>
  <div id="flow-viz-container" class="flow-canvas w-full" style="height: 600px; border: 1px solid #e5e7eb;">
    <VueFlow
      v-if="nodes.length > 0"
      :nodes="nodes"
      :edges="edges"
      :default-viewport="{ zoom: 1 }"
      fit-view-on-init
    >
      <template #node-default="{ data }">
        <div
          @click="emit('node-click', data.page)"
          style="background: #ffffff; border: 2px solid #1e293b; border-radius: 6px; padding: 10px 16px; font-size: 13px; font-weight: 600; color: #0f172a; min-width: 120px; text-align: center; white-space: nowrap; cursor: pointer;"
        >
          {{ data.label }}
        </div>
      </template>
    </VueFlow>
    <div v-else class="flex items-center justify-center h-full text-gray-500 text-sm">
      No items to display in this source.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VueFlow } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import { useFlowData } from '@/composables/useFlowData'
import type { EnrichedPage } from '@/server/utils/relations'
import type { ColumnMappings } from '@/server/utils/config'

const props = defineProps<{
  data: EnrichedPage[]
  columnMappings: ColumnMappings
}>()

const emit = defineEmits<{
  'node-click': [page: EnrichedPage]
}>()

const flowData = computed(() => useFlowData(props.data, props.columnMappings))
const nodes = computed(() => flowData.value.nodes)
const edges = computed(() => flowData.value.edges)
</script>

<style scoped>
.flow-canvas {
  background: #ffffff;
}
</style>
