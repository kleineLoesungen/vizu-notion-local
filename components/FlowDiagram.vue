<template>
  <div id="flow-viz-container" class="flow-canvas w-full overflow-auto">
    <svg
      v-if="nodes.length > 0"
      :width="svgW"
      :height="svgH"
      :viewBox="`0 0 ${svgW} ${svgH}`"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <marker
          id="flow-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
        </marker>
      </defs>

      <!-- Edges (drawn below nodes) -->
      <path
        v-for="edge in edges"
        :key="edge.id"
        :d="edgePath(edge)"
        stroke="#94a3b8"
        stroke-width="1.5"
        fill="none"
        marker-end="url(#flow-arrow)"
      />

      <!-- Nodes -->
      <g
        v-for="node in nodes"
        :key="node.id"
        :transform="`translate(${ox + node.position.x}, ${oy + node.position.y})`"
        style="cursor: pointer"
        @click="emit('node-click', node.data.page)"
      >
        <rect
          :width="NW"
          :height="NH"
          rx="6"
          fill="white"
          stroke="#1e293b"
          stroke-width="2"
        />
        <text
          :x="NW / 2"
          :y="NH / 2 + 5"
          text-anchor="middle"
          dominant-baseline="middle"
          font-size="12"
          font-weight="600"
          fill="#0f172a"
          font-family="system-ui,-apple-system,sans-serif"
        >{{ truncate(node.data.label) }}</text>
      </g>
    </svg>

    <div v-else class="flex items-center justify-center h-32 text-gray-500 text-sm">
      No items to display in this source.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFlowData, type FlowEdge } from '@/composables/useFlowData'
import type { EnrichedPage } from '@/server/utils/relations'
import type { ColumnMappings } from '@/server/utils/config'

const props = defineProps<{
  data: EnrichedPage[]
  columnMappings: ColumnMappings
}>()

const emit = defineEmits<{
  'node-click': [page: EnrichedPage]
}>()

// Node dimensions — must match useFlowData's NODE_WIDTH (160) for correct edge endpoints
const NW = 160
const NH = 44
const PAD = 40

const flowData = computed(() => useFlowData(props.data, props.columnMappings))
const nodes = computed(() => flowData.value.nodes)
const edges = computed(() => flowData.value.edges)

const nodeMap = computed(() => new Map(nodes.value.map(n => [n.id, n])))

// Offset to shift all node positions so the leftmost/topmost node starts at PAD
const ox = computed(() => {
  if (!nodes.value.length) return PAD
  return PAD - Math.min(...nodes.value.map(n => n.position.x))
})
const oy = computed(() => {
  if (!nodes.value.length) return PAD
  return PAD - Math.min(...nodes.value.map(n => n.position.y))
})

const svgW = computed(() => {
  if (!nodes.value.length) return 400
  return Math.max(...nodes.value.map(n => ox.value + n.position.x + NW)) + PAD
})
const svgH = computed(() => {
  if (!nodes.value.length) return 200
  return Math.max(...nodes.value.map(n => oy.value + n.position.y + NH)) + PAD
})

// Cubic bezier: source bottom-center → target top-center
const edgePath = (edge: FlowEdge): string => {
  const src = nodeMap.value.get(edge.source)
  const tgt = nodeMap.value.get(edge.target)
  if (!src || !tgt) return ''
  const x1 = ox.value + src.position.x + NW / 2
  const y1 = oy.value + src.position.y + NH
  const x2 = ox.value + tgt.position.x + NW / 2
  const y2 = oy.value + tgt.position.y
  const cy = (y1 + y2) / 2
  return `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`
}

const truncate = (s: string, max = 18) => s.length > max ? s.slice(0, max - 1) + '…' : s
</script>

<style scoped>
.flow-canvas {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  min-height: 200px;
}
</style>
