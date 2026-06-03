export interface FilterCriteria {
  propertyName: string
  operator: 'equals' | 'contains' | 'in'
  value: string
}

export interface ViewState {
  vizType: 'metro' | 'flow'
  filters: FilterCriteria[]
  hiddenNodes: string[]  // page IDs that are toggled hidden
}

/**
 * Encode ViewState to URL query params (all values are strings for Vue Router).
 * Returns only non-default values to keep URLs clean.
 */
export function encodeViewState(state: ViewState): Record<string, string> {
  const params: Record<string, string> = {}
  if (state.vizType !== 'metro') params.vizType = state.vizType
  if (state.filters.length > 0) params.filters = JSON.stringify(state.filters)
  if (state.hiddenNodes.length > 0) params.hiddenNodes = JSON.stringify(state.hiddenNodes)
  return params
}

/**
 * Decode URL query params back to ViewState.
 * Handles malformed JSON gracefully (returns empty arrays on parse error).
 */
export function decodeViewState(query: Record<string, string | string[]>): ViewState {
  let filters: FilterCriteria[] = []
  let hiddenNodes: string[] = []

  try {
    if (query.filters) filters = JSON.parse(query.filters as string)
  } catch { filters = [] }

  try {
    if (query.hiddenNodes) hiddenNodes = JSON.parse(query.hiddenNodes as string)
  } catch { hiddenNodes = [] }

  return {
    vizType: (query.vizType as 'metro' | 'flow') || 'metro',
    filters,
    hiddenNodes,
  }
}
