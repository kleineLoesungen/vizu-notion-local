import { getConfig } from '../../utils/config'
import { getCacheTimestamp } from '../../utils/notion'

export default defineEventHandler(async (event) => {
  const config = getConfig()

  // Return lightweight source descriptors — no Notion data fetched here
  return {
    sources: config.sources.map(source => ({
      id: source.databaseId,
      name: source.name,
      databaseId: source.databaseId,
      columnMappings: source.columnMappings,
      // ISO timestamp of last successful Notion fetch — null if never fetched this session
      cachedAt: getCacheTimestamp(source.databaseId),
    }))
  }
})
