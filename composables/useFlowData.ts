import type { EnrichedPage } from '@/server/utils/relations'
import type { ColumnMappings } from '@/server/utils/config'

export interface FlowNode {
  id: string
  data: { label: string; subLabel: string; page: EnrichedPage }
  position: { x: number; y: number }
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  type: 'smoothstep'
  markerEnd: { type: 'arrowclosed'; color: string; width: number; height: number }
}

const NODE_WIDTH = 160
const X_SPACING = 200   // horizontal gap between siblings at the same depth
const Y_SPACING = 120   // vertical gap between depth levels

function computeLayout(ids: string[], edges: FlowEdge[]): Map<string, { x: number; y: number }> {
  const children = new Map<string, string[]>()
  const inDegree = new Map<string, number>()

  for (const id of ids) {
    children.set(id, [])
    inDegree.set(id, 0)
  }
  for (const edge of edges) {
    children.get(edge.source)?.push(edge.target)
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
  }

  // Kahn's BFS: assign each node the max depth across all incoming paths
  const level = new Map<string, number>()
  const queue: string[] = []

  for (const id of ids) {
    if (inDegree.get(id) === 0) {
      level.set(id, 0)
      queue.push(id)
    }
  }

  let i = 0
  while (i < queue.length) {
    const id = queue[i++]
    const lvl = level.get(id)!
    for (const childId of children.get(id) ?? []) {
      const next = lvl + 1
      if ((level.get(childId) ?? -1) < next) level.set(childId, next)
      const remaining = inDegree.get(childId)! - 1
      inDegree.set(childId, remaining)
      if (remaining === 0) queue.push(childId)
    }
  }

  // Fallback level for isolated nodes or cycles
  let maxLevel = Math.max(0, ...level.values())
  for (const id of ids) {
    if (!level.has(id)) level.set(id, ++maxLevel)
  }

  // Top-to-bottom: depth level → Y axis; siblings at same level → X axis (centered)
  const byLevel = new Map<number, string[]>()
  for (const [id, lvl] of level) {
    if (!byLevel.has(lvl)) byLevel.set(lvl, [])
    byLevel.get(lvl)!.push(id)
  }

  const positions = new Map<string, { x: number; y: number }>()
  for (const [lvl, group] of byLevel) {
    const totalWidth = (group.length - 1) * (NODE_WIDTH + X_SPACING)
    group.forEach((id, j) => {
      positions.set(id, {
        x: j * (NODE_WIDTH + X_SPACING) - totalWidth / 2,
        y: lvl * Y_SPACING,
      })
    })
  }

  return positions
}

function extractSubLabel(prop: any): string {
  if (!prop) return ''
  switch (prop.type) {
    case 'date':
      return prop.date?.start ?? ''
    case 'rich_text':
      return prop.rich_text?.[0]?.plain_text ?? ''
    case 'title':
      return prop.title?.[0]?.plain_text ?? ''
    case 'select':
      return prop.select?.name ?? ''
    case 'status':
      return prop.status?.name ?? ''
    case 'multi_select':
      return prop.multi_select?.map((s: any) => s.name).join(', ') ?? ''
    case 'people':
      return prop.people?.map((p: any) => p.name ?? p.id).join(', ') ?? ''
    case 'checkbox':
      return prop.checkbox ? 'Yes' : 'No'
    case 'number':
      return String(prop.number ?? '')
    case 'formula': {
      const f = prop.formula
      if (!f) return ''
      if (f.type === 'string') return f.string ?? ''
      if (f.type === 'number') return String(f.number ?? '')
      if (f.type === 'boolean') return f.boolean ? 'Yes' : 'No'
      if (f.type === 'date') return f.date?.start ?? ''
      return ''
    }
    default:
      return ''
  }
}

export function useFlowData(
  pages: EnrichedPage[],
  columnMappings: ColumnMappings,
  nodeAttribute?: string,
  allPages?: EnrichedPage[]
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const titlePropName = columnMappings['title']
  const nextPropName = columnMappings['next']

  const visibleIds = new Set(pages.map(p => p.id))
  const edges: FlowEdge[] = []

  if (nextPropName) {
    // Build full adjacency from ALL pages (or visible-only if allPages not provided)
    const sourcePages = allPages ?? pages
    const allIds = new Set(sourcePages.map(p => p.id))
    const adj = new Map<string, string[]>()
    for (const page of sourcePages) {
      const prop = page.properties[nextPropName]
      if (!prop || prop.type !== 'relation') continue
      const targets = ((prop as any).relation as Array<{ id: string }>)
        ?.filter(r => allIds.has(r.id))
        ?.map(r => r.id) ?? []
      if (targets.length) adj.set(page.id, targets)
    }

    // For each visible source: BFS through hidden nodes to reach visible targets.
    // This preserves connectivity when intermediate nodes are filtered out.
    const edgeSeen = new Set<string>()
    for (const srcPage of pages) {
      const queue = [...(adj.get(srcPage.id) ?? [])]
      const visited = new Set<string>([srcPage.id])
      while (queue.length) {
        const curr = queue.shift()!
        if (visited.has(curr)) continue
        visited.add(curr)
        if (visibleIds.has(curr)) {
          const edgeId = `${srcPage.id}->${curr}`
          if (!edgeSeen.has(edgeId)) {
            edgeSeen.add(edgeId)
            edges.push({
              id: edgeId,
              source: srcPage.id,
              target: curr,
              type: 'smoothstep',
              markerEnd: { type: 'arrowclosed', color: '#1e293b', width: 25, height: 25 },
            })
          }
          // Don't traverse through visible nodes — their outgoing edges are covered by their own BFS
        } else {
          for (const next of (adj.get(curr) ?? [])) {
            if (!visited.has(next)) queue.push(next)
          }
        }
      }
    }
  }

  const positions = computeLayout(Array.from(visibleIds), edges)

  const nodes: FlowNode[] = pages.map((page) => {
    let label = page.id.slice(0, 8)
    if (titlePropName) {
      const prop = page.properties[titlePropName]
      if (prop?.type === 'title') {
        label = (prop as any).title?.[0]?.plain_text || label
      } else if (prop?.type === 'rich_text') {
        label = (prop as any).rich_text?.[0]?.plain_text || label
      }
    }

    let subLabel = ''
    if (nodeAttribute) {
      const subPropName = columnMappings[nodeAttribute]
      if (subPropName) {
        const subProp = page.properties[subPropName]
        if (subProp) subLabel = extractSubLabel(subProp)
      }
    }

    return {
      id: page.id,
      data: { label, subLabel, page },
      position: positions.get(page.id) ?? { x: 0, y: 0 },
    }
  })

  return { nodes, edges }
}
