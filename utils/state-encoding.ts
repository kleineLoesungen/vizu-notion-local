import LZString from 'lz-string'

export interface FilterCriteria {
  propertyName: string
  operator: 'equals' | 'contains' | 'in'
  value: string
}

export interface ViewState {
  vizType: 'metro' | 'flow'
  filters: FilterCriteria[]
  hiddenNodes: string[]          // stored list (may be inverted — see invertedSelection)
  invertedSelection: boolean     // true when hiddenNodes actually stores VISIBLE ids
  selectedSourceIds: string[]    // extra metro source IDs currently selected
  sourceDisplayModes: Record<string, string>  // per-source 'milestones'|'line'
}

/**
 * Encode ViewState to a single compressed `v` query param.
 *
 * @param state       Current view state (caller pre-computes inversion if desired)
 * @param totalNodes  Total number of primary-source pages (unused by encoder — kept for
 *                    API symmetry; callers use it to decide whether to invert before calling)
 *
 * Defaults are omitted to keep payload small:
 * - vizType 'metro' is omitted (default)
 * - empty arrays omitted
 * - invertedSelection=false omitted
 * - empty objects omitted
 */
export function encodeViewState(state: ViewState, totalNodes: number): Record<string, string> {
  // Build compact payload — omit defaults
  const payload: Record<string, unknown> = {}
  if (state.vizType !== 'metro') payload.vizType = state.vizType
  if (state.filters.length > 0) payload.filters = state.filters
  if (state.hiddenNodes.length > 0) payload.hiddenNodes = state.hiddenNodes
  if (state.invertedSelection) payload.invertedSelection = true
  if (state.selectedSourceIds.length > 0) payload.selectedSourceIds = state.selectedSourceIds
  if (Object.keys(state.sourceDisplayModes).length > 0) payload.sourceDisplayModes = state.sourceDisplayModes

  const json = JSON.stringify(payload)
  const compressed = LZString.compressToEncodedURIComponent(json)
  return { v: compressed }
}

/**
 * Decode URL query params back to ViewState.
 *
 * Prefers the compressed `v` param (new format).
 * Falls back to legacy flat params (vizType, filters, hiddenNodes) for backward compat.
 *
 * NOTE: invertedSelection is NOT resolved here. When invertedSelection===true in the
 * decoded state, the caller (viz page onMounted) must convert the stored visible-ID
 * list back to hiddenNodes using the loaded pages list:
 *   hiddenNodes = pages.filter(p => !decoded.hiddenNodes.includes(p.id)).map(p => p.id)
 */
export function decodeViewState(query: Record<string, string | string[]>): ViewState {
  // New compressed format
  if (query.v) {
    try {
      const json = LZString.decompressFromEncodedURIComponent(query.v as string)
      if (json) {
        const parsed = JSON.parse(json) as Record<string, unknown>
        return {
          vizType: (parsed.vizType as 'metro' | 'flow') ?? 'metro',
          filters: Array.isArray(parsed.filters) ? (parsed.filters as FilterCriteria[]) : [],
          hiddenNodes: Array.isArray(parsed.hiddenNodes) ? (parsed.hiddenNodes as string[]) : [],
          invertedSelection: parsed.invertedSelection === true,
          selectedSourceIds: Array.isArray(parsed.selectedSourceIds) ? (parsed.selectedSourceIds as string[]) : [],
          sourceDisplayModes: (
            parsed.sourceDisplayModes != null &&
            typeof parsed.sourceDisplayModes === 'object' &&
            !Array.isArray(parsed.sourceDisplayModes)
          )
            ? (parsed.sourceDisplayModes as Record<string, string>)
            : {},
        }
      }
    } catch {
      // Fall through to legacy decode on any error
    }
  }

  // Legacy flat-param fallback (backward compat with old share links)
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
    invertedSelection: false,
    selectedSourceIds: [],
    sourceDisplayModes: {},
  }
}
