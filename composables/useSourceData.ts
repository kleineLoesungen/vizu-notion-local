import type { ColumnMappings } from '@/server/utils/config'
import type { EnrichedPage } from '@/server/utils/relations'

export interface SourceApiResponse {
  source: {
    id: string
    name: string
    columnMappings: ColumnMappings
  }
  pages: EnrichedPage[]
  meta: {
    total: number
    databaseId: string
    availableRoles: string[]
  }
}

/**
 * VIZ-03: Determine if a source is eligible for metro map visualization.
 * Requires BOTH 'date' AND 'next' roles (D-04).
 */
export function isMetroEligible(availableRoles: string[]): boolean {
  return availableRoles.includes('date') && availableRoles.includes('next')
}

/**
 * VIZ-03: Determine if a source is eligible for process flow visualization.
 * Requires only 'next' role (D-05).
 */
export function isFlowEligible(availableRoles: string[]): boolean {
  return availableRoles.includes('next')
}

/**
 * Fetch source data from Phase 1 API and expose viz-type eligibility.
 * Wraps useFetch('/api/sources/:id') — standard Nuxt composable pattern.
 *
 * @param sourceId - The databaseId of the source to fetch
 */
export function useSourceData(sourceId: string | Ref<string>) {
  const id = isRef(sourceId) ? sourceId : ref(sourceId)

  const { data, pending, error } = useFetch<SourceApiResponse>(
    () => `/api/sources/${id.value}`,
    {
      key: () => id.value ? `source-${id.value}` : 'source-skip',
      skip: computed(() => !id.value),
    }
  )

  const columnMappings = computed<ColumnMappings>(() => data.value?.source.columnMappings ?? {})
  const availableRoles = computed<string[]>(() => data.value?.meta.availableRoles ?? [])
  const pages = computed<EnrichedPage[]>(() => (data.value?.pages ?? []) as EnrichedPage[])
  const sourceName = computed<string>(() => data.value?.source.name ?? '')

  // Fetch template list for Mermaid eligibility (D-08, D-09)
  // Separate endpoint returns lightweight metadata — no Notion API calls
  const { data: templatesData } = useFetch<Array<{ id: string; title: string; sources: string[] }>>(
    '/api/mermaid/templates',
    { key: 'mermaid-templates-list' }
  )

  const hasMermaidTemplates = computed<boolean>(() => {
    const name = sourceName.value
    if (!name || !templatesData.value) return false
    return templatesData.value.some((t) => t.sources.includes(name))
  })

  const mermaidTemplates = computed<Array<{ id: string; title: string }>>(() => {
    const name = sourceName.value
    if (!name || !templatesData.value) return []
    return templatesData.value
      .filter((t) => t.sources.includes(name))
      .map((t) => ({ id: t.id, title: t.title }))
  })

  return {
    sourceData: data,
    pages,
    columnMappings,
    availableRoles,
    sourceName,
    isLoading: pending,
    fetchError: error,
    // VIZ-03 eligibility helpers
    isMetroEligible: computed(() => isMetroEligible(availableRoles.value)),
    isFlowEligible: computed(() => isFlowEligible(availableRoles.value)),
    // MERM-03: Mermaid template eligibility (D-08, D-09)
    hasMermaidTemplates,
    mermaidTemplates,
  }
}
