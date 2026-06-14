<template>
  <div class="min-h-screen bg-white p-8">
    <!-- Back link -->
    <NuxtLink to="/" class="text-sm text-blue-600 hover:underline mb-4 inline-block">← Dashboard</NuxtLink>

    <!-- Page heading -->
    <h1 class="text-2xl font-semibold text-gray-900 mb-1">Mermaid Editor</h1>
    <p class="text-sm text-gray-500 mb-6">Paste your <code class="font-mono bg-gray-100 px-1 rounded">.mmd</code> file — frontmatter, Handlebars bindings, and Notion sources are all resolved live. The rendered output is identical to what the app produces.</p>

    <!-- Two-column layout: editor left, preview right -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Left: Editor -->
      <div>
        <!-- Starter dropdown -->
        <div class="flex items-center gap-2 mb-2">
          <span class="text-sm text-gray-500 whitespace-nowrap">Start from</span>
          <div
            :ref="starterDropdown.containerRef"
            class="relative"
            @keydown.escape="starterDropdown.close()"
          >
            <button
              type="button"
              class="flex items-center gap-1 text-sm border border-gray-200 rounded px-2 py-1 text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
              @click.stop="starterDropdown.toggle()"
            >
              <span>{{ starterLabel }}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-3 h-3 flex-shrink-0 transition-transform"
                :class="starterDropdown.isOpen.value ? 'rotate-180' : ''"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div
              v-show="starterDropdown.isOpen.value"
              class="absolute left-0 top-full mt-1 z-50 min-w-48 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden transition-all duration-150"
            >
              <button
                type="button"
                class="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
                :class="selectedStarter === 'blank' ? 'font-semibold text-blue-600 bg-blue-50' : 'text-gray-700'"
                @click="selectStarter('blank')"
              >Blank</button>
              <button
                type="button"
                class="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
                :class="selectedStarter === 'example' ? 'font-semibold text-blue-600 bg-blue-50' : 'text-gray-700'"
                @click="selectStarter('example')"
              >Simple example</button>
              <button
                v-for="tpl in templatesList"
                :key="tpl.id"
                type="button"
                class="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 truncate"
                :class="selectedStarter === tpl.id ? 'font-semibold text-blue-600 bg-blue-50' : 'text-gray-700'"
                @click="selectStarter(tpl.id)"
              >{{ tpl.title }}</button>
            </div>
          </div>
        </div>

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
            class="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            :disabled="isRendering"
            @click="renderDiagram"
          >
            {{ isRendering ? 'Rendering…' : 'Render' }}
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

      <!-- Docs links -->
      <div class="flex items-center gap-4 mt-2">
        <a
          href="https://mermaid.js.org/intro/"
          target="_blank"
          rel="noopener"
          class="text-xs text-blue-600 hover:underline"
        >Mermaid syntax docs</a>
        <a
          href="https://github.com/kleineLoesungen/vizu-notion-local"
          target="_blank"
          rel="noopener"
          class="text-xs text-blue-600 hover:underline"
        >vizu-notion-local: .mmd template syntax</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

// --- Types ---
interface MmdTemplate {
  id: string
  title: string
  sources: string[]
  styles: Record<string, Record<string, unknown>>
  body: string
}

// --- Dropdown factory (same pattern as visualizations page) ---
function useDropdown() {
  const isOpen = ref(false)
  const containerRef = ref<HTMLElement | null>(null)
  const toggle = () => { isOpen.value = !isOpen.value }
  const close = () => { isOpen.value = false }
  const onDocClick = (e: MouseEvent) => {
    if (containerRef.value && !containerRef.value.contains(e.target as Node)) close()
  }
  onMounted(() => document.addEventListener('click', onDocClick, true))
  onBeforeUnmount(() => document.removeEventListener('click', onDocClick, true))
  return { isOpen, containerRef, toggle, close }
}

const starterDropdown = useDropdown()

// --- Mermaid state ---
const code = ref('')
const renderError = ref<string | null>(null)
const isRendering = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const selectedStarter = ref('blank')

let mermaidInstance: any = null

// --- Sources for reference panel ---
const { data: sourcesData, pending: sourcesPending, error: sourcesError } = useFetch('/api/sources')
const sourcesList = computed(() => sourcesData.value?.sources ?? [])

// --- Templates for starter dropdown ---
const { data: templatesData } = useFetch<MmdTemplate[]>('/api/mermaid/templates')
const templatesList = computed<MmdTemplate[]>(() => templatesData.value ?? [])

// --- Starter label (shown in trigger button) ---
const starterLabel = computed(() => {
  if (selectedStarter.value === 'blank') return 'Blank'
  if (selectedStarter.value === 'example') return 'Simple example'
  return templatesList.value.find((t) => t.id === selectedStarter.value)?.title ?? 'Blank'
})

// --- Starter content ---
const SIMPLE_EXAMPLE = `flowchart LR
  A[Start] --> B[Process]
  B --> C{Decision}
  C -- Yes --> D[Done]
  C -- No --> B`

function serializeStylesYaml(styles: Record<string, Record<string, unknown>>): string {
  return Object.entries(styles).map(([attr, props]) => {
    const propLines = Object.entries(props)
      .map(([k, v]) => `    ${k}: ${typeof v === 'string' ? `"${v}"` : v}`)
      .join('\n')
    return `  ${attr}:\n${propLines}`
  }).join('\n')
}

function reconstructMmd(tpl: MmdTemplate): string {
  const sourcesYaml = tpl.sources.map((s) => `  - ${s}`).join('\n')
  const hasStyles = tpl.styles && Object.keys(tpl.styles).length > 0
  const stylesBlock = hasStyles ? `styles:\n${serializeStylesYaml(tpl.styles)}\n` : ''
  return `---\ntitle: "${tpl.title}"\nsources:\n${sourcesYaml}\n${stylesBlock}---\n${tpl.body}`
}

function selectStarter(value: string): void {
  selectedStarter.value = value
  starterDropdown.close()
  if (value === 'blank') {
    code.value = ''
    return
  }
  if (value === 'example') {
    code.value = SIMPLE_EXAMPLE
    renderDiagram()
    return
  }
  const tpl = templatesList.value.find((t) => t.id === value)
  if (tpl) {
    code.value = reconstructMmd(tpl)
    renderDiagram()
  }
}

// --- Mermaid rendering ---
async function renderDiagram(): Promise<void> {
  renderError.value = null
  if (!mermaidInstance || !code.value.trim()) return

  isRendering.value = true
  let diagramString: string

  try {
    const result = await $fetch<{ diagramString: string }>('/api/mermaid/preview', {
      method: 'POST',
      body: { content: code.value },
    })
    diagramString = result.diagramString
  } catch (err: any) {
    renderError.value = err.data?.message ?? err.message ?? 'Preview request failed'
    isRendering.value = false
    return
  }

  try {
    const renderId = `mmd-editor-svg-${Date.now()}`
    const { svg } = await mermaidInstance.render(renderId, diagramString)
    const container = document.getElementById('mmd-editor-preview')
    if (container) {
      container.innerHTML = svg
      fitToContent()
    }
  } catch (err: any) {
    renderError.value = err.message ?? 'Render error'
  } finally {
    isRendering.value = false
  }
}

// --- Fit-to-content ---
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
  const mermaid = await import('mermaid')
  mermaidInstance = mermaid.default
  mermaidInstance.initialize({ startOnLoad: false })

  if (textareaRef.value) {
    textareaRef.value.addEventListener('keydown', handleKeydown)
  }
})

onBeforeUnmount(() => {
  if (textareaRef.value) {
    textareaRef.value.removeEventListener('keydown', handleKeydown)
  }
})
</script>
