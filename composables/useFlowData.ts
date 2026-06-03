import type { EnrichedPage } from '@/server/utils/relations'
import type { ColumnMappings } from '@/server/utils/config'

export interface FlowNode {
  id: string
  data: { label: string; page: EnrichedPage }
  position: { x: number; y: number }
}

export interface FlowEdge {
  id: string
  source: string
  target: string
}

/**
 * Transform EnrichedPage[] into Vue Flow nodes and edges.
 *
 * Decision references:
 * - D-15: Only requires 'next' role minimum. No date positioning needed.
 * - D-08: Permissive — pages without a title render as their ID.
 * - Pattern: left-to-right layout with idx * 250 x-spacing (RESEARCH.md pattern 2)
 */
export function useFlowData(
  pages: EnrichedPage[],
  columnMappings: ColumnMappings
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const titlePropName = columnMappings['title']
  const nextPropName = columnMappings['next']

  // Build page ID lookup for edge validation (skip orphaned targets)
  const pageIds = new Set(pages.map(p => p.id))

  const nodes: FlowNode[] = pages.map((page, idx) => {
    // Extract title for label
    let label = page.id.slice(0, 8)
    if (titlePropName) {
      const prop = page.properties[titlePropName]
      if (prop?.type === 'title') {
        label = (prop as any).title?.[0]?.plain_text || label
      } else if (prop?.type === 'rich_text') {
        label = (prop as any).rich_text?.[0]?.plain_text || label
      }
    }

    return {
      id: page.id,
      data: { label, page },
      position: { x: idx * 250, y: 100 },
    }
  })

  const edges: FlowEdge[] = []

  if (nextPropName) {
    for (const page of pages) {
      const prop = page.properties[nextPropName]
      if (!prop || prop.type !== 'relation') continue

      const nextRelations = (prop as any).relation as Array<{ id: string }>
      if (!nextRelations?.length) continue

      for (const { id: targetId } of nextRelations) {
        // D-08: silently skip orphaned targets (deleted pages)
        if (!pageIds.has(targetId)) continue

        edges.push({
          id: `${page.id}->${targetId}`,
          source: page.id,
          target: targetId,
        })
      }
    }
  }

  return { nodes, edges }
}
