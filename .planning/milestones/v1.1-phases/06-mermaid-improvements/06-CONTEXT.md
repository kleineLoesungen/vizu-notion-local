# Phase 6: Mermaid Improvements - Context

**Gathered:** 2026-06-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Four targeted improvements to the existing Mermaid diagram feature (Phase 5):

1. **Node ID auto-generation** — `{{attribute}}` bindings produce stable `id[value]` Mermaid node definitions server-side, enabling edges between nodes without the template author managing IDs manually.
2. **Filter panel full height** — Remove the max-height cap so the filter panel spans the full viewport height.
3. **Related nodes filter** — "Show related" button per node in the filter panel; selects that node + its 1-hop Notion-relation neighbours, hiding everything else.
4. **Zoom and drag** — D3 zoom/pan on the Mermaid diagram, consistent with Metro and Flow.

Template authoring UI, hot-reload, and changes to the frontmatter format are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Node ID auto-generation (Feature 1)

- **D-01:** `{{attribute}}` in a template body → server replaces it with a full Mermaid node definition: `stableId[value]`, where `stableId` is a short hash and `value` is the raw Notion field value.
- **D-02:** Node shape is always `[ ]` (rectangle). No shape-modifier syntax — shape variation is a Mermaid concern the template can handle outside of the binding.
- **D-03:** ID generation strategy: short hash of `(attributeName + value)` — stable within and across renders, no order dependency.
- **D-04:** Same attribute name + same value → always the same ID, globally. This intentionally merges nodes across sources (e.g., "Deploy API" appearing in two `#each` blocks becomes one shared node). This is the desired behaviour.
- **D-05:** `{{attribute}}` always outputs the full `id[value]` form. No separate ID-only binding syntax. Template authors structure their diagrams so the node definition and any edge references co-locate (e.g., define nodes in one `#each` block, then write `id1 --> id2` using `{{fieldA}}` and `{{fieldB}}` in sequence).

### Filter panel full height (Feature 2)

- **D-06:** The filter panel (`.w-72` sidebar) should fill the full available height — remove the `max-height: 20rem` cap on the node list. The panel itself already uses `overflow-y-auto`; the constraint to remove is on the inner list container.

### Related nodes filter (Feature 3)

- **D-07:** "Related" is defined by Notion relation properties — any columnMapping role that resolves to a relation (the server already fetches resolved relations via BFS). The related page IDs are the targets of those resolved relations.
- **D-08:** 1 hop only. Selected node → direct Notion-relation neighbours. No deeper traversal.
- **D-09:** When "show related" is active for a node: that node + its 1-hop neighbours are visible; all other nodes are hidden. Uses the existing `mermaidHiddenIdsMap` mechanism — "show related" is just a bulk set of hidden IDs (all except selected + neighbours).
- **D-10:** UI: a small "show related" icon button appears next to each node row in the Mermaid filter panel (same list where checkboxes already exist). Clicking it triggers the related-filter; clicking again (or toggling a checkbox) resets to normal visibility.
- **D-11:** The server must include relation data per row in the Mermaid API response. Add `_relations: string[]` (list of directly related Notion page IDs) to each row object returned by `/api/mermaid/[templateId]`. This lets the client compute 1-hop neighbours without an extra round-trip.

### Zoom and drag (Feature 4)

- **D-12:** D3 zoom — already in `package.json` (`"d3": "^7.9.0"`), same library used by Metro (via Metroviz vendor) and Flow (`FlowDiagram.vue`).
- **D-13:** Interaction model: Ctrl+scroll to zoom, drag to pan — same hint text and behaviour as Metro and Flow. No extra zoom controls needed.
- **D-14:** Fit-to-content on load — follow the `FlowDiagram.vue` pattern: after the SVG is rendered, compute a scale+translate that fits the diagram bounds into the container.
- **D-15:** Implementation: wrap the Mermaid-rendered SVG content in a `<g :transform="zoomTransform">` and apply `d3.zoom()` to the outer SVG element — same pattern as `FlowDiagram.vue` (`zoomTransform` ref, `initZoom()` function).

### Claude's Discretion

- Exact hash function for node IDs (any stable short-hash, e.g. FNV-1a or djb2 mod 36, producing a ~6-char alphanumeric prefix).
- Whether `_relations` is included only when the template's sources have relation-type columnMappings, or unconditionally (empty array is fine).
- Reset-zoom button placement (follow FlowDiagram if it has one, otherwise omit).
- Whether the "show related" icon is a dedicated SVG icon or a Unicode glyph.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Mermaid implementation (Phase 5)
- `composables/useMermaidTemplate.ts` — Client composable; fetch, render, expose `rows`, `containerId`, `diagramString`, `renderDiagram`
- `server/routes/api/mermaid/[templateId].get.ts` — Server route; builds Handlebars context from Notion rows, applies hiddenIds filter, returns `diagramString` + `rows`
- `server/utils/templates.ts` — Template loader; Handlebars compile + frontmatter parse

### Zoom/pan reference implementation
- `components/FlowDiagram.vue` — D3 zoom pattern to replicate: `zoomTransform` ref, `initZoom()`, `<g :transform>`, Ctrl+scroll filter, fit-to-content logic

### Filter panel
- `components/FilterPanel.vue` — Node visibility checkboxes, group toggle, `set-nodes-visible` emit; "show related" button integrates here
- `pages/visualizations/[sourceId].vue` — `mermaidHiddenIdsMap`, `handleToggleNode`, `handleSetNodesVisible`; related-filter is a call to `handleSetNodesVisible` with computed set

### Notion relation data
- `server/utils/notion.ts` — `queryDatabase` returns full Notion pages including `resolvedRelations`; the route currently discards this — needs to extract relation target IDs for `_relations`
- `server/utils/relations.ts` — Relation resolver; check how resolved relations are structured on each page object

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `d3` (package.json) — already installed at ^7.9.0; no new dependency needed for zoom
- `mermaidHiddenIdsMap` + `handleSetNodesVisible` — existing bulk-hide mechanism; related-nodes filter is a bulk call to this with a computed visible set
- `FlowDiagram.vue` `initZoom()` — copy-adapt this function for the Mermaid diagram

### Established Patterns
- D3 zoom on SVG: `d3.zoom().filter(ctrlOnly).on('zoom', updateTransform)` — used in both Metro (via Metroviz) and Flow
- `rows` in Mermaid API response already returns `{ id, title, sourceName }` per row — extend to `{ id, title, sourceName, _relations: string[] }`
- `mermaidFakePages` computed in viz page — already builds fake EnrichedPage objects from rows; extend these with `resolvedRelations` populated from `_relations` so FilterPanel's existing group/toggle logic works unchanged

### Integration Points
- `server/routes/api/mermaid/[templateId].get.ts`: extend `allRows` to include `_relations` (extracted from resolved relations on each Notion page)
- `composables/useMermaidTemplate.ts`: extend returned `rows` type to include `_relations: string[]`
- `components/FilterPanel.vue`: add "show related" icon button per node row in the node-visibility list — emits a new event `show-related: [pageId: string]`
- `pages/visualizations/[sourceId].vue`: handle `show-related` by computing the 1-hop neighbour set from `mermaidDiagram.rows` and calling `handleSetNodesVisible`
- Handlebars pre-processing (server): transform `{{attribute}}` tokens before/during Handlebars compilation to produce `hash(attr+value)[value]` output

</code_context>

<specifics>
## Specific Ideas

- User's framing: "user should only use `{{<attribute>}}`" — the goal is that template authors never need to think about Mermaid node IDs. The server owns that concern entirely.
- "attribute name combined with value is the unique part" — confirmed: hash input is `attributeName + value`, not just value. This prevents two different attributes with identical values from colliding.
- "filter area should over full height" — the pain point is the node list being capped and requiring inner scrolling. Full viewport height removes that constraint.
- "show related nodes in addition" — "in addition" means: don't hide the selected node; show it AND its neighbours. Everything else hidden.

</specifics>

<deferred>
## Deferred Ideas

- Shape modifiers in bindings (`{{title:round}}`) — user chose always-rectangle for now; revisit if template authors need shape variety
- Multi-hop related traversal (depth > 1) — user chose 1 hop; revisit if the graph is sparse
- Click-on-diagram-node to trigger related filter — cleaner UX but requires SVG event handling per diagram type; deferred
- Hot-reload of templates — deferred from Phase 5, still out of scope

</deferred>

---

*Phase: 06-mermaid-improvements*
*Context gathered: 2026-06-12*
