import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { retrievePage } from './notion'
import type { Source } from './config'

export interface EnrichedPage extends PageObjectResponse {
  // Map: relation property name -> array of resolved related pages
  resolvedRelations: Record<string, PageObjectResponse[]>
}

// Extract all page IDs referenced by relation properties in the given pages.
// Only considers properties that are of type 'relation'.
// Returns a Map: relationPropertyName -> Set of page IDs to fetch.
function collectRelationPageIds(
  pages: PageObjectResponse[],
  relationPropertyNames: string[]
): Map<string, Set<string>> {
  const toFetch = new Map<string, Set<string>>()

  for (const page of pages) {
    for (const propName of relationPropertyNames) {
      const prop = page.properties[propName]
      if (!prop || prop.type !== 'relation') continue

      const relIds = (prop as any).relation as Array<{ id: string }>
      if (!relIds?.length) continue

      if (!toFetch.has(propName)) {
        toFetch.set(propName, new Set())
      }
      for (const rel of relIds) {
        toFetch.get(propName)!.add(rel.id)
      }
    }
  }

  return toFetch
}

/**
 * Resolve relation properties for all pages in a database — 1 level deep only.
 *
 * Decision references:
 * - D-05: Depth = 1. We fetch related pages but do NOT recurse into their relations.
 * - D-06: Relations pointing to databases not in configuredSources are silently skipped.
 * - D-07: All assembly happens server-side; client receives EnrichedPage[].
 *
 * @param pages         Pages returned by queryDatabase() for the primary source
 * @param source        The Source config entry (databaseId, columnMappings)
 * @param allSources    All configured sources — used to filter which dbs to resolve (D-06)
 */
export async function resolveRelations(
  pages: PageObjectResponse[],
  source: Source,
  allSources: Source[]
): Promise<EnrichedPage[]> {
  // Find which columnMappings values correspond to relation properties.
  // We identify relation props by checking the first page's property types.
  const relationPropertyNames: string[] = []

  if (pages.length > 0) {
    const samplePage = pages[0]
    for (const notionPropName of Object.values(source.columnMappings)) {
      const prop = samplePage.properties[notionPropName]
      if (prop?.type === 'relation') {
        relationPropertyNames.push(notionPropName)
      }
    }
  }

  // If no relation properties exist, return pages as-is with empty resolvedRelations
  if (relationPropertyNames.length === 0) {
    return pages.map(page => ({ ...page, resolvedRelations: {} }))
  }

  // Collect all page IDs to fetch across all relation properties (BFS depth 0 scan)
  const toFetch = collectRelationPageIds(pages, relationPropertyNames)

  // Build a set of configured database IDs for D-06 filtering.
  // We can only know which db a related page belongs to AFTER fetching it,
  // so we fetch all related pages first, then filter by checking their parent.
  // This is simpler and avoids needing to pre-query relation metadata.
  const configuredDatabaseIds = new Set(allSources.map(s => s.databaseId))

  // Fetch all depth-1 related pages in parallel (respects rate limiter via retrievePage)
  const allRelatedPages = new Map<string, PageObjectResponse>() // pageId -> page

  const allPageIds = new Set<string>()
  for (const idSet of toFetch.values()) {
    for (const id of idSet) {
      allPageIds.add(id)
    }
  }

  // Parallel fetch with rate limiting (retrievePage handles withRateLimit internally)
  const fetchResults = await Promise.allSettled(
    Array.from(allPageIds).map(async (pageId) => {
      const page = await retrievePage(pageId)
      return { pageId, page }
    })
  )

  for (const result of fetchResults) {
    if (result.status === 'fulfilled') {
      const { pageId, page } = result.value
      // D-06: Only include pages whose parent database is in configuredSources
      const parentDbId = (page.parent as any)?.database_id
      if (parentDbId && configuredDatabaseIds.has(parentDbId)) {
        allRelatedPages.set(pageId, page)
      }
      // If parent db not configured, silently skip (D-06)
    }
    // If fetch failed (e.g., page deleted), silently skip
  }

  // Assemble EnrichedPage[] — merge resolved relations back into each page
  return pages.map(page => {
    const resolvedRelations: Record<string, PageObjectResponse[]> = {}

    for (const propName of relationPropertyNames) {
      const prop = page.properties[propName]
      if (!prop || prop.type !== 'relation') continue

      const relIds = (prop as any).relation as Array<{ id: string }>
      if (!relIds?.length) {
        resolvedRelations[propName] = []
        continue
      }

      resolvedRelations[propName] = relIds
        .map(rel => allRelatedPages.get(rel.id))
        .filter((p): p is PageObjectResponse => p !== undefined)
    }

    return { ...page, resolvedRelations }
  })
}
