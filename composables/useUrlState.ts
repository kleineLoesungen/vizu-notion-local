import { computed } from 'vue'
import { decodeViewState } from '@/utils/state-encoding'
import type { ViewState } from '@/utils/state-encoding'

/**
 * URL state management for viz page (D-12 / UI-06).
 * Strategy: server-side token store — clicking "Copy Link" POSTs the ViewState
 * to /api/share and receives a short 8-char token. The URL becomes ?s=token.
 * Backward compat: old ?v= compressed links are still decoded via decodeViewState.
 */
export function useUrlState() {
  const route = useRoute()
  const router = useRouter()

  // Backward compat: decode old ?v= compressed links
  const legacyUrlState = computed<ViewState | null>(() => {
    if (!route.query.v) return null
    return decodeViewState(route.query as Record<string, string>)
  })

  // Current server-side share token (?s=token)
  const shareToken = computed(() => route.query.s as string | undefined)

  /**
   * Fetch ViewState from server-side share token (?s=token).
   * Falls back to legacy ?v= compressed param if no token.
   * Returns null if no state is present or fetch fails.
   */
  const fetchSharedState = async (): Promise<ViewState | null> => {
    if (shareToken.value) {
      try {
        const data = await $fetch<ViewState>(`/api/share/${shareToken.value}`)
        return data
      } catch {
        return null
      }
    }
    // Fall back to legacy ?v= compressed param
    return legacyUrlState.value
  }

  /**
   * POST state to /api/share, replace URL with ?s=token, copy to clipboard.
   * Returns true on success, false on failure.
   * @param state      Current view state to persist
   * @param _totalNodes  Unused (kept for API compatibility — inversion no longer needed)
   */
  const copyShareLink = async (state: ViewState, _totalNodes: number): Promise<boolean> => {
    try {
      const { token } = await $fetch<{ token: string }>('/api/share', {
        method: 'POST',
        body: state,
      })
      // Replace URL with short token — clears any old ?v= param
      await router.replace({ query: { s: token } })
      await nextTick()
      await navigator.clipboard.writeText(window.location.href)
      return true
    } catch {
      return false
    }
  }

  return { shareToken, fetchSharedState, copyShareLink }
}
