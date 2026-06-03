<template>
  <div class="flow-canvas w-full" style="height: 600px; border: 1px solid #e5e7eb;">
    <VueFlow
      v-if="nodes.length > 0"
      :nodes="nodes"
      :edges="edges"
      :default-viewport="{ zoom: 1 }"
      fit-view-on-init
    >
      <template #node-default="{ data }">
        <div
          style="background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 8px; padding: 12px 16px; font-size: 14px; font-weight: 400; min-width: 120px; text-align: center;"
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

const flowData = computed(() => useFlowData(props.data, props.columnMappings))
const nodes = computed(() => flowData.value.nodes)
const edges = computed(() => flowData.value.edges)
</script>

<style scoped>
.flow-canvas {
  background: #ffffff;
}
</style>
