import { computed } from 'vue'
import { encodeViewState, decodeViewState } from '@/utils/state-encoding'
import type { ViewState } from '@/utils/state-encoding'

/**
 * URL state management for viz page (D-12 / UI-06).
 * Strategy: explicit share action only (copy-to-clipboard button).
 * URL is NOT updated on every interaction — only when user clicks "Copy Link".
 * This avoids polluting browser history with every filter toggle.
 */
export function useUrlState() {
  const route = useRoute()
  const router = useRouter()

  // Read current URL state on mount — used to restore a shared view
  const urlState = computed<ViewState>(() =>
    decodeViewState(route.query as Record<string, string>)
  )

  /**
   * Encode the current ViewState into the URL (replaces current history entry).
   * Called when user clicks "Copy Link" — not on every interaction.
   * @param state       Current view state (with pre-computed inversion if applicable)
   * @param totalNodes  Total primary-source page count (passed through to encodeViewState)
   */
  const pushState = (state: ViewState, totalNodes: number) => {
    const params = encodeViewState(state, totalNodes)
    router.replace({ query: params as any })
  }

  /**
   * Copy the current page URL to clipboard.
   * First encodes state into URL, then copies to clipboard.
   * Returns true on success, false on failure.
   * @param state       Current view state
   * @param totalNodes  Total primary-source page count for invert-selection heuristic
   */
  const copyShareLink = async (state: ViewState, totalNodes: number): Promise<boolean> => {
    pushState(state, totalNodes)
    // Wait for router to update before copying
    await nextTick()
    try {
      await navigator.clipboard.writeText(window.location.href)
      return true
    } catch {
      return false
    }
  }

  return { urlState, pushState, copyShareLink }
}
