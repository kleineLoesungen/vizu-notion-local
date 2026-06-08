<template>
  <div class="min-h-screen bg-white p-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-4xl font-semibold leading-tight text-gray-900">Visualizations</h1>
      <p class="text-sm text-gray-500 mt-1">Select a source to explore</p>
    </div>

    <!-- Loading -->
    <LoadingSpinner v-if="pending" />

    <!-- Error -->
    <ErrorAlert
      v-else-if="error"
      heading="Failed to load sources"
      message="Check that your Notion integration token is valid and the container is running."
    />

    <!-- Empty: no sources configured -->
    <div
      v-else-if="sources.length === 0"
      class="bg-gray-100 border border-gray-200 rounded p-8 text-center"
    >
      <p class="font-semibold text-gray-900 mb-2">No sources configured</p>
      <p class="text-sm text-gray-600">Add Notion database sources to your config file and restart the container.</p>
    </div>

    <!-- Source grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <SourceCard
        v-for="source in sources"
        :key="source.id"
        :source="source"
        :last-fetched="sourceTimestamps[source.id]"
        :is-refreshing="refreshingMap[source.id] ?? false"
        @navigate="navigateToViz(source.id, $event)"
        @refresh="refreshSource(source.id)"
      />
    </div>

    <!-- Global Fetch All button -->
    <div v-if="sources.length > 0" class="mt-8">
      <button
        class="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="isAnyRefreshing"
        @click="refreshAllSources"
      >
        {{ isAnyRefreshing ? 'Fetching...' : 'Fetch All' }}
      </button>
    </div>

    <!-- Mermaid Diagram Templates section -->
    <div v-if="templateCards.length > 0" class="mt-12">
      <h2 class="text-xl font-semibold text-gray-900 mb-1">Diagram Templates</h2>
      <p class="text-sm text-gray-500 mb-4">Pre-configured Mermaid diagrams — click to open</p>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          v-for="tmpl in templateCards"
          :key="tmpl.id"
          class="text-left p-4 border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all bg-white"
          @click="navigateToTemplate(tmpl.sourceId!, tmpl.id)"
        >
          <p class="font-medium text-gray-900 text-sm">{{ tmpl.title }}</p>
          <p class="text-xs text-gray-400 mt-1">{{ tmpl.sources.join(', ') }}</p>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const { data, pending, error, refresh: refetchSources } = useFetch('/api/sources')
const sources = computed(() => data.value?.sources ?? [])

// Mermaid templates for dashboard listing — lightweight metadata endpoint, no Notion calls
const { data: templatesData } = useFetch<Array<{ id: string; title: string; sources: string[] }>>(
  '/api/mermaid/templates',
  { key: 'mermaid-templates-dashboard' }
)

const templateCards = computed(() => {
  if (!templatesData.value?.length || !sources.value.length) return []
  return templatesData.value.map((tmpl) => {
    // Find the first source ID whose name matches any of the template's source names
    const firstSource = sources.value.find((s: any) => tmpl.sources.includes(s.name))
    return { ...tmpl, sourceId: firstSource?.id ?? null }
  }).filter((t) => t.sourceId !== null)
})

const navigateToTemplate = (sourceId: string, templateId: string) => {
  navigateTo(`/visualizations/${sourceId}?template=${templateId}`)
}

// Per-source refresh state: sourceId -> boolean
const refreshingMap = ref<Record<string, boolean>>({})
// Per-source last fetched timestamps: sourceId -> display string
const sourceTimestamps = ref<Record<string, string>>({})
const isAnyRefreshing = computed(() => Object.values(refreshingMap.value).some(Boolean))

// Load persisted timestamps from sessionStorage (survive navigation, not page reload)
const TIMESTAMP_STORAGE_KEY = 'vizu-source-timestamps'

onMounted(() => {
  try {
    const saved = sessionStorage.getItem(TIMESTAMP_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as Record<string, string>
      sourceTimestamps.value = parsed
    }
  } catch {
    // sessionStorage unavailable or parse error — start with empty timestamps (safe default)
  }
})

const persistTimestamps = () => {
  try {
    sessionStorage.setItem(TIMESTAMP_STORAGE_KEY, JSON.stringify(sourceTimestamps.value))
  } catch {
    // sessionStorage write failed (private mode, quota exceeded) — non-fatal, timestamps just won't persist
  }
}

// D-04: Per-source refresh — POST to cache invalidation endpoint, then re-fetch
const refreshSource = async (sourceId: string) => {
  refreshingMap.value = { ...refreshingMap.value, [sourceId]: true }
  try {
    await $fetch(`/api/sources/${sourceId}/refresh`, { method: 'POST' })
    // Force re-fetch of source data by calling the source endpoint (this updates the LRU cache)
    await $fetch(`/api/sources/${sourceId}`)
    sourceTimestamps.value = { ...sourceTimestamps.value, [sourceId]: new Date().toLocaleTimeString() }
    persistTimestamps()
  } catch (err: any) {
    // D-05: Show specific error — let the browser console capture the error
    console.error(`[dashboard] Refresh failed for ${sourceId}:`, err.message)
  } finally {
    refreshingMap.value = { ...refreshingMap.value, [sourceId]: false }
  }
}

// D-04: Global refresh — refresh all sources sequentially
const refreshAllSources = async () => {
  const sourceIds = sources.value.map((s: any) => s.id)
  for (const id of sourceIds) {
    await refreshSource(id)
  }
}

// UI-01: Navigate to viz page with the chosen viz type
const navigateToViz = (sourceId: string, vizType: 'metro' | 'flow') => {
  navigateTo(`/visualizations/${sourceId}?vizType=${vizType}`)
}
</script>
