<template>
  <div
    class="w-full p-4 rounded"
    style="border: 2px solid #ef4444; background: #fee2e2;"
  >
    <p class="font-semibold text-red-600 mb-1">{{ heading }}</p>
    <p class="text-sm text-gray-700">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  heading: string
  message: string
}>()
</script>
