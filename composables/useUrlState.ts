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
   */
  const pushState = (state: ViewState) => {
    const params = encodeViewState(state)
    router.replace({ query: params as any })
  }

  /**
   * Copy the current page URL to clipboard.
   * First encodes state into URL, then copies to clipboard.
   * Returns true on success, false on failure.
   */
  const copyShareLink = async (state: ViewState): Promise<boolean> => {
    pushState(state)
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
