<template>
  <div id="flow-viz-container" class="flow-canvas w-full">
    <svg
      v-if="nodes.length > 0"
      ref="svgRef"
      width="100%"
      height="100%"
      style="min-height: 400px; display: block"
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

      <g :transform="zoomTransform">
        <!-- Edges (drawn below nodes) -->
        <path
          v-for="edge in edges"
          :key="edge.id"
          :d="edgePath(edge)"
          stroke="#94a3b8"
          stroke-width="1.5"
          stroke-opacity="0.65"
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
            :height="nr(node.id).nh"
            rx="6"
            fill="white"
            stroke="#1e293b"
            stroke-width="2"
          />
          <!-- Title lines (word-wrapped, max 2) -->
          <text
            v-for="(line, i) in nr(node.id).titleLines"
            :key="'t' + i"
            :x="NW / 2"
            :y="nr(node.id).titleY0 + i * TITLE_LH"
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="12"
            font-weight="600"
            fill="#0f172a"
            font-family="system-ui,-apple-system,sans-serif"
          >{{ line }}</text>
          <!-- Sub-label lines (word-wrapped, max 2) -->
          <text
            v-for="(line, i) in nr(node.id).subLines"
            :key="'s' + i"
            :x="NW / 2"
            :y="nr(node.id).subY0 + i * SUB_LH"
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="10"
            font-weight="400"
            fill="#64748b"
            font-family="system-ui,-apple-system,sans-serif"
          >{{ line }}</text>
        </g>
      </g>
    </svg>

    <div v-else class="flex items-center justify-center h-32 text-gray-500 text-sm">
      No items to display in this source.
    </div>
    <div class="zoom-hint">⌃ Ctrl + scroll to zoom · drag to pan</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { useFlowData, type FlowEdge } from '@/composables/useFlowData'
import type { EnrichedPage } from '@/server/utils/relations'
import type { ColumnMappings } from '@/server/utils/config'

const props = defineProps<{
  data: EnrichedPage[]
  allPages?: EnrichedPage[]
  columnMappings: ColumnMappings
  nodeAttribute?: string
}>()

const emit = defineEmits<{
  'node-click': [page: EnrichedPage]
}>()

// ── Layout constants ────────────────────────────────────────────────────────
const NW = 160          // node width (must match useFlowData NODE_WIDTH)
const PAD = 40          // canvas padding
const TITLE_LH = 15     // title line-height (font-size 12)
const SUB_LH = 13       // sub-label line-height (font-size 10)
const TITLE_CHARS = 18  // ~6.8px/char × 18 ≈ 122px < 140px usable
const SUB_CHARS = 22    // ~6px/char × 22 ≈ 132px < 140px usable
const SEP = 5           // gap between title block and sub-label block

// ── Word wrap ───────────────────────────────────────────────────────────────
function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  if (!text) return []
  const words = text.split(/\s+/)
  const lines: string[] = []
  let cur = ''
  for (const word of words) {
    if (lines.length >= maxLines) break
    const safe = word.length > maxChars ? word.slice(0, maxChars - 1) + '–' : word
    if (!cur) {
      cur = safe
    } else if ((cur + ' ' + word).length <= maxChars) {
      cur += ' ' + word
    } else {
      lines.push(cur)
      if (lines.length >= maxLines) { cur = ''; break }
      cur = safe
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur)
  return lines
}

// ── Per-node render info ────────────────────────────────────────────────────
interface NodeRender { nh: number; titleLines: string[]; titleY0: number; subLines: string[]; subY0: number }

const nodeRenderMap = computed((): Map<string, NodeRender> => {
  const map = new Map<string, NodeRender>()
  for (const node of nodes.value) {
    const titleLines = wrapText(node.data.label, TITLE_CHARS, 2)
    const subLines = node.data.subLabel ? wrapText(node.data.subLabel, SUB_CHARS, 2) : []
    const titleBlockH = titleLines.length * TITLE_LH
    const subBlockH = subLines.length > 0 ? SEP + subLines.length * SUB_LH : 0
    const contentH = titleBlockH + subBlockH
    const nh = Math.max(44, Math.ceil((contentH + 20) / 2) * 2)  // min 44, even number
    const blockTopY = (nh - contentH) / 2
    const titleY0 = blockTopY + TITLE_LH / 2
    const subY0 = blockTopY + titleBlockH + SEP + SUB_LH / 2
    map.set(node.id, { nh, titleLines, titleY0, subLines, subY0 })
  }
  return map
})

// Shorthand for template
const nr = (id: string) => nodeRenderMap.value.get(id)!

// ── Data ────────────────────────────────────────────────────────────────────
const flowData = computed(() => useFlowData(props.data, props.columnMappings, props.nodeAttribute, props.allPages))
const nodes = computed(() => flowData.value.nodes)
const edges = computed(() => flowData.value.edges)
const nodeMap = computed(() => new Map(nodes.value.map(n => [n.id, n])))

const ox = computed(() => {
  if (!nodes.value.length) return PAD
  return PAD - Math.min(...nodes.value.map(n => n.position.x))
})
const oy = computed(() => {
  if (!nodes.value.length) return PAD
  return PAD - Math.min(...nodes.value.map(n => n.position.y))
})

// ── Edge spread: sort sibling edges by target/source x so they fan out naturally ──
const outEdgeMap = computed(() => {
  const map = new Map<string, FlowEdge[]>()
  for (const edge of edges.value) {
    if (!map.has(edge.source)) map.set(edge.source, [])
    map.get(edge.source)!.push(edge)
  }
  // Sort each group by target x so left-targets get left-side exit points
  for (const [, group] of map) {
    group.sort((a, b) => (nodeMap.value.get(a.target)?.position.x ?? 0) - (nodeMap.value.get(b.target)?.position.x ?? 0))
  }
  return map
})

const inEdgeMap = computed(() => {
  const map = new Map<string, FlowEdge[]>()
  for (const edge of edges.value) {
    if (!map.has(edge.target)) map.set(edge.target, [])
    map.get(edge.target)!.push(edge)
  }
  // Sort each group by source x so left-sources arrive at left-side entry points
  for (const [, group] of map) {
    group.sort((a, b) => (nodeMap.value.get(a.source)?.position.x ?? 0) - (nodeMap.value.get(b.source)?.position.x ?? 0))
  }
  return map
})

// ── Edges: spread exit/entry x across node width to eliminate overlap ─────────
const edgePath = (edge: FlowEdge): string => {
  const src = nodeMap.value.get(edge.source)
  const tgt = nodeMap.value.get(edge.target)
  if (!src || !tgt) return ''

  const srcGroup = outEdgeMap.value.get(edge.source) ?? []
  const srcIdx = srcGroup.findIndex(e => e.id === edge.id)
  const srcFrac = srcGroup.length > 1 ? (srcIdx + 1) / (srcGroup.length + 1) : 0.5

  const tgtGroup = inEdgeMap.value.get(edge.target) ?? []
  const tgtIdx = tgtGroup.findIndex(e => e.id === edge.id)
  const tgtFrac = tgtGroup.length > 1 ? (tgtIdx + 1) / (tgtGroup.length + 1) : 0.5

  const x1 = ox.value + src.position.x + srcFrac * NW
  const y1 = oy.value + src.position.y + (nodeRenderMap.value.get(edge.source)?.nh ?? 44)
  const x2 = ox.value + tgt.position.x + tgtFrac * NW
  const y2 = oy.value + tgt.position.y
  const cy = (y1 + y2) / 2
  return `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`
}

// ── Zoom / pan (D3) ──────────────────────────────────────────────────────────
const svgRef = ref<SVGSVGElement | null>(null)
const zoomTransform = ref('translate(0,0) scale(1)')
let zoomBehavior: any = null
let d3Module: any = null

async function initZoom() {
  await nextTick()
  if (!svgRef.value) return
  if (!d3Module) {
    d3Module = (window as any).d3 ?? await import('d3')
    if (!(window as any).d3) (window as any).d3 = d3Module
  }
  zoomTransform.value = 'translate(0,0) scale(1)'
  zoomBehavior = d3Module.zoom()
    .scaleExtent([0.15, 5])
    .filter((event: any) => event.type !== 'wheel' || event.ctrlKey || event.metaKey)
    .on('zoom', (event: any) => { zoomTransform.value = event.transform.toString() })
  d3Module.select(svgRef.value).call(zoomBehavior).on('dblclick.zoom', null)
}

watch(() => nodes.value.length, () => initZoom(), { immediate: true })

onBeforeUnmount(() => {
  if (svgRef.value && d3Module) d3Module.select(svgRef.value).on('.zoom', null)
})
</script>

<style scoped>
.flow-canvas {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  min-height: 200px;
  max-height: 70vh;
  overflow: hidden;
  position: relative;
}
.flow-canvas svg { cursor: grab; }
.flow-canvas svg:active { cursor: grabbing; }
.zoom-hint {
  position: absolute;
  bottom: 8px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 11px;
  color: #9ca3af;
  pointer-events: none;
  user-select: none;
}
</style>
