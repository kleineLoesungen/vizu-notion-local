---
phase: quick
plan: 260604-0nu
subsystem: visualization
tags: [flow-diagram, node-attributes, ux]
dependency_graph:
  requires: [composables/useFlowData.ts, components/FlowDiagram.vue, pages/visualizations/[sourceId].vue]
  provides: [FlowNode.data.subLabel, FlowDiagram.nodeAttribute prop, flow node attribute picker]
  affects: [flow diagram rendering, node height, edge endpoints]
tech_stack:
  added: []
  patterns: [computed ref for reactive node dimensions, extractSubLabel helper for Notion property types]
key_files:
  created: []
  modified:
    - composables/useFlowData.ts
    - components/FlowDiagram.vue
    - pages/visualizations/[sourceId].vue
decisions:
  - "NH implemented as computed ref (not constant) so all SVG geometry recalculates reactively on attribute change"
  - "extractSubLabel covers 9 Notion property types including formula subtypes; returns '' for unknowns (safe default)"
  - "flowNodeAttribute passes undefined (not empty string) to useFlowData so subLabel extraction is cleanly skipped when None selected"
  - "flowAttributeOptions excludes title/next/parent — structural roles that are not useful display attributes"
metrics:
  duration: "~2 minutes"
  completed: "2026-06-04"
  tasks_completed: 3
  files_modified: 3
---

# Phase quick Plan 260604-0nu: Extend Flow Diagram Attribute Display Summary

**One-liner:** Two-line SVG flow nodes with reactive attribute picker driven by columnMappings roles — subLabel extraction covers all common Notion property types.

## What Was Built

Users can now select any non-structural column mapping role from a dropdown above the flow diagram. Selected role values are extracted from each Notion page's properties and rendered as a second line inside the node. Node height expands from 44px (single-line) to 66px (double-line) reactively, and edge endpoints track the bottom of nodes correctly in both modes.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Add subLabel extraction to useFlowData | fbf9ba0 | composables/useFlowData.ts |
| 2 | Render two-line nodes in FlowDiagram | 361e6f1 | components/FlowDiagram.vue |
| 3 | Add attribute picker to viz page | 489d8b9 | pages/visualizations/[sourceId].vue |

## Changes by File

### composables/useFlowData.ts
- `FlowNode.data` extended with `subLabel: string` field
- `useFlowData` accepts optional third param `nodeAttribute?: string`
- `extractSubLabel(prop)` helper handles: `date`, `rich_text`, `title`, `select`, `multi_select`, `people`, `checkbox`, `number`, `formula` (with string/number/boolean/date subtypes)
- Per-node `subLabel` computed from `columnMappings[nodeAttribute]` → page property lookup

### components/FlowDiagram.vue
- New `nodeAttribute?: string` prop, passed through to `useFlowData`
- `NH` changed from constant `44` to computed ref: `44` (single) or `66` (double) based on `hasSubLabel`
- SVG nodes now render two `<text>` elements — title at ~38% height, sub-label at ~68% when present
- `edgePath` uses `NH.value` so arrowheads always land at the true bottom of nodes

### pages/visualizations/[sourceId].vue
- `flowNodeAttribute = ref<string>('')` reset in `watch(sourceId, ...)` on navigation
- `flowAttributeOptions` computed: `Object.keys(columnMappings).filter(r => !['title','next','parent'].includes(r))`
- Picker `<select>` rendered above FlowDiagram when `flowAttributeOptions.length > 0` (hidden for title+next-only sources)
- FlowDiagram receives `:node-attribute="flowNodeAttribute || undefined"` — undefined cleanly skips subLabel extraction

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data flows from real Notion page properties through existing columnMappings.

## Self-Check: PASSED

Files exist:
- composables/useFlowData.ts — FOUND (modified)
- components/FlowDiagram.vue — FOUND (modified)
- pages/visualizations/[sourceId].vue — FOUND (modified)

Commits exist:
- fbf9ba0 — FOUND
- 361e6f1 — FOUND
- 489d8b9 — FOUND

TypeScript: no new errors in modified files (pre-existing errors in unrelated files unchanged).
