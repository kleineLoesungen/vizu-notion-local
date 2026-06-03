import type { ColumnMappings } from '@/server/utils/config'
import type { EnrichedPage } from '@/server/utils/relations'

interface SourceApiResponse {
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
    { key: () => `source-${id.value}` }
  )

  const columnMappings = computed<ColumnMappings>(() => data.value?.source.columnMappings ?? {})
  const availableRoles = computed<string[]>(() => data.value?.meta.availableRoles ?? [])
  const pages = computed<EnrichedPage[]>(() => (data.value?.pages ?? []) as EnrichedPage[])
  const sourceName = computed<string>(() => data.value?.source.name ?? '')

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
  }
}
