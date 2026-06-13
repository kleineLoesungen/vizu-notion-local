<template>
  <div class="min-h-screen bg-white p-8">
    <!-- Back link -->
    <NuxtLink to="/" class="text-sm text-blue-600 hover:underline mb-4 inline-block">← Dashboard</NuxtLink>

    <!-- Page heading -->
    <h1 class="text-2xl font-semibold text-gray-900 mb-1">Mermaid Editor</h1>
    <p class="text-sm text-gray-500 mb-6">Paste raw Mermaid syntax to preview. No saving — copy result to your .mmd file.</p>

    <!-- Two-column layout: editor left, preview right -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Left: Editor -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Mermaid syntax</label>
        <textarea
          ref="textareaRef"
          v-model="code"
          class="w-full h-64 font-mono text-sm border border-gray-300 rounded p-3 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="graph TD&#10;  A[Start] --> B[End]"
          spellcheck="false"
        />
        <div class="flex items-center gap-3 mt-2">
          <button
            class="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
            @click="renderDiagram"
          >
            Render
          </button>
          <span class="text-xs text-gray-400">or Ctrl+Enter</span>
        </div>
        <p v-if="renderError" class="text-sm text-red-600 mt-2">{{ renderError }}</p>
      </div>

      <!-- Right: Preview -->
      <div>
        <div class="text-sm font-medium text-gray-700 mb-1">Preview</div>
        <div
          id="mmd-editor-preview"
          class="relative overflow-hidden rounded border border-gray-200 bg-white"
          style="height: 60vh"
        />
        <button
          class="text-xs text-gray-500 hover:text-gray-900 mt-1"
          @click="fitToContent"
        >
          Fit to content
        </button>
      </div>
    </div>

    <!-- Source Reference Panel -->
    <div class="mt-6">
      <h2 class="text-sm font-semibold text-gray-700 mb-2">Source field reference</h2>

      <LoadingSpinner v-if="sourcesPending" />
      <ErrorAlert
        v-else-if="sourcesError"
        heading="Failed to load sources"
        message="Check that your Notion integration token is valid and the container is running."
      />

      <template v-else>
        <div
          v-for="source in sourcesList"
          :key="source.id"
          class="bg-gray-50 border border-gray-200 rounded p-3 mb-2"
        >
          <div class="text-sm font-medium text-gray-900 mb-1">{{ source.name }}</div>
          <div v-if="Object.keys(source.columnMappings).length > 0" class="flex flex-wrap gap-1">
            <span
              v-for="(columnName, role) in source.columnMappings"
              :key="role"
              class="font-mono text-xs bg-white border border-gray-200 rounded px-1 py-0.5"
            >{{ role }} → {{ columnName }}</span>
          </div>
          <span v-else class="text-xs text-gray-400">No column mappings configured</span>
        </div>
      </template>

      <!-- Docs link -->
      <a
        href="https://mermaid.js.org/intro/"
        target="_blank"
        rel="noopener"
        class="text-xs text-blue-600 hover:underline mt-2 inline-block"
      >Mermaid syntax documentation</a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

// --- Mermaid state ---
const code = ref('graph TD\n  A[Start] --> B[End]')
const renderError = ref<string | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

let mermaidInstance: any = null

// --- Sources for reference panel ---
const { data: sourcesData, pending: sourcesPending, error: sourcesError } = useFetch('/api/sources')
const sourcesList = computed(() => sourcesData.value?.sources ?? [])

// --- Mermaid rendering ---
async function renderDiagram(): Promise<void> {
  renderError.value = null
  if (!mermaidInstance || !code.value.trim()) return

  try {
    const renderId = `mmd-editor-svg-${Date.now()}`
    const { svg } = await mermaidInstance.render(renderId, code.value)
    const container = document.getElementById('mmd-editor-preview')
    if (container) {
      container.innerHTML = svg
      fitToContent()
    }
  } catch (err: any) {
    renderError.value = err.message ?? 'Render error'
  }
}

// --- Fit-to-content (no D3, simple CSS transform) ---
function fitToContent(): void {
  const container = document.getElementById('mmd-editor-preview')
  if (!container) return
  const svgEl = container.querySelector('svg') as SVGSVGElement | null
  if (!svgEl) return

  const cw = container.clientWidth
  const ch = container.clientHeight
  const sw = svgEl.clientWidth || parseFloat(svgEl.getAttribute('width') || '0')
  const sh = svgEl.clientHeight || parseFloat(svgEl.getAttribute('height') || '0')

  if (sw > 0 && sh > 0 && cw > 0 && ch > 0) {
    const scale = Math.min(cw / sw, ch / sh, 1)
    const tx = (cw - sw * scale) / 2
    const ty = (ch - sh * scale) / 2

    svgEl.style.position = 'absolute'
    svgEl.style.top = '0'
    svgEl.style.left = '0'
    svgEl.style.maxWidth = 'none'
    svgEl.style.transformOrigin = '0 0'
    svgEl.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`
  }
}

// --- Ctrl+Enter shortcut ---
function handleKeydown(event: KeyboardEvent): void {
  if (event.ctrlKey && event.key === 'Enter') {
    event.preventDefault()
    renderDiagram()
  }
}

// --- Lifecycle ---
onMounted(async () => {
  // SSR-safe: mermaid accesses browser globals at import time
  const mermaid = await import('mermaid')
  mermaidInstance = mermaid.default
  mermaidInstance.initialize({ startOnLoad: false })

  // Attach Ctrl+Enter listener to textarea
  if (textareaRef.value) {
    textareaRef.value.addEventListener('keydown', handleKeydown)
  }

  // Initial render of the example
  await renderDiagram()
})

onBeforeUnmount(() => {
  if (textareaRef.value) {
    textareaRef.value.removeEventListener('keydown', handleKeydown)
  }
})
</script>
