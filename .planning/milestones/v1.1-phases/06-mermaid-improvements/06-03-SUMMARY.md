---
phase: 06-mermaid-improvements
plan: 03
subsystem: mermaid-filter
tags: [mermaid, filter-panel, relations, focus-mode]
dependency_graph:
  requires: [06-02]
  provides: [MERM-RELATED-NODES]
  affects: [FilterPanel, useMermaidTemplate, mermaid-api-route, sourceId-viz-page]
tech_stack:
  added: []
  patterns: [1-hop-relation-filter, div-label-button-row-pattern]
key_files:
  created: []
  modified:
    - server/routes/api/mermaid/[templateId].get.ts
    - composables/useMermaidTemplate.ts
    - components/FilterPanel.vue
    - pages/visualizations/[sourceId].vue
decisions:
  - "Row restructure: div outer wrapper + inner label for checkbox prevents double-toggle bug (button inside label triggers label's click handler)"
  - "relationsMap is optional prop (undefined for non-Mermaid viz types) — button only rendered when prop is present AND page.id key exists"
  - "activeRelatedNodeId toggling: clicking same node twice resets all hidden IDs to empty set (full reset pattern)"
  - "extractRelationIds uses any type for page to avoid Notion SDK type complexity — safe because Notion always returns typed relation arrays"
metrics:
  duration_minutes: 8
  completed_date: "2026-06-12"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 4
---

# Phase 06 Plan 03: Related Nodes Filter Summary

**One-liner:** 1-hop Notion-relation focus mode for Mermaid diagrams — server extracts `_relations`, FilterPanel shows link-icon button per node, clicking hides all non-related nodes with toggle-off reset.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Server — add extractRelationIds() and _relations to API response | f327150 | server/routes/api/mermaid/[templateId].get.ts |
| 2 | Client type + FilterPanel + viz page wiring for show-related | 3e4ca56 | composables/useMermaidTemplate.ts, components/FilterPanel.vue, pages/visualizations/[sourceId].vue |

## What Was Built

### Server layer (Task 1)
- Added `extractRelationIds(page: any): string[]` helper that scans all Notion page properties for `type === 'relation'` and collects all target page IDs
- Updated `allRows` type from `Array<{ id, title, sourceName }>` to include `_relations: string[]`
- Replaced the `for (const row of mappedRows)` loop with an indexed `forEach` that keeps the original `page` reference, enabling `extractRelationIds(page)` to be called per row

### Composable type (Task 2A)
- Updated `MermaidTemplateResponse.rows` type to include `_relations: string[]`

### FilterPanel component (Task 2B)
- Added optional `relationsMap?: Record<string, string[]>` prop
- Added `'show-related': [pageId: string]` to defineEmits
- Restructured both flat list rows and grouped individual node rows from `<label v-for>` to `<div v-for>` with inner `<label>` for checkbox+text + optional `<button>` for show-related
- Show-related button renders a link SVG icon, only when `relationsMap` prop is present and the page's ID has an entry

### Viz page wiring (Task 2C)
- Added `activeRelatedNodeId` ref tracking which node's related-filter is active
- Added `relationsMap` computed that derives `Record<string, string[]>` from `mermaidDiagram.rows.value`
- Added `handleShowRelated(pageId)` — computes 1-hop visible set (clicked node + its `_relations` filtered to existing row IDs), hides all others; clicking same node again resets to empty hidden set
- Added `:relations-map` and `@show-related` to FilterPanel usage in template

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| div outer wrapper + inner label | Button inside label causes double checkbox toggle (RESEARCH.md Pitfall 1) — restructure fixes this cleanly |
| relationsMap optional undefined for non-Mermaid | Avoids passing irrelevant data to FilterPanel in metro/flow views; button only appears when prop present |
| activeRelatedNodeId toggle-off pattern | Clicking same node twice = full reset (empty hidden set) — intuitive undo gesture |
| _relations uses `?? []` fallback | Server always populates _relations but client defensively handles missing field for backward compat |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files exist:
- server/routes/api/mermaid/[templateId].get.ts — FOUND
- composables/useMermaidTemplate.ts — FOUND
- components/FilterPanel.vue — FOUND
- pages/visualizations/[sourceId].vue — FOUND

Commits:
- f327150 — FOUND
- 3e4ca56 — FOUND

Acceptance criteria all pass:
- extractRelationIds count: 2 (definition + call)
- _relations in composable: 1 match
- show-related in FilterPanel: 3 matches (emit decl + 2 template usages)
- handleShowRelated in [sourceId].vue: 2 matches (definition + binding)
- No `label v-for` pattern remaining in FilterPanel
