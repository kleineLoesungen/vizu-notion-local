import { ref, computed, watch, onMounted, nextTick, isRef, type Ref } from 'vue'

export interface MermaidTemplateResponse {
  templateId: string
  title: string
  diagramString: string
  rows: Array<{ id: string; title: string; sourceName: string }>
}

export function useMermaidTemplate(
  templateId: string | Ref<string>,
  hiddenIds?: Ref<Set<string>>,
) {
  const id = isRef(templateId) ? templateId : ref(templateId)
  const renderError = ref<string | null>(null)
  let mermaidInstance: any = null

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
      }
    } catch (err: any) {
      renderError.value = err.message ?? 'Unknown render error'
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
