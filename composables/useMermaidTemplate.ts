import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick, isRef, type Ref } from 'vue'

export interface MermaidTemplateResponse {
  templateId: string
  title: string
  diagramString: string
  rows: Array<{ id: string; title: string; sourceName: string; _relations: string[] }>
}

export function useMermaidTemplate(
  templateId: string | Ref<string>,
  hiddenIds?: Ref<Set<string>>,
) {
  const id = isRef(templateId) ? templateId : ref(templateId)
  const renderError = ref<string | null>(null)
  let mermaidInstance: any = null
  let d3Module: any = null
  let zoomBehavior: any = null
  let currentSvgEl: SVGSVGElement | null = null

  const { data, pending: isLoading, error: fetchError, execute: executeFetch } = useFetch<MermaidTemplateResponse>(
    () => {
      const base = `/api/mermaid/${id.value}`
      const hidden = hiddenIds?.value
      const query = hidden?.size ? `?hiddenIds=${encodeURIComponent([...hidden].join(','))}` : ''
      return `${base}${query}`
    },
    {
      key: () => `mermaid-template-${id.value}-${[...(hiddenIds?.value ?? [])].join(',')}`,
      immediate: false,
    }
  )

  // Only fetch when a template is actually selected — avoids 404 on initial empty ID
  watch(id, (newId) => { if (newId) executeFetch() }, { immediate: true })
  // Re-fetch when node visibility changes
  if (hiddenIds) {
    watch(hiddenIds, () => { if (id.value) executeFetch() })
  }

  const diagramString = computed(() => data.value?.diagramString ?? '')
  const title = computed(() => data.value?.title ?? '')
  const rows = computed(() => data.value?.rows ?? [])

  // Initialize mermaid on client only (SSR-safe)
  // Dynamic import required: mermaid.js accesses browser globals (window, document)
  // and will fail in SSR context if imported at module scope.
  onMounted(async () => {
    const mermaid = await import('mermaid')
    mermaidInstance = mermaid.default
    mermaidInstance.initialize({ startOnLoad: false })
  })

  onBeforeUnmount(() => {
    currentSvgEl = null
  })

  // Render diagram into a target container element by ID
  async function renderDiagram(containerId: string): Promise<void> {
    renderError.value = null
    if (!diagramString.value || !mermaidInstance) return

    try {
      // Use a separate ephemeral ID for mermaid.render() — Mermaid 10+ removes the
      // element with that ID from the DOM during cleanup, so passing the container's
      // own ID would delete the container before we can write to it.
      const renderId = `mermaid-svg-${Date.now()}`
      const { svg } = await mermaidInstance.render(renderId, diagramString.value)
      const container = document.getElementById(containerId)
      if (container) {
        container.innerHTML = svg
        await initMermaidZoom(containerId)
      }
    } catch (err: any) {
      renderError.value = err.message ?? 'Unknown render error'
    }
  }

  // Apply D3 zoom to the Mermaid-rendered SVG.
  // Zoom is attached to the CONTAINER div (CSS pixel space) and the SVG is
  // transformed via CSS transform — works for any Mermaid diagram type regardless
  // of SVG structure, and avoids SVG viewBox / CSS pixel coordinate system mixing.
  async function initMermaidZoom(containerId: string): Promise<void> {
    const container = document.getElementById(containerId)
    if (!container) return
    const svgEl = container.querySelector('svg') as SVGSVGElement | null
    if (!svgEl) return

    currentSvgEl = svgEl

    if (!d3Module) {
      d3Module = (window as any).d3 ?? await import('d3')
      if (!(window as any).d3) (window as any).d3 = d3Module
    }

    // Position SVG at origin; container clips it and provides the interaction surface.
    svgEl.style.position = 'absolute'
    svgEl.style.top = '0'
    svgEl.style.left = '0'
    svgEl.style.transformOrigin = '0 0'
    svgEl.style.overflow = 'visible'

    // Remove Mermaid's inline max-width so the CSS transform can scale freely.
    svgEl.style.maxWidth = 'none'

    zoomBehavior = d3Module.zoom()
      .scaleExtent([0.1, 5])
      .filter((event: any) => event.type !== 'wheel' || event.ctrlKey || event.metaKey)
      .on('zoom', (event: any) => {
        const { x, y, k } = event.transform
        svgEl.style.transform = `translate(${x}px,${y}px) scale(${k})`
      })

    // Attach zoom to the container div — events in CSS pixel space, no viewBox confusion.
    d3Module.select(container).call(zoomBehavior).on('dblclick.zoom', null)
    container.style.cursor = 'grab'
    container.addEventListener('mousedown', () => { container.style.cursor = 'grabbing' })
    container.addEventListener('mouseup', () => { container.style.cursor = 'grab' })

    // Fit-to-content: scale/center the SVG (CSS pixels on both sides — no mismatch).
    await nextTick()
    const cw = container.clientWidth
    const ch = container.clientHeight
    const sw = svgEl.clientWidth || parseFloat(svgEl.getAttribute('width') || '0')
    const sh = svgEl.clientHeight || parseFloat(svgEl.getAttribute('height') || '0')
    if (sw > 0 && sh > 0 && cw > 0 && ch > 0) {
      const scale = Math.min(cw / sw, ch / sh, 1)
      const tx = (cw - sw * scale) / 2
      const ty = (ch - sh * scale) / 2
      const t = d3Module.zoomIdentity.translate(tx, ty).scale(scale)
      d3Module.select(container).call(zoomBehavior.transform, t)
      svgEl.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`
    }
  }

  // Re-render when diagram string changes (templateId switch or data refresh)
  watch(diagramString, async (newString) => {
    if (!newString) return
    // Small delay to ensure DOM element is mounted
    await nextTick()
    await renderDiagram(`mermaid-render-${id.value}`)
  })

  return {
    diagramString,
    title,
    rows,
    isLoading,
    fetchError,
    renderError,
    renderDiagram,
    containerId: computed(() => `mermaid-render-${id.value}`),
  }
}
