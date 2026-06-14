import { getTemplates } from '../../../utils/templates'
import { getConfig } from '../../../utils/config'
import { queryDatabase, retrievePage } from '../../../utils/notion'
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import type { Source } from '../../../utils/config'

// Build classDef lines for styles entries that declare color properties.
// Only entries with at least one of fill/stroke/stroke-width emit a classDef line.
function buildClassDefs(styles: Record<string, { shape?: string; fill?: string; stroke?: string; 'stroke-width'?: number }>): string {
  const lines: string[] = []
  for (const [attrName, entry] of Object.entries(styles)) {
    const hasColor = entry.fill || entry.stroke || entry['stroke-width'] != null
    if (!hasColor) continue
    const parts: string[] = []
    if (entry.fill) parts.push(`fill:${entry.fill}`)
    if (entry.stroke) parts.push(`stroke:${entry.stroke}`)
    if (entry['stroke-width'] != null) parts.push(`stroke-width:${entry['stroke-width']}px`)
    lines.push(`classDef cls_${attrName} ${parts.join(',')}`)
  }
  return lines.join('\n')
}

// Extract all Notion relation target page IDs from a raw PageObjectResponse (D-11)
// Scans all properties for type === 'relation' and collects target IDs.
// Returns [] when no relation properties exist (always safe to call unconditionally).
function extractRelationIds(page: any): string[] {
  const ids: string[] = []
  for (const prop of Object.values(page.properties ?? {})) {
    if ((prop as any).type === 'relation') {
      for (const rel of ((prop as any).relation as Array<{ id: string }>) ?? []) {
        if (rel.id) ids.push(rel.id)
      }
    }
  }
  return ids
}

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
    case 'relation': return '' // resolved asynchronously in resolveRelationValues
    default: return ''
  }
}

// Extract the title from any PageObjectResponse (first title-type property found)
function extractPageTitle(page: PageObjectResponse): string {
  for (const prop of Object.values(page.properties)) {
    if ((prop as any).type === 'title') {
      return (prop as any).title?.[0]?.plain_text ?? ''
    }
  }
  return ''
}

// Resolve relation-type columnMapping roles to the title of the first related page.
// Checks a shared titleMap (populated from within-source pages) before making API calls.
// Falls back to retrievePage() for cross-database relations — LRU-cached by notion.ts.
async function resolveRelationValues(
  rows: Record<string, string>[],
  pages: PageObjectResponse[],
  source: Source,
  titleMap: Map<string, string>
): Promise<void> {
  if (pages.length === 0) return

  // Identify which roles map to Notion relation properties
  const samplePage = pages[0]
  const relationRoles: Array<{ role: string; notionPropName: string }> = []
  for (const [role, notionPropName] of Object.entries(source.columnMappings)) {
    const prop = samplePage.properties[notionPropName as string]
    if ((prop as any)?.type === 'relation') {
      relationRoles.push({ role, notionPropName: notionPropName as string })
    }
  }
  if (relationRoles.length === 0) return

  // Collect related page IDs not yet in titleMap
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

  // Fetch missing titles in parallel (retrievePage is LRU-cached)
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

  // Write resolved titles back into the already-mapped rows
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

export default defineEventHandler(async (event) => {
  const { templateId } = event.context.params as { templateId: string }
  const templates = getTemplates()
  const template = templates.find((t) => t.id === templateId)

  if (!template) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: `Mermaid template '${templateId}' not found. Check that the .mmd file exists in config/ and was loaded at startup.`,
    })
  }

  // ?hiddenIds=id1,id2 — page IDs to exclude from Handlebars context (node visibility filter)
  const hiddenIdsParam = getQuery(event).hiddenIds as string | undefined
  const hiddenIds = hiddenIdsParam
    ? new Set(hiddenIdsParam.split(',').map((s) => s.trim()).filter(Boolean))
    : null

  const config = getConfig()
  const context: Record<string, Record<string, string>[]> = {}
  // All rows (unfiltered) — returned to client so the FilterPanel can show every node
  const allRows: Array<{ id: string; title: string; sourceName: string; _relations: string[] }> = []

  // Shared pageId → title map across all sources so within-source relations resolve
  // from already-fetched data without extra API calls.
  const titleMap = new Map<string, string>()

  for (const sourceName of template.sources) {
    const source = config.sources.find((s) => s.name === sourceName)
    if (!source) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        message: `Template '${templateId}' references source '${sourceName}' which is no longer in sources.json. Restart the container after updating sources.json.`,
      })
    }

    let pages: PageObjectResponse[]
    try {
      pages = await queryDatabase(source.databaseId)
    } catch (err: any) {
      throw createError({
        statusCode: 502,
        statusMessage: 'Bad Gateway',
        message: `Failed to fetch data for source '${sourceName}': ${err.message}`,
      })
    }

    // Map each page to flat object using columnMappings keys (D-05)
    const mappedRows = pages.map((page: any) => {
      const row: Record<string, string> = {}
      row['id'] = page.id
      for (const [role, notionPropName] of Object.entries(source.columnMappings)) {
        const prop = page.properties?.[notionPropName as string]
        row[role] = extractPropertyValue(prop)
      }
      // Populate titleMap with this source's pages for within-source relation lookups
      titleMap.set(page.id, row['title'] ?? '')
      return row
    })

    // Resolve relation-type columnMapping roles to related page titles
    await resolveRelationValues(mappedRows, pages, source, titleMap)

    // Collect all rows for the client (before hiding) so FilterPanel can list every node
    pages.forEach((page, i) => {
      const row = mappedRows[i]!
      allRows.push({
        id: row['id'] ?? '',
        title: row['title'] ?? '',
        sourceName,
        _relations: extractRelationIds(page),
      })
    })

    // Apply hiddenIds filter: excluded rows are removed from Handlebars context
    context[sourceName] = hiddenIds ? mappedRows.filter((r) => !hiddenIds.has(r['id'] ?? '')) : mappedRows
  }

  let diagramString: string
  try {
    diagramString = template.compiled(context)
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: `Template rendering failed for '${templateId}': ${err.message}`,
    })
  }

  const classDefBlock = buildClassDefs(template.styles)
  if (classDefBlock) {
    const lines = diagramString.split('\n')
    const firstContentIdx = lines.findIndex(l => l.trim().length > 0)
    lines.splice(firstContentIdx + 1, 0, classDefBlock)
    diagramString = lines.join('\n')
  }

  return {
    templateId,
    title: template.title,
    diagramString,
    rows: allRows,
  }
})
