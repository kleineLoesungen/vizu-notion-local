import { getConfig } from '../../utils/config'

export default defineEventHandler(async (event) => {
  const config = getConfig()

  // Return lightweight source descriptors — no Notion data fetched here
  return {
    sources: config.sources.map(source => ({
      id: source.databaseId,
      name: source.name,
      databaseId: source.databaseId,
      // columnMappings are included so the client knows the available roles
      // (e.g., which property is "title", "status", "parent" etc.)
      columnMappings: source.columnMappings,
    }))
  }
})
