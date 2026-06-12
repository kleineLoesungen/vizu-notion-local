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
    if (currentSvgEl && d3Module) d3Module.select(currentSvgEl).on('.zoom', null)
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

  // Apply D3 zoom to the Mermaid-rendered SVG (injected via innerHTML — not a Vue ref).
  // Must run after container.innerHTML = svg and after nextTick() so the SVG is painted.
  // Called fresh on every renderDiagram() call because innerHTML replaces the SVG element.
  async function initMermaidZoom(containerId: string): Promise<void> {
    const container = document.getElementById(containerId)
    if (!container) return
    const svgEl = container.querySelector('svg') as SVGSVGElement | null
    if (!svgEl) return
    const innerG = svgEl.querySelector('g') as SVGGElement | null
    if (!innerG) return

    currentSvgEl = svgEl

    if (!d3Module) {
      d3Module = (window as any).d3 ?? await import('d3')
      if (!(window as any).d3) (window as any).d3 = d3Module
    }

    // Set SVG to fill its container — required for getBoundingClientRect() to return
    // non-zero dimensions (RESEARCH.md Pitfall 4)
    svgEl.setAttribute('width', '100%')
    svgEl.setAttribute('height', '100%')
    svgEl.style.minHeight = '0'

    zoomBehavior = d3Module.zoom()
      .scaleExtent([0.1, 5])
      .filter((event: any) => event.type !== 'wheel' || event.ctrlKey || event.metaKey)
      .on('zoom', (event: any) => {
        innerG.setAttribute('transform', event.transform.toString())
      })

    d3Module.select(svgEl).call(zoomBehavior).on('dblclick.zoom', null)
    // Apply cursor styling
    svgEl.style.cursor = 'grab'
    svgEl.addEventListener('mousedown', () => { svgEl.style.cursor = 'grabbing' })
    svgEl.addEventListener('mouseup', () => { svgEl.style.cursor = 'grab' })

    // Fit-to-content: scale and center the diagram inside the container (D-14)
    await nextTick()
    const containerRect = svgEl.getBoundingClientRect()
    const contentRect = innerG.getBBox()
    if (contentRect.width > 0 && containerRect.width > 0 && containerRect.height > 0) {
      const scaleX = containerRect.width / (contentRect.width + 40)
      const scaleY = containerRect.height / (contentRect.height + 40)
      const scale = Math.min(scaleX, scaleY, 1)
      const tx = (containerRect.width - contentRect.width * scale) / 2 - contentRect.x * scale
      const ty = Math.max(10, (containerRect.height - contentRect.height * scale) / 2 - contentRect.y * scale)
      const t = d3Module.zoomIdentity.translate(tx, ty).scale(scale)
      d3Module.select(svgEl).call(zoomBehavior.transform, t)
      innerG.setAttribute('transform', t.toString())
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
