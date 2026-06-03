import { getConfig } from '../../../../utils/config'
import { clearCacheForDatabase } from '../../../../utils/notion'

export default defineEventHandler(async (event) => {
  const { id } = event.context.params as { id: string }
  const config = getConfig()

  // Validate the source exists
  const source = config.sources.find(s => s.databaseId === id)
  if (!source) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: `Source '${id}' is not configured in sources.json`,
    })
  }

  // D-04: Invalidate all cache entries for this database
  clearCacheForDatabase(id)

  return {
    success: true,
    message: `Cache cleared for source '${source.name}'`,
    sourceId: id,
    clearedAt: new Date().toISOString(),
  }
})
