# Phase 3: User Experience - Context

**Gathered:** 2026-06-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete, interactive user interface for exploring, filtering, and sharing visual diagrams. Covers: dashboard entry page with source management, multi-source metro map composition, per-node filtering, SVG/PNG export, Notion deep links, and URL-shareable state.

Backend data layer (Phase 1) and visualization rendering (Phase 2) are complete. This phase builds the interactive shell around them.

</domain>

<decisions>
## Implementation Decisions

### Dashboard (entry page)

- **D-01:** Dashboard replaces the current simple source list — it is the app entry page (`pages/index.vue`)
- **D-02:** Lists all configured sources with their available viz types as clickable entry points (e.g., "Goals Database → Metro Map, Flow")
- **D-03:** Shows last fetch timestamp per source (when was data last loaded from Notion)
- **D-04:** Per-source manual refresh button AND a global "Fetch All" button to refresh all sources at once — triggers cache invalidation and re-fetch
- **D-05:** Error handling on fetch failures — shows which sources failed and surfaces the error message (not a generic error)

### Metro Map — Multi-source composition

- **D-06:** Metro map supports multi-source lines — user can select multiple configured sources to contribute lines to a single metro map view (each source's items become lines/stations)
- **D-07:** Metro map supports multi-source global milestones — user can overlay milestone markers from multiple sources simultaneously on top of the active metro map

### Viz page — node visibility

- **D-08:** User can deselect/select individual pages (nodes) from the currently loaded sources — toggling a page hides or shows it in the diagram without re-fetching

### Viz page — export

- **D-09:** User can download the current visualization as both SVG and PNG

### Viz page — Notion links

- **D-10:** Notion URL links provided for all visible pages — presented either inline within diagram nodes or as a list of linked pages below the diagram (Claude's discretion on exact placement)

### App design

- **D-11:** Modern, fresh, and simple design aesthetic — clean, uncluttered layout using TailwindCSS v4

### Backend pagination

- **Note:** Pagination is already implemented — `server/utils/notion.ts:queryDatabase()` uses a `do...while(cursor)` loop that fetches all pages regardless of database size. No new backend work needed for this requirement.

### Claude's Discretion

- URL state encoding (UI-06 from REQUIREMENTS.md) — not discussed; implement per requirements spec: encode active sources, viz type, and applied filters in the URL so a shared link restores the exact view
- Exact placement of Notion links (inline in nodes vs list below diagram)
- Cache invalidation mechanism for per-source and global refresh
- Multi-source API design — whether to add a new `/api/sources/multi` endpoint or extend the existing one
- Viz type selector UI positioning (how UI-03 is presented within the viz page layout)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §User Interface — UI-01 through UI-06 (all Phase 3 requirements)
- `.planning/PROJECT.md` — Constraints: desktop browser target, no auth, local Docker, read-only

### Existing pages (will be substantially modified)
- `pages/index.vue` — Current simple source list; becomes the dashboard in this phase
- `pages/visualizations/[sourceId].vue` — Current single-source viz page; extended with multi-source, filtering, export, and Notion links

### API layer (integration points for new dashboard features)
- `server/routes/api/sources.get.ts` — Returns list of configured sources with id, name, columnMappings
- `server/routes/api/sources/[id].get.ts` — Returns `{ source, pages[], meta }` for a single source; caching happens in `queryDatabase()`

### Caching layer (needed for manual refresh / timestamp)
- `server/utils/notion.ts` — LRU cache (1h TTL, 500 item max); `queryDatabase()` already handles full pagination. Cache key format: `queryDatabase:{databaseId}:{propertyIds}`. Cache invalidation will need a new server route or cache-busting parameter.

### Visualization components (extended in this phase)
- `components/MetrovizMap.vue` — Metroviz wrapper; will need multi-source data input
- `components/FlowDiagram.vue` — Vue Flow wrapper
- `composables/useSourceData.ts` — Single-source fetch composable; multi-source support will require a new composable or extension

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/LoadingSpinner.vue` — Reuse for per-source loading states in dashboard
- `components/ErrorAlert.vue` — Reuse for per-source and global fetch error display (D-05)
- `composables/useSourceData.ts` — Single-source fetch pattern; basis for multi-source composable (D-06, D-07)
- `server/utils/notion.ts:queryDatabase()` — Pagination already implemented; manual refresh will need cache invalidation via delete or a cache-bypass flag

### Established Patterns
- **useFetch** — Standard Nuxt client-side data fetching pattern throughout the app
- **TailwindCSS v4 inline classes** — No `tailwind.config.ts`; use `@import "tailwindcss"` in CSS and utility classes directly in templates
- **Props-in, events-out** — Vue component contract pattern used in MetrovizMap and FlowDiagram
- **Server-side data assembly** — Phase 1 D-07: cross-source merging happens server-side, client receives one clean payload. Multi-source metro will need a new server route or extended payload.

### Integration Points
- Dashboard (`pages/index.vue`) — reads `/api/sources` list; adds per-source refresh actions and timestamps
- Multi-source metro — new composable wrapping multiple `/api/sources/:id` calls (or new `/api/sources/multi` endpoint)
- Node visibility toggle (D-08) — client-side state filter on top of fetched `pages[]` array; no re-fetch needed
- SVG export (D-09) — access Metroviz SVG DOM element or Vue Flow canvas; use `canvas.toBlob()` for PNG
- URL state (UI-06) — Nuxt `useRoute` / `useRouter` with query params

</code_context>

<specifics>
## Specific Ideas

- Dashboard shows last fetch timestamp per source — user can see how stale the data is before opening a visualization
- Metro map lines = one source's items; multi-source means multiple sources contribute separate sets of lines to the same metro canvas
- Global milestones overlay from a second (or third) source — e.g., Projects database milestones overlaid on a Goals metro map
- Notion links surfaced so user can navigate from a diagram node directly to the source Notion page

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-user-experience*
*Context gathered: 2026-06-03*
