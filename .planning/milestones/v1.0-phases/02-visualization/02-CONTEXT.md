# Phase 2: Visualization - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the visualization layer: Vue pages and components that read the Phase 1 API (`/api/sources`, `/api/sources/:id`) and render Notion data as either metro map (Metroviz) or process flow (Vue Flow) diagrams. This phase delivers working visualizations. The interactive UI shell (source switcher, filter panel, URL state) is Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Metroviz Library

- **D-01:** Vendor Metroviz locally into `/vendor/metroviz/` — copy from github.com/rstockm/Metroviz. No npm package exists; vendoring keeps Docker builds fully offline and gives control over patches.
- **D-02:** Trim to v1 must-haves only — wrap only what's needed for stations, lines, zones, and global events. Skip themes, zoom controls, and other features not required for Phase 2.
- **D-03:** Integrate via Vue wrapper component using `onMounted` / `useTemplateRef`. Metroviz is vanilla JS with SVG output — no Vue reactivity. Data changes trigger re-initialization, not reactive updates.

### Role-to-Viz-Type Detection

- **D-04:** A source is **metro map eligible** if its `columnMappings` contains both `date` AND `next` roles (minimum).
- **D-05:** A source is **flow eligible** if its `columnMappings` contains `next` (minimum).
- **D-06:** A source with both `date` + `next` is eligible for **both** viz types — user can switch freely between them.
- **D-07:** Any source with `title` + `date` roles (regardless of other roles) can be used as a **global events overlay** on a metro map — rendered as vertical timeline markers spanning all lines.
- **D-08:** Detection is permissive, not a hard gate. Sources missing optional roles render in a degraded/simpler mode rather than being blocked.

### Metro Map Data Model

Metroviz is a roadmap timeline tool: X-axis = time, Y-axis = lines grouped into zones.

- **D-09:** `date` role → positions a station on the X-axis timeline.
- **D-10:** `next` role → defines sequential connections between stations along a line.
- **D-11:** `parent` role (optional) → organizes stations into hierarchy lines. Items with the same parent share a line.
- **D-12:** `tag` role (optional) → groups lines into Metroviz zones (horizontal bands). If absent, all lines go into a single default zone.
- **D-13:** Station label = `title` role value only. Clean, readable even with many stations.

### Process Flow (Vue Flow)

- **D-14:** Use `@vue-flow/core` for process flow visualization. User confirmed Vue Flow; no simpler alternative needed.
- **D-15:** Flow viz requires only `next` role (minimum). `next` defines the edges between nodes. No date positioning needed.
- **D-16:** Process flow is not the primary use case for Phase 2 — implement after metro map is working.

### Claude's Discretion

- TailwindCSS installation and configuration
- Vue component file structure (pages, components, composables)
- Exact Metroviz JSON data format transformation (adapt to whatever the vendored library's API requires)
- Loading states, error states, empty states
- Responsive layout within the visualization canvas

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Metroviz library
- `vendor/metroviz/` — Vendor directory (to be created). Read the library source to understand the JSON input format, initialization API, and what features to expose vs skip.
- External: https://github.com/rstockm/Metroviz — Source repository. Key concepts: Zones (Y-axis bands), Lines (colored tracks), Stations (timeline items with dates and types), Global Events (vertical markers spanning all lines).

### Phase 1 API (integration points)
- `server/routes/api/sources.get.ts` — Returns list of configured sources with `id`, `name`, `columnMappings`
- `server/routes/api/sources/[id].get.ts` — Returns `{ source, pages[], meta }` where pages are `EnrichedPage[]` with `resolvedRelations` and `meta.availableRoles` lists the mapped role names

### Data types and config
- `server/utils/config.ts` — `Source` and `ColumnMappings` types; role names are arbitrary strings keyed in `columnMappings`
- `server/utils/relations.ts` — `EnrichedPage` type (extends `PageObjectResponse` with `resolvedRelations: Record<string, PageObjectResponse[]>`)

### Requirements
- `.planning/REQUIREMENTS.md` §Visualization — VIZ-01, VIZ-02, VIZ-03
- `.planning/ROADMAP.md` §Phase 2 — Success criteria and phase goal

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `server/routes/api/sources/[id].get.ts`: Returns `meta.availableRoles` — array of role name strings from `columnMappings`. Use this to determine which viz types to offer.
- `server/utils/relations.ts`: `EnrichedPage` type is the data shape pages arrive in. Relation properties have already been resolved 1 level deep.

### Established Patterns
- **Nuxt server routes** (`server/routes/api/`): API layer is complete. Client fetches via `useFetch('/api/sources/:id')` — standard Nuxt composable pattern.
- **Config as source of truth**: `columnMappings` role names are the user-defined contract. The visualization layer reads roles from `meta.availableRoles` and `source.columnMappings`.
- **No existing frontend**: `app.vue` is a bare `<NuxtPage />` wrapper. No pages, components, layouts, or styles exist yet. TailwindCSS not installed.

### Integration Points
- New page at `pages/index.vue` (or `pages/[sourceId].vue`) — entry point for the visualization
- Metroviz Vue wrapper component at `components/MetrovizMap.vue` (vanilla JS initialization via `onMounted`)
- Vue Flow component at `components/FlowDiagram.vue`
- Composable `composables/useSourceData.ts` — wraps `useFetch('/api/sources/:id')` and transforms `EnrichedPage[]` into viz-specific data shapes

</code_context>

<specifics>
## Specific Ideas

- Metro map lines = parent items; stations = their children, positioned by `date` on the X-axis
- Zones grouping (via `tag` role) is optional — default to a single zone if `tag` isn't mapped
- Global events from a second source appear as vertical lines spanning the full timeline — useful for overlaying milestones from a Projects database onto a Goals metro map
- A source with `date` + `next` is eligible for both viz types — user should be able to switch freely without restriction

</specifics>

<deferred>
## Deferred Ideas

- **Timeline visualization (Gantt-style)** — User noted metro map X-axis is a timeline. A dedicated Gantt/timeline view is VIZ-04 in v2 requirements. Not in scope for Phase 2.
- **Cross-source global events in UI** — The data model supports it (any source with `title` + `date` can overlay), but the UI to select which source to use as global events belongs in Phase 3 (source switcher / viz controls).
- **Process flow before/after sequencing at sub-goal level** — Mentioned during discussion. Vue Flow handles this via the `next` role, but the UI controls for switching between flow and metro are Phase 3.

</deferred>

---

*Phase: 02-visualization*
*Context gathered: 2026-06-02*
