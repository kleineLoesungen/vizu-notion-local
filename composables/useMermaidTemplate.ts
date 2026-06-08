import { ref, computed, watch, onMounted, nextTick, isRef, type Ref } from 'vue'

export interface MermaidTemplateResponse {
  templateId: string
  title: string
  diagramString: string
}

export function useMermaidTemplate(templateId: string | Ref<string>) {
  const id = isRef(templateId) ? templateId : ref(templateId)
  const renderError = ref<string | null>(null)
  let mermaidInstance: any = null

  const { data, pending: isLoading, error: fetchError } = useFetch<MermaidTemplateResponse>(
    () => `/api/mermaid/${id.value}`,
    { key: () => `mermaid-template-${id.value}` }
  )

  const diagramString = computed(() => data.value?.diagramString ?? '')
  const title = computed(() => data.value?.title ?? '')

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
      const { svg } = await mermaidInstance.render(containerId, diagramString.value)
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
    isLoading,
    fetchError,
    renderError,
    renderDiagram,
    containerId: computed(() => `mermaid-render-${id.value}`),
  }
}
