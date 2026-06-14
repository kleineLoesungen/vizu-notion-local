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
    if (currentSvgEl && d3Module) {
      d3Module.select(currentSvgEl).on('.zoom', null)
    }
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

  // Apply D3 zoom to the Mermaid-rendered SVG using the canonical SVG-fill +
  // inner-g-transform pattern. The SVG fills the container (100%/100%) so the
  // hit area matches the visible area for large diagrams. D3 zoom is attached
  // directly to the SVG element and transforms the inner <g> via setAttribute,
  // keeping SVG transform space consistent with viewBox coordinates.
  async function initMermaidZoom(containerId: string): Promise<void> {
    const container = document.getElementById(containerId)
    if (!container) return
    const svgEl = container.querySelector('svg') as SVGSVGElement | null
    if (!svgEl) return
    const innerG = svgEl.querySelector('g') as SVGGElement | null
    if (!innerG) return

    currentSvgEl = svgEl

    // Read natural dimensions from viewBox BEFORE removing width/height attributes.
    // viewBox is set by Mermaid; fall back to explicit width/height attrs if needed.
    let nw = 0, nh = 0
    const vb = svgEl.getAttribute('viewBox')
    if (vb) {
      const parts = vb.split(/[\s,]+/).map(Number)
      nw = parts[2] ?? 0
      nh = parts[3] ?? 0
    }
    if (!nw || !nh) {
      nw = parseFloat(svgEl.getAttribute('width') || '0')
      nh = parseFloat(svgEl.getAttribute('height') || '0')
    }

    // Remove Mermaid's explicit sizing so the SVG fills the container via CSS only.
    // viewBox must also be removed: keeping it causes the browser to scale content once
    // (viewBox → container), and then D3 scales innerG a second time → double-scaling.
    svgEl.removeAttribute('width')
    svgEl.removeAttribute('height')
    svgEl.removeAttribute('viewBox')
    svgEl.style.cssText = 'width: 100%; height: 100%; display: block; max-width: none;'

    if (!d3Module) {
      d3Module = (window as any).d3 ?? await import('d3')
      if (!(window as any).d3) (window as any).d3 = d3Module
    }

    // Transform the inner <g> via SVG attribute — stays in SVG coordinate space,
    // no CSS pixel / viewBox mismatch for large diagrams.
    zoomBehavior = d3Module.zoom()
      .scaleExtent([0.1, 5])
      .filter((event: any) => event.type !== 'wheel' || event.ctrlKey || event.metaKey)
      .on('zoom', (event: any) => {
        innerG.setAttribute('transform', event.transform.toString())
      })

    // Attach zoom to the SVG element (not the container div) so the hit area
    // matches the SVG's rendered bounds at all zoom levels.
    d3Module.select(svgEl).call(zoomBehavior).on('dblclick.zoom', null)
    container.style.cursor = 'grab'
    container.addEventListener('mousedown', () => { container.style.cursor = 'grabbing' })
    container.addEventListener('mouseup', () => { container.style.cursor = 'grab' })

    // Fit-to-content: scale and center the diagram using natural SVG dimensions.
    await nextTick()
    const cw = container.clientWidth
    const ch = container.clientHeight
    if (nw > 0 && nh > 0 && cw > 0 && ch > 0) {
      const scale = Math.min(cw / nw, ch / nh, 1)
      const tx = (cw - nw * scale) / 2
      const ty = (ch - nh * scale) / 2
      const t = d3Module.zoomIdentity.translate(tx, ty).scale(scale)
      d3Module.select(svgEl).call(zoomBehavior.transform, t)
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
