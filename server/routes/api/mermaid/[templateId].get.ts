import { getTemplates, buildClassDefs, resetClassAccumulator, getClassAssignments } from '../../../utils/templates'
import { getConfig } from '../../../utils/config'
import { queryDatabase, retrievePage } from '../../../utils/notion'
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import type { Source } from '../../../utils/config'

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
// Produces row[role] = first non-hidden title (backward compat) and row[role + '_all'] = all non-hidden titles.
async function resolveRelationValues(
  rows: Record<string, unknown>[],
  pages: PageObjectResponse[],
  source: Source,
  titleMap: Map<string, string>,
  hiddenIds?: Set<string>
): Promise<void> {
  if (pages.length === 0) return

  // Identify which roles map to Notion relation properties
  const samplePage = pages[0]!
  const relationRoles: Array<{ role: string; notionPropName: string }> = []
  for (const [role, notionPropName] of Object.entries(source.columnMappings)) {
    const prop = samplePage.properties[notionPropName as string]
    if ((prop as any)?.type === 'relation') {
      relationRoles.push({ role, notionPropName: notionPropName as string })
    }
  }
  if (relationRoles.length === 0) return

  // Collect ALL related page IDs not yet in titleMap (not just first)
  const toFetch = new Set<string>()
  for (const page of pages) {
    for (const { notionPropName } of relationRoles) {
      const prop = page.properties[notionPropName]
      if ((prop as any)?.type === 'relation') {
        for (const rel of ((prop as any).relation as Array<{ id: string }>) ?? []) {
          if (rel.id && !titleMap.has(rel.id)) toFetch.add(rel.id)
        }
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
  // row[role] = first non-hidden title (backward compat)
  // row[role + '_all'] = all non-hidden titles (new multi-edge field)
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]!
    const row = rows[i]!
    for (const { role, notionPropName } of relationRoles) {
      const prop = page.properties[notionPropName]
      if ((prop as any)?.type === 'relation') {
        const allIds: Array<{ id: string }> = ((prop as any).relation as Array<{ id: string }>) ?? []
        const allTitles = allIds
          .filter(rel => rel.id && (!hiddenIds || !hiddenIds.has(rel.id)))
          // Fall back to page ID when title can't be resolved (e.g. cross-database
          // pages the integration token doesn't have access to). Never drop a relation
          // silently — an ID-labelled node is better than a missing edge.
          .map(rel => titleMap.get(rel.id) || rel.id)
        row[role] = allTitles[0] ?? ''
        ;(row as Record<string, unknown>)[role + '_all'] = allTitles
      }
    }
  }
}

// Expand rows with multi-value relation fields into multiple scalar rows.
// Each _all-suffixed string[] field (produced by resolveRelationValues) represents a
// relation role with N targets. This function cross-products all such arrays so that
// a row with parent_all=["A","B"] becomes 2 rows: {parent:"A"} and {parent:"B"}.
// _all fields are stripped from the output — they are internal, not for templates.
// Duplicate Mermaid node/edge declarations are harmless (Mermaid deduplicates them).
function expandRelationRows(rows: Record<string, unknown>[]): Record<string, string>[] {
  const result: Record<string, string>[] = []
  for (const row of rows) {
    const relationRoles = Object.keys(row)
      .filter(k => k.endsWith('_all') && Array.isArray(row[k]))
      .map(k => k.slice(0, -4))

    const baseRow: Record<string, string> = {}
    for (const [k, v] of Object.entries(row)) {
      if (!k.endsWith('_all') && typeof v === 'string') baseRow[k] = v
    }

    let expanded: Record<string, string>[] = [{ ...baseRow }]
    for (const role of relationRoles) {
      const vals = row[`${role}_all`] as string[]
      if (vals.length <= 1) continue  // baseRow already has the single value (or empty)
      expanded = expanded.flatMap(e => vals.map(v => ({ ...e, [role]: v })))
    }

    result.push(...expanded)
  }
  return result
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
  const context: Record<string, Record<string, unknown>[]> = {}
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
      const row: Record<string, unknown> = {}
      row['id'] = page.id
      for (const [role, notionPropName] of Object.entries(source.columnMappings)) {
        const prop = page.properties?.[notionPropName as string]
        row[role] = extractPropertyValue(prop)
      }
      // Populate titleMap with this source's pages for within-source relation lookups
      titleMap.set(page.id, String(row['title'] ?? ''))
      return row
    })

    // Resolve relation-type columnMapping roles to related page titles
    await resolveRelationValues(mappedRows, pages, source, titleMap, hiddenIds ?? undefined)

    // Collect all rows for the client (before hiding) so FilterPanel can list every node
    pages.forEach((page, i) => {
      const row = mappedRows[i]!
      allRows.push({
        id: String(row['id'] ?? ''),
        title: String(row['title'] ?? ''),
        sourceName,
        _relations: extractRelationIds(page),
      })
    })

    // Apply hiddenIds filter: excluded rows are removed from Handlebars context
    // expandRelationRows cross-products multi-value relation fields into one row per target
    const visibleRows = hiddenIds ? mappedRows.filter((r) => !hiddenIds.has(String(r['id'] ?? ''))) : mappedRows
    context[sourceName] = expandRelationRows(visibleRows)
  }

  let diagramString: string
  try {
    resetClassAccumulator()
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

  return {
    templateId,
    title: template.title,
    diagramString,
    rows: allRows,
  }
})
