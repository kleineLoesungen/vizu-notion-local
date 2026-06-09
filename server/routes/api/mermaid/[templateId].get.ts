import { getTemplates } from '../../../utils/templates'
import { getConfig } from '../../../utils/config'
import { queryDatabase } from '../../../utils/notion'

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
    default: return ''
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
  const allRows: Array<{ id: string; title: string; sourceName: string }> = []

  for (const sourceName of template.sources) {
    const source = config.sources.find((s) => s.name === sourceName)
    if (!source) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        message: `Template '${templateId}' references source '${sourceName}' which is no longer in sources.json. Restart the container after updating sources.json.`,
      })
    }

    let pages: any[]
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
      return row
    })

    // Collect all rows for the client (before hiding) so FilterPanel can list every node
    for (const row of mappedRows) {
      allRows.push({ id: row['id'] ?? '', title: row['title'] ?? '', sourceName })
    }

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

  return {
    templateId,
    title: template.title,
    diagramString,
    rows: allRows,
  }
})
