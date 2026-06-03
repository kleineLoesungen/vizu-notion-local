import { ref } from 'vue'
import { toPng } from 'html-to-image'

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

  const downloadSVG = async (containerId: string) => {
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
      triggerDownload(url, `visualization-metro-${timestamp()}.svg`)
      URL.revokeObjectURL(url)
    } finally {
      isExporting.value = false
    }
  }

  const downloadPNG = async (containerId: string) => {
    if (isExporting.value) return
    isExporting.value = true
    try {
      const container = document.getElementById(containerId)
      if (!container) { console.warn(`[useExport] #${containerId} not found`); return }

      // VueFlow edge markers reference SVG <defs> by URL (e.g. url(#vue-flow__arrowhead)).
      // html-to-image cannot resolve these cross-element references during serialization,
      // so they render as solid black triangles. Strip the attributes before capture
      // and restore them after — edges still render as clean lines without arrowheads.
      type MarkerState = { el: Element; end: string | null; start: string | null }
      const markerStates: MarkerState[] = []
      container.querySelectorAll('[marker-end],[marker-start]').forEach(el => {
        markerStates.push({
          el,
          end: el.getAttribute('marker-end'),
          start: el.getAttribute('marker-start'),
        })
        el.removeAttribute('marker-end')
        el.removeAttribute('marker-start')
      })

      try {
        const dataUrl = await toPng(container, { cacheBust: true, backgroundColor: '#ffffff' })
        triggerDownload(dataUrl, `visualization-flow-${timestamp()}.png`)
      } finally {
        markerStates.forEach(({ el, end, start }) => {
          if (end) el.setAttribute('marker-end', end)
          if (start) el.setAttribute('marker-start', start)
        })
      }
    } finally {
      isExporting.value = false
    }
  }

  return { downloadSVG, downloadPNG, isExporting }
}
