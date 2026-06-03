import { ref } from 'vue'

/**
 * SVG export helper (D-09).
 * Uses XMLSerializer + Blob API (no new dependencies).
 * PNG export deferred to v2 per RESEARCH.md.
 */
export function useExport() {
  const isExporting = ref(false)

  /**
   * Download the SVG element found inside the given container element ID.
   * Serializes SVG to blob and triggers browser download.
   * @param containerId - DOM element ID containing the visualization SVG
   * @param vizType - Used for filename
   */
  const downloadSVG = async (containerId: string, vizType: 'metro' | 'flow' = 'metro') => {
    if (isExporting.value) return
    isExporting.value = true

    try {
      const container = document.getElementById(containerId)
      if (!container) {
        console.warn(`[useExport] Container #${containerId} not found`)
        return
      }

      const svg = container.querySelector('svg')
      if (!svg) {
        console.warn(`[useExport] No SVG element found in #${containerId}`)
        return
      }

      // Inline styles into SVG so download is self-contained
      const serializer = new XMLSerializer()
      const svgString = serializer.serializeToString(svg)
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const filename = `visualization-${vizType}-${timestamp}.svg`

      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    } finally {
      isExporting.value = false
    }
  }

  return { downloadSVG, isExporting }
}
