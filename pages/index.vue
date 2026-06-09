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
        :mermaid-templates="templatesForSource(source)"
        @navigate="navigateToViz(source.id, $event)"
        @navigate-template="navigateToTemplate(source.id, $event)"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const { data, pending, error, refresh: refetchSources } = useFetch('/api/sources')
const sources = computed(() => data.value?.sources ?? [])

// Mermaid templates — lightweight metadata, no Notion calls
const { data: templatesData } = useFetch<Array<{ id: string; title: string; sources: string[] }>>(
  '/api/mermaid/templates',
  { key: 'mermaid-templates-dashboard' }
)

const templatesForSource = (source: { name: string }): Array<{ id: string; title: string }> => {
  if (!templatesData.value) return []
  return templatesData.value
    .filter((t) => t.sources.includes(source.name))
    .map((t) => ({ id: t.id, title: t.title }))
}

const navigateToTemplate = (sourceId: string, templateId: string) => {
  navigateTo(`/visualizations/${sourceId}?template=${templateId}`)
}

// Per-source refresh state: sourceId -> boolean
const refreshingMap = ref<Record<string, boolean>>({})
const isAnyRefreshing = computed(() => Object.values(refreshingMap.value).some(Boolean))

// Timestamps come from the server (cachedAt in the sources API response) — always accurate
// regardless of which browser tab or session triggered the last Notion fetch.
const sourceTimestamps = computed<Record<string, string>>(() => {
  const result: Record<string, string> = {}
  for (const source of sources.value as Array<{ id: string; cachedAt?: string | null }>) {
    if (source.cachedAt) {
      result[source.id] = new Date(source.cachedAt).toLocaleTimeString()
    }
  }
  return result
})

// D-04: Per-source refresh — POST to cache invalidation endpoint, re-fetch source data,
// then refresh the sources list so the updated cachedAt is reflected in the dashboard.
const refreshSource = async (sourceId: string) => {
  refreshingMap.value = { ...refreshingMap.value, [sourceId]: true }
  try {
    await $fetch(`/api/sources/${sourceId}/refresh`, { method: 'POST' })
    await $fetch(`/api/sources/${sourceId}`)
    await refetchSources()
  } catch (err: any) {
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
