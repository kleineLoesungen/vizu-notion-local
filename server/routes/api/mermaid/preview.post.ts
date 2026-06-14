import matter from 'gray-matter'
import Handlebars from 'handlebars'
import { getConfig } from '../../../utils/config'
import { queryDatabase, retrievePage } from '../../../utils/notion'
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import type { Source } from '../../../utils/config'

import { getTemplates, buildClassDefs, resetClassAccumulator, getClassAssignments, SHAPE_RX } from '../../../utils/templates'

// ── Shared helpers (same logic as [templateId].get.ts) ──────────────────────

function extractPropertyValue(prop: any): string {
  if (!prop) return ''
  switch (prop.type) {
    case 'title': return prop.title?.[0]?.plain_text ?? ''
    case 'rich_text': return prop.rich_text?.[0]?.plain_text ?? ''
    case 'select': return prop.select?.name ?? ''
    case 'multi_select': return prop.multi_select?.map((o: any) => o.name).join(', ') ?? ''
    case 'date': return prop.date?.start ?? ''
    case 'checkbox': return String(prop.checkbox ?? '')
    case 'number': return String(prop.number ?? '')
    case 'url': return prop.url ?? ''
    case 'email': return prop.email ?? ''
    case 'phone_number': return prop.phone_number ?? ''
    case 'relation': return ''
    default: return ''
  }
}

function extractPageTitle(page: PageObjectResponse): string {
  for (const prop of Object.values(page.properties)) {
    if ((prop as any).type === 'title') return (prop as any).title?.[0]?.plain_text ?? ''
  }
  return ''
}

async function resolveRelationValues(
  rows: Record<string, string>[],
  pages: PageObjectResponse[],
  source: Source,
  titleMap: Map<string, string>
): Promise<void> {
  if (pages.length === 0) return
  const samplePage = pages[0]
  const relationRoles: Array<{ role: string; notionPropName: string }> = []
  for (const [role, notionPropName] of Object.entries(source.columnMappings)) {
    const prop = samplePage.properties[notionPropName as string]
    if ((prop as any)?.type === 'relation') relationRoles.push({ role, notionPropName: notionPropName as string })
  }
  if (relationRoles.length === 0) return

  const toFetch = new Set<string>()
  for (const page of pages) {
    for (const { notionPropName } of relationRoles) {
      const prop = page.properties[notionPropName]
      if ((prop as any)?.type === 'relation') {
        const firstId = ((prop as any).relation as Array<{ id: string }>)?.[0]?.id
        if (firstId && !titleMap.has(firstId)) toFetch.add(firstId)
      }
    }
  }

  if (toFetch.size > 0) {
    const results = await Promise.allSettled(
      Array.from(toFetch).map(async (pageId) => {
        const page = await retrievePage(pageId)
        return { pageId, title: extractPageTitle(page) }
      })
    )
    for (const r of results) {
      if (r.status === 'fulfilled') titleMap.set(r.value.pageId, r.value.title)
    }
  }

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    const row = rows[i]!
    for (const { role, notionPropName } of relationRoles) {
      const prop = page.properties[notionPropName]
      if ((prop as any)?.type === 'relation') {
        const firstId = ((prop as any).relation as Array<{ id: string }>)?.[0]?.id
        row[role] = firstId ? (titleMap.get(firstId) ?? '') : ''
      }
    }
  }
}

// ── Handler ──────────────────────────────────────────────────────────────────

const HB_KEYWORDS = new Set(['else', 'this', 'log'])

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const rawContent: string = body?.content ?? ''

  if (!rawContent.trim()) {
    throw createError({ statusCode: 400, message: 'content is required' })
  }

  const { data, content: bodyText } = matter(rawContent)
  const sourceNames: string[] = Array.isArray(data.sources) ? data.sources : []
  const styles: Record<string, any> = (typeof data.styles === 'object' && data.styles !== null)
    ? data.styles
    : {}

  // No sources declared — treat as raw Mermaid, return as-is
  if (sourceNames.length === 0) {
    return { diagramString: bodyText.trim() }
  }

  const config = getConfig()
  const context: Record<string, Record<string, string>[]> = {}
  const titleMap = new Map<string, string>()

  for (const sourceName of sourceNames) {
    const source = config.sources.find(s => s.name === sourceName)
    if (!source) {
      throw createError({
        statusCode: 400,
        message: `Unknown source '${sourceName}'. Configured sources: ${config.sources.map(s => s.name).join(', ')}`,
      })
    }

    let pages: PageObjectResponse[]
    try {
      pages = await queryDatabase(source.databaseId)
    } catch (err: any) {
      throw createError({ statusCode: 502, message: `Failed to fetch '${sourceName}': ${err.message}` })
    }

    const mappedRows = pages.map((page: any) => {
      const row: Record<string, string> = {}
      row['id'] = page.id
      for (const [role, notionPropName] of Object.entries(source.columnMappings)) {
        row[role] = extractPropertyValue(page.properties?.[notionPropName as string])
      }
      titleMap.set(page.id, row['title'] ?? '')
      return row
    })

    await resolveRelationValues(mappedRows, pages, source, titleMap)
    context[sourceName] = mappedRows
  }

  const rewrittenBody = bodyText.split('\n').map(line => {
    const trimmed = line.trimStart()
    if (trimmed.startsWith('classDef ') || trimmed.startsWith('subgraph ')) {
      return line
    }
    return line.replace(
      /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g,
      (match, name) => {
        if (HB_KEYWORDS.has(name)) return match
        const style = styles[name]
        if (!style) return `{{nodeId "${name}" ${name}}}`
        const hasColor = !!(style.fill || style.stroke || style['stroke-width'] != null)
        const hasRxShape = !!(style.shape && SHAPE_RX[style.shape])
        const shapePart = (style.shape && !hasRxShape) ? ` shape="${style.shape}"` : ''
        const needsClass = hasColor || hasRxShape
        const classPart = needsClass ? ` className="cls_${name}"` : ''
        return `{{nodeId "${name}" ${name}${shapePart}${classPart}}}`
      }
    )
  }).join('\n')

  let diagramString: string
  try {
    resetClassAccumulator()
    diagramString = Handlebars.compile(rewrittenBody)(context)
  } catch (err: any) {
    throw createError({ statusCode: 400, message: `Template error: ${err.message}` })
  }

  const classDefBlock = buildClassDefs(styles)
  if (classDefBlock) {
    const lines = diagramString.split('\n')
    const firstContentIdx = lines.findIndex(l => l.trim().length > 0)
    lines.splice(firstContentIdx + 1, 0, classDefBlock)
    diagramString = lines.join('\n')
  }

  // Append `class nodeId cls_X` for every styled node — guarantees class applies
  // even when a node was first defined without :::className (e.g. as a standalone title).
  const classAssignments = getClassAssignments()
  if (classAssignments.size > 0) {
    const byClass = new Map<string, string[]>()
    for (const [nodeId, cls] of classAssignments) {
      if (!byClass.has(cls)) byClass.set(cls, [])
      byClass.get(cls)!.push(nodeId)
    }
    const classLines = Array.from(byClass.entries())
      .map(([cls, ids]) => `class ${ids.join(',')} ${cls}`)
      .join('\n')
    diagramString = diagramString.trimEnd() + '\n' + classLines
  }

  return { diagramString }
})
