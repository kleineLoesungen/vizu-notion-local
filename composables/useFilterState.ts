import { ref, computed, watch } from 'vue'
import type { Ref } from 'vue'
import type { EnrichedPage } from '@/server/utils/relations'
import type { ColumnMappings } from '@/server/utils/config'
import type { FilterCriteria } from '@/utils/state-encoding'

export function useFilterState(
  pages: Ref<EnrichedPage[]>,
  columnMappings: Ref<ColumnMappings>
) {
  // Set of page IDs that are currently visible. Initialized from pages on first load.
  const visibleNodeIds = ref<Set<string>>(new Set())
  const activeFilters = ref<FilterCriteria[]>([])

  // Initialize all nodes as visible when pages first load
  watch(
    pages,
    (newPages) => {
      // Only initialize if set is empty (first load); don't reset on re-fetch after refresh
      if (visibleNodeIds.value.size === 0 && newPages.length > 0) {
        visibleNodeIds.value = new Set(newPages.map(p => p.id))
      }
    },
    { immediate: true }
  )

  // UI-02 / D-08: Toggle a page node hidden or visible
  const toggleNode = (pageId: string) => {
    const next = new Set(visibleNodeIds.value)
    if (next.has(pageId)) {
      next.delete(pageId)
    } else {
      next.add(pageId)
    }
    visibleNodeIds.value = next
  }

  // Restore hidden nodes from URL state (called on page mount)
  const setHiddenNodes = (hiddenIds: string[]) => {
    const allIds = new Set(pages.value.map(p => p.id))
    // Start with all visible, then hide the ones from the URL
    const visible = new Set(allIds)
    for (const id of hiddenIds) {
      if (allIds.has(id)) visible.delete(id)
    }
    visibleNodeIds.value = visible
  }

  // UI-04: Add a property filter
  const applyFilter = (criteria: FilterCriteria) => {
    activeFilters.value = [...activeFilters.value, criteria]
  }

  // UI-04: Remove filter by index
  const removeFilter = (index: number) => {
    activeFilters.value = activeFilters.value.filter((_, i) => i !== index)
  }

  // Clear all filters and restore all nodes visible
  const resetFilters = () => {
    activeFilters.value = []
    visibleNodeIds.value = new Set(pages.value.map(p => p.id))
  }

  // Restore filters from URL state (called on page mount)
  const setActiveFilters = (filters: FilterCriteria[]) => {
    activeFilters.value = filters
  }

  // Extract readable title from an EnrichedPage using columnMappings
  const getPageTitle = (page: EnrichedPage): string => {
    const titlePropName = columnMappings.value['title']
    if (titlePropName) {
      const prop = page.properties[titlePropName]
      if (prop?.type === 'title') {
        return (prop as any).title?.[0]?.plain_text || page.id.slice(0, 8)
      }
      if (prop?.type === 'rich_text') {
        return (prop as any).rich_text?.[0]?.plain_text || page.id.slice(0, 8)
      }
    }
    return page.id.slice(0, 8)
  }

  // UI-04: Compute filtered + visibility-respecting pages
  const filteredPages = computed(() => {
    let result = pages.value

    // Apply property-based filters
    for (const filter of activeFilters.value) {
      const notionPropName = columnMappings.value[filter.propertyName]
      if (!notionPropName) continue

      result = result.filter(page => {
        const prop = page.properties[notionPropName]
        if (!prop) return false

        if (filter.operator === 'equals') {
          if (prop.type === 'select') return (prop as any).select?.name === filter.value
          if (prop.type === 'status') return (prop as any).status?.name === filter.value
          if (prop.type === 'checkbox') return String((prop as any).checkbox) === filter.value
        }
        if (filter.operator === 'contains') {
          if (prop.type === 'multi_select') {
            return (prop as any).multi_select?.some((s: any) => s.name === filter.value) ?? false
          }
          if (prop.type === 'title') {
            return (prop as any).title?.[0]?.plain_text?.toLowerCase().includes(filter.value.toLowerCase()) ?? false
          }
          if (prop.type === 'rich_text') {
            return (prop as any).rich_text?.[0]?.plain_text?.toLowerCase().includes(filter.value.toLowerCase()) ?? false
          }
        }
        return true
      })
    }

    // Apply visibility toggles last
    return result.filter(p => visibleNodeIds.value.has(p.id))
  })

  return {
    filteredPages,
    visibleNodeIds,
    activeFilters,
    toggleNode,
    applyFilter,
    removeFilter,
    resetFilters,
    setHiddenNodes,
    setActiveFilters,
    getPageTitle,
  }
}
