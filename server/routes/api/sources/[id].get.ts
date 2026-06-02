import { getConfig } from '../../../utils/config'
import { queryDatabase } from '../../../utils/notion'
import { resolveRelations } from '../../../utils/relations'

export default defineEventHandler(async (event) => {
  const { id } = event.context.params as { id: string }
  const config = getConfig()

  // Find the source by databaseId
  const source = config.sources.find(s => s.databaseId === id)
  if (!source) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: `Source '${id}' is not configured in sources.json`,
    })
  }

  // Fetch all pages from the primary database (cached, rate-limited)
  let pages
  try {
    pages = await queryDatabase(source.databaseId)
  } catch (err: any) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: `[vizu] Failed to query Notion database '${source.name}': ${err.message}`,
    })
  }

  // DATA-05: Validate columnMappings against actual page properties (v5 API has no schema endpoint)
  // Warn rather than crash — missing mappings surface as undefined in viz layer
  if (pages.length > 0) {
    const pageProps = pages[0].properties ?? {}
    const actualPropNames = new Set(Object.keys(pageProps))
    const invalidMappings = Object.entries(source.columnMappings)
      .filter(([, notionPropName]) => !actualPropNames.has(notionPropName))
      .map(([role, notionPropName]) => `role '${role}' → '${notionPropName}' not found in database '${source.name}'`)

    if (invalidMappings.length > 0) {
      console.warn(`[vizu] columnMappings mismatch for source '${source.name}':\n${invalidMappings.map(m => `  - ${m}`).join('\n')}\nCheck sources.json columnMappings against your Notion database properties.`)
    }
  }

  // D-04, D-05, D-07: Resolve relation properties 1 level deep, server-side
  const enrichedPages = await resolveRelations(pages, source, config.sources)

  // Return unified payload — client receives pre-merged data (D-07)
  return {
    source: {
      id: source.databaseId,
      name: source.name,
      columnMappings: source.columnMappings,
    },
    pages: enrichedPages,
    meta: {
      total: enrichedPages.length,
      databaseId: source.databaseId,
      // CONF-04: Visualization type eligibility is derived from columnMappings roles.
      // Downstream (Phase 2 client) uses these role names to detect viz type.
      // We surface the available roles here to assist the viz layer.
      availableRoles: Object.keys(source.columnMappings),
    }
  }
})
