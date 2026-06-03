---
phase: 03-user-experience
plan: "03"
subsystem: ui-components
tags: [vue, tailwind, filter-panel, node-detail, export, notion-links, vue-flow, metroviz]
dependency_graph:
  requires:
    - 03-01  # useFilterState, useExport, FilterCriteria, state-encoding composables
    - 02-03  # FlowDiagram (modified), useFlowData, EnrichedPage
    - 02-02  # MetrovizMap (modified), useMetrovizData
  provides:
    - FilterPanel component (filter chips, node visibility checkboxes)
    - NodeDetailPanel component (property display, Notion deep link, ESC close)
    - NotionLinksList component (visible pages as Notion links)
    - ExportButton component (SVG download via useExport)
    - FlowDiagram with node-click emit + flow-viz-container id
    - MetrovizMap with node-click emit via SVG delegation + defineExpose(containerId)
  affects:
    - pages/visualizations/[sourceId].vue (Plan 03-04 assembles these components)
tech_stack:
  added: []
  patterns:
    - Vue 3 defineEmits with typed events
    - Event delegation on vanilla-JS rendered SVG (Metroviz)
    - defineExpose for parent ref access (containerId)
    - ESC keyboard handler via window.addEventListener in onMounted/onBeforeUnmount
key_files:
  created:
    - components/FilterPanel.vue
    - components/NodeDetailPanel.vue
    - components/NotionLinksList.vue
    - components/ExportButton.vue
  modified:
    - components/FlowDiagram.vue
    - components/MetrovizMap.vue
decisions:
  - "FilterPanel emits typed events (toggle-node, apply-filter, remove-filter) as building block for [sourceId].vue assembly"
  - "MetrovizMap uses event delegation on container element (not station elements directly) — best-effort pattern since Metroviz SVG data-id attributes may not be present"
  - "clickListenerAttached guard prevents duplicate event listeners on re-render via data watch"
  - "NodeDetailPanel renders all page.properties (not just columnMappings keys) so users see full Notion data"
metrics:
  duration: "~8 minutes"
  completed: "2026-06-03"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 2
---

# Phase 03 Plan 03: UI Components Summary

**One-liner:** 4 new UI components (FilterPanel, NodeDetailPanel, NotionLinksList, ExportButton) plus node-click event wiring on FlowDiagram and MetrovizMap — all building blocks for the viz page assembly in Plan 04.

## What Was Built

### New Components

**FilterPanel** (`components/FilterPanel.vue`)
- Container with `role="region" aria-label="Filters"` per accessibility spec
- Active filter chips with `✕` remove button per chip
- Property dropdown populated from `Object.keys(columnMappings)`, value input, Apply Filter button
- Node visibility scrollable checkbox list (max-height: 16rem)
- Emits: `toggle-node(pageId)`, `apply-filter(FilterCriteria)`, `remove-filter(index)`

**NodeDetailPanel** (`components/NodeDetailPanel.vue`)
- Fixed right-side panel (`fixed right-0 top-0 bottom-0 w-96`) shown only when `page` prop is non-null
- Sticky header with page title and close button
- Renders all `page.properties` entries with type-safe `renderPropValue()` helper (title, rich_text, select, multi_select, date, checkbox, number, relation)
- "Open in Notion →" link to `notion.so/{pageIdNoHyphens}`
- ESC key closes panel via `window.addEventListener('keydown', ...)` in onMounted/onBeforeUnmount lifecycle

**NotionLinksList** (`components/NotionLinksList.vue`)
- Renders below visualization only when `pages.length > 0` (v-if)
- "Notion Pages" heading, `<ul class="space-y-1">` with `target="_blank" rel="noopener noreferrer"` links
- Title inferred from `columnMappings['title']` property; fallback to `page.id.slice(0, 8)`

**ExportButton** (`components/ExportButton.vue`)
- Single "Export SVG" button using `useExport()` composable
- `:disabled="isExporting"` with loading state text "Exporting..."
- Props: `vizType`, `containerId`, `fileName?`

### Modified Components

**FlowDiagram** (`components/FlowDiagram.vue`)
- Added `defineEmits<{ 'node-click': [page: EnrichedPage] }>()`
- Node div in `#node-default` slot now has `@click="emit('node-click', data.page)"` and `cursor: pointer`
- Root div now has `id="flow-viz-container"` for SVG export targeting

**MetrovizMap** (`components/MetrovizMap.vue`)
- Added `defineEmits<{ 'node-click': [pageId: string | null] }>()`
- `attachClickListener()` function uses event delegation on container element, looks for `[data-id]` attribute on clicked element or its ancestors
- `clickListenerAttached` guard prevents duplicate listeners on re-renders
- `await nextTick(); attachClickListener()` called after each `renderMap()` completion
- `defineExpose({ containerId })` so parent page can access `metrovizMapRef.value?.containerId` for ExportButton

## Deviations from Plan

### Auto-fixed Issues

None.

### Deliberate Deviations

**1. clickListenerAttached guard added to MetrovizMap**
- The plan did not mention preventing duplicate listeners on the re-render watch
- Added `clickListenerAttached` boolean guard to prevent attaching multiple click listeners when `renderMap()` is called again on data change
- No functional impact; prevents memory/behavior issues

**2. NodeDetailPanel renders all page.properties (not just columnMappings)**
- Plan spec said render properties from `page.properties`; implemented as specified
- All properties are shown, not filtered to only columnMappings — this gives users full Notion context

## Known Stubs

None — all components are fully wired. FilterPanel, NodeDetailPanel, NotionLinksList, and ExportButton all connect to real composables/types. No placeholder text or hardcoded empty values that flow to UI rendering.

The components are building blocks — they will receive real data from `pages/visualizations/[sourceId].vue` in Plan 04.

## Self-Check: PASSED
