<template>
  <div class="min-h-screen bg-white p-8">
    <h1 class="text-xl font-semibold mb-6">Notion Visualizations</h1>

    <!-- Loading state -->
    <div v-if="pending" class="text-gray-500 text-sm">Loading sources...</div>

    <!-- Error state -->
    <div
      v-else-if="error"
      class="p-4 rounded"
      style="border: 2px solid #ef4444; background: #fee2e2;"
    >
      <p class="font-semibold text-red-600 mb-1">Failed to load sources</p>
      <p class="text-sm text-gray-700">Check that your Notion integration token is valid and the container is running.</p>
    </div>

    <!-- Empty state: no sources configured -->
    <div
      v-else-if="!data?.sources?.length"
      class="p-4 rounded text-gray-600"
      style="border: 1px solid #d1d5db; background: #f3f4f6;"
    >
      <p class="font-semibold mb-1">No sources configured</p>
      <p class="text-sm">Add Notion database sources to your config file and restart the container.</p>
    </div>

    <!-- Source list -->
    <ul v-else class="space-y-3">
      <li
        v-for="source in data.sources"
        :key="source.id"
      >
        <NuxtLink
          :to="`/visualizations/${source.databaseId}`"
          class="block p-4 rounded transition-colors hover:bg-gray-100"
          style="border: 1px solid #e5e7eb; background: #f9fafb;"
        >
          <span class="font-medium text-gray-900">{{ source.name }}</span>
          <span class="ml-2 text-sm text-gray-500">→ View visualization</span>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
const { data, pending, error } = useFetch('/api/sources')
</script>
