<template>
  <div class="flex gap-2">
    <button
      class="px-4 py-2 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="isExporting"
      @click="handleExport"
    >
      {{ isExporting ? 'Exporting...' : 'Export SVG' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useExport } from '@/composables/useExport'

const props = defineProps<{
  vizType: 'metro' | 'flow'
  containerId: string
  fileName?: string
}>()

const { downloadSVG, isExporting } = useExport()

const handleExport = () => {
  downloadSVG(props.containerId, props.vizType)
}
</script>
