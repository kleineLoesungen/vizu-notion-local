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

  const config = getConfig()
  const context: Record<string, Record<string, string>[]> = {}

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
    // Key = columnMappings role (e.g., 'title', 'date'), Value = extracted string
    const mappedRows = pages.map((page: any) => {
      const row: Record<string, string> = {}
      row['id'] = page.id  // always include page id for reference
      for (const [role, notionPropName] of Object.entries(source.columnMappings)) {
        const prop = page.properties?.[notionPropName as string]
        row[role] = extractPropertyValue(prop)
      }
      return row
    })

    context[sourceName] = mappedRows
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
  }
})
