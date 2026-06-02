import { Client, isFullPage, isFullDatabase } from '@notionhq/client'
import type {
  PageObjectResponse,
  DatabaseObjectResponse,
  QueryDatabaseResponse,
} from '@notionhq/client/build/src/api-endpoints'
import { LRUCache } from 'lru-cache'
import { withRateLimit } from './rate-limiter'

// Notion client is a singleton — instantiated once per server process
// useRuntimeConfig() is only available in Nuxt server context
// We use a lazy initializer to avoid instantiation at import time
let _client: Client | null = null

function getNotionClient(): Client {
  if (!_client) {
    const config = useRuntimeConfig()
    if (!config.notionApiToken) {
      throw new Error(
        '[vizu] NOTION_API_TOKEN is not set. Add it to .env and restart the container.'
      )
    }
    _client = new Client({
      auth: config.notionApiToken as string,
    })
  }
  return _client
}

// LRU cache: max 500 items, 1-hour TTL, no stale data served
const cache = new LRUCache<string, unknown>({
  max: 500,
  ttl: 1000 * 60 * 60,  // 1 hour
  allowStale: false,
})

// Query all pages in a database, handling pagination (max 100 per request).
// filterPropertyIds: if provided, only those property IDs are included in each page response.
export async function queryDatabase(databaseId: string, filterPropertyIds?: string[]): Promise<PageObjectResponse[]> {
  const cacheKey = `queryDatabase:${databaseId}:${filterPropertyIds?.sort().join(',') ?? '*'}`
  const cached = cache.get(cacheKey)
  if (cached) {
    return cached as PageObjectResponse[]
  }

  const notion = getNotionClient()
  const pages: PageObjectResponse[] = []
  let cursor: string | undefined = undefined

  do {
    const response: QueryDatabaseResponse = await withRateLimit(() =>
      notion.databases.query({
        database_id: databaseId,
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
        ...(filterPropertyIds ? { filter_properties: filterPropertyIds } : {}),
      })
    )

    for (const page of response.results) {
      if (isFullPage(page)) {
        pages.push(page)
      }
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
  } while (cursor)

  cache.set(cacheKey, pages)
  return pages
}

// Retrieve a single page by ID
export async function retrievePage(pageId: string): Promise<PageObjectResponse> {
  const cacheKey = `retrievePage:${pageId}`
  const cached = cache.get(cacheKey)
  if (cached) {
    return cached as PageObjectResponse
  }

  const notion = getNotionClient()
  const page = await withRateLimit(() =>
    notion.pages.retrieve({ page_id: pageId })
  )

  if (!isFullPage(page)) {
    throw new Error(`[vizu] retrievePage: ${pageId} is not a full page response`)
  }

  cache.set(cacheKey, page)
  return page
}

// Retrieve database schema (used for DATA-05 column mapping validation)
export async function retrieveDatabase(databaseId: string): Promise<DatabaseObjectResponse> {
  const cacheKey = `retrieveDatabase:${databaseId}`
  const cached = cache.get(cacheKey)
  if (cached) {
    return cached as DatabaseObjectResponse
  }

  const notion = getNotionClient()
  const db = await withRateLimit(() =>
    notion.databases.retrieve({ database_id: databaseId })
  )

  if (!isFullDatabase(db)) {
    throw new Error(`[vizu] retrieveDatabase: ${databaseId} is not a full database response`)
  }

  cache.set(cacheKey, db)
  return db
}
