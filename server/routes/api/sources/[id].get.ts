import { getConfig } from '../../../utils/config'
import { queryDatabase, retrieveDatabase } from '../../../utils/notion'
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

  // DATA-05: Validate columnMappings against actual Notion schema (cached after first call)
  let databaseSchema
  try {
    databaseSchema = await retrieveDatabase(source.databaseId)
  } catch (err: any) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: `[vizu] Could not retrieve Notion database schema for '${source.name}': ${err.message}`,
    })
  }

  // Validate columnMappings and collect property IDs for the mapped columns only
  const invalidMappings: string[] = []
  const mappedPropertyIds: string[] = []

  for (const [role, notionPropName] of Object.entries(source.columnMappings)) {
    const schemaProp = databaseSchema.properties[notionPropName]
    if (!schemaProp) {
      invalidMappings.push(`role '${role}' maps to '${notionPropName}' which does not exist in Notion database '${source.name}'`)
    } else {
      mappedPropertyIds.push(schemaProp.id)
    }
  }

  if (invalidMappings.length > 0) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: `[vizu] Column mapping validation failed for source '${source.name}':\n${invalidMappings.map(m => `  - ${m}`).join('\n')}\nCheck sources.json columnMappings against your Notion database properties.`,
    })
  }

  // Fetch only the mapped properties — keeps response size proportional to config, not database width
  let pages
  try {
    pages = await queryDatabase(source.databaseId, mappedPropertyIds)
  } catch (err: any) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: `[vizu] Failed to query Notion database '${source.name}': ${err.message}`,
    })
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
