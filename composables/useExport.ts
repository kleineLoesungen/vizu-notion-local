import { ref } from 'vue'

export function useExport() {
  const isExporting = ref(false)

  const triggerDownload = (href: string, filename: string) => {
    const link = document.createElement('a')
    link.href = href
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const timestamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

  const downloadSVG = async (containerId: string, filePrefix = 'visualization-metro') => {
    if (isExporting.value) return
    isExporting.value = true
    try {
      const container = document.getElementById(containerId)
      if (!container) { console.warn(`[useExport] #${containerId} not found`); return }
      const svg = container.querySelector('svg')
      if (!svg) { console.warn(`[useExport] No SVG in #${containerId}`); return }
      const svgString = new XMLSerializer().serializeToString(svg)
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      triggerDownload(url, `${filePrefix}-${timestamp()}.svg`)
      URL.revokeObjectURL(url)
    } finally {
      isExporting.value = false
    }
  }

  return { downloadSVG, isExporting }
}
