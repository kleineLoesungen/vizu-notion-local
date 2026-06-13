# ROADMAP: vizu-notion-local

**Milestone v1.0** — Phases 1–4 | 23/23 requirements mapped | Complete 2026-06-06
**Milestone v1.1** — Phases 5–6 | 12/12 requirements mapped | Complete 2026-06-13

---

## Phases

### Milestone v1.0

- [x] **Phase 1: Backend Foundation** — Complete end-to-end Notion data pipeline with validated configuration, deployable via Docker
- [x] **Phase 2: Visualization** — Render Notion data as metro maps and process flow diagrams
- [x] **Phase 3: User Experience** — Interactive UI for exploring, filtering, and sharing visual diagrams (completed 2026-06-03)
- [x] **Phase 4: Deployment** — Production-ready Docker packaging, README, product page (completed 2026-06-06)

### Milestone v1.1

- [x] **Phase 5: Mermaid Diagram Templates** — Admin-defined `.mmd` templates bound to live Notion data via Handlebars (completed 2026-06-08)
- [x] **Phase 6: Mermaid Improvements** — Stable node IDs, zoom/pan, related-nodes filter, full-height filter panel (completed 2026-06-13)

---

## Phase Details

### Phase 1: Backend Foundation

**Goal**: Complete end-to-end Notion data pipeline with validated configuration, deployable via Docker

**Depends on**: Nothing (first phase)

**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, CONF-01, CONF-02, CONF-03, CONF-04, CONF-05, CONF-06, INFRA-01, INFRA-02, INFRA-03

**Success Criteria** (what must be TRUE):
1. Admin mounts a valid config file and starts the container with `docker-compose up` — it succeeds without errors
2. Admin updates the config file with correct Notion database IDs and properties, restarts container, and the app validates the schema and loads data successfully
3. The app respects Notion API rate limits — making sequential requests without hitting rate limit errors
4. The app caches Notion API responses — repeated requests return cached results within 1 hour TTL
5. Cross-database relations are resolved — a database with relation properties to another Notion database loads all linked data correctly

**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Nuxt 3 project scaffold and Docker infrastructure (Dockerfile, docker-compose, config volume)
- [x] 01-02-PLAN.md — Server utilities: config loader with ajv validation, Bottleneck rate limiter, Notion client with LRU cache
- [x] 01-03-PLAN.md — Relation resolver (BFS depth=1) and API routes (/api/sources, /api/sources/:id)
- [x] 01-04-PLAN.md — Human-verified end-to-end integration check against live Notion API

---

### Phase 2: Visualization

**Goal**: Render Notion data as metro maps and process flow diagrams

**Depends on**: Phase 1

**Requirements**: VIZ-01, VIZ-02, VIZ-03

**Success Criteria** (what must be TRUE):
1. A hierarchical Notion database (goals → missions → projects) renders as a metro-style map with correctly positioned stations and lines
2. A workflow Notion database with sequential steps renders as a process flow diagram with nodes and edges
3. User can switch between available visualization types for a given data source — only valid viz types are shown (e.g., metro map for hierarchy, flow for sequences)

**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md — Infrastructure: TailwindCSS v4 + @vue-flow/core install, Metroviz vendored from GitHub
- [x] 02-02-PLAN.md — Metro map: useMetrovizData composable, MetrovizMap.vue wrapper, LoadingSpinner + ErrorAlert components
- [x] 02-03-PLAN.md — Process flow: useFlowData composable, FlowDiagram.vue, useSourceData with VIZ-03 eligibility detection
- [ ] 02-04-PLAN.md — Integration pages: index.vue source list, visualizations/[sourceId].vue + human verification checkpoint

---

### Phase 3: User Experience

**Goal**: Complete, interactive user interface for exploring, filtering, and sharing visual diagrams

**Depends on**: Phase 2

**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06

**Success Criteria** (what must be TRUE):
1. User can toggle sources on/off in the source switcher — toggled sources appear/disappear from the visualization
2. User can filter visible nodes by property values (status, tags, dates) — filtered nodes are hidden, others remain visible
3. User clicks on a node and sees full Notion properties for that entry in a detail panel
4. User applies filters and changes the active source, then copies the URL — sharing that URL with someone else restores the exact same view (sources, filters, viz type)

**Plans**: 7 plans (4 original + 3 gap closure)

Plans:
- [x] 03-01-PLAN.md — State composables + URL encoding utilities + server cache invalidation endpoint (useFilterState, useUrlState, useExport, utils/state-encoding.ts, POST /api/sources/:id/refresh)
- [x] 03-02-PLAN.md — Dashboard: SourceCard component + pages/index.vue overhaul with card grid, timestamps, per-source refresh, global Fetch All
- [x] 03-03-PLAN.md — Visualization panel components: FilterPanel, NodeDetailPanel, NotionLinksList, ExportButton + node-click wiring in FlowDiagram and MetrovizMap
- [x] 03-04-PLAN.md — Viz page integration: full overhaul of visualizations/[sourceId].vue assembling all Phase 3 features + human verification checkpoint
- [x] 03-05-PLAN.md — Gap closure: FilterPanel collapse toggle (mobile fix) + always-visible viz type label
- [x] 03-06-PLAN.md — Gap closure: Source selector dropdown on viz page header
- [x] 03-07-PLAN.md — Gap closure: Fix dashboard timestamp to reflect cache refreshes only (sessionStorage persistence)

---

## Progress Tracking

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Backend Foundation    | 4/4 | Complete | 2026-06-02 |
| 2. Visualization         | 4/4 | Complete | 2026-06-03 |
| 3. User Experience       | 7/7 | Complete | 2026-06-03 |
| 4. Deployment            | 3/3 | Complete | 2026-06-06 |
| 5. Mermaid Diagrams      | 3/3 | Complete | 2026-06-08 |
| 6. Mermaid Improvements  | 4/4 | Complete | 2026-06-13 |

### Phase 4: Deployment

**Goal:** Production-ready Docker packaging, Docker Hub publishing prep, user-facing README, and a single-page HTML product site

**Deliverables:**
- Dockerfile (multi-stage) + docker-compose.yml for one-command local startup
- Docker Hub publishing preparation (image tagging, push workflow)
- README.md with key features, architecture overview, and getting started guide
- Single HTML product page — modern, Notion-like aesthetic

**Requirements**: D-01 through D-14 (decisions captured in 04-CONTEXT.md)
**Depends on:** Phase 3
**Plans:** 3 plans

Plans:
- [x] 04-01-PLAN.md — README.md (setup-first, config reference table, troubleshooting) + .dockerignore
- [x] 04-02-PLAN.md — Makefile with build, run, publish targets (Docker Hub workflow)
- [x] 04-03-PLAN.md — docs/index.html product page (Notion-like aesthetic, hero + features + how-it-works)

---

### Phase 5: Mermaid Diagram Templates

**Goal**: Admin can define Mermaid diagram templates in `config/*.mmd` files that bind to live Notion data from configured sources, rendered client-side via mermaid.js

**Depends on**: Phase 1 (config model + data pipeline), Phase 3 (viz type selector)

**Requirements**: MERM-01 through MERM-05

**Success Criteria** (what must be TRUE):
1. Admin creates a `.mmd` file in `config/` with YAML frontmatter declaring `title` and `sources`, restarts container — the diagram title appears as a viz type option in the selector for every source listed
2. Template body uses Handlebars-style bindings (`{{title}}`, `{{#each source-name}}`) substituted with live Notion data at request time
3. Mermaid.js renders the substituted diagram string client-side with no server-side rendering required
4. A template referencing multiple sources combines rows from all listed sources in the template context
5. Invalid templates (bad Mermaid syntax, unknown source names) fail gracefully with a visible error message rather than a blank view

**Plans**: 3 plans

Plans:
- [x] 05-01-PLAN.md — Install dependencies (handlebars, gray-matter, mermaid) + server/utils/templates.ts template loader + validate-config.ts extension
- [x] 05-02-PLAN.md — GET /api/mermaid/:templateId route (Handlebars render with live data) + useMermaidTemplate composable + useSourceData extension (hasMermaidTemplates)
- [x] 05-03-PLAN.md — UI integration: Mermaid template buttons in viz type selector + Mermaid render area + error display in [sourceId].vue + human verification checkpoint

---

### Phase 6: Mermaid Improvements

**Goal**: Four targeted improvements to the Phase 5 Mermaid feature — stable node IDs, filter panel full height, related-nodes filter, and D3 zoom/pan

**Depends on**: Phase 5

**Requirements**: MERM-NODE-ID, MERM-FILTER-HEIGHT, MERM-RELATED-NODES, MERM-ZOOM

**Success Criteria** (what must be TRUE):
1. Template authors write `{{attribute}}` and the server emits a stable Mermaid node definition (`nXXXXXX["value"]`) — same attribute+value always produces the same ID
2. The filter panel node list is no longer capped at 20rem — it fills available viewport height
3. A "show related" button per node hides all except that node and its 1-hop Notion-relation neighbours; clicking again resets
4. The Mermaid diagram supports Ctrl+scroll zoom, drag pan, and fit-to-content on load — same interaction model as Metro and Flow

**Plans**: 4 plans

Plans:
- [x] 06-01-PLAN.md — server/utils/templates.ts: FNV-1a stableId() + nodeId Handlebars helper + body rewrite before compile()
- [x] 06-02-PLAN.md — components/FilterPanel.vue: remove max-height:20rem from list containers, add max-h-screen to outer panel
- [x] 06-03-PLAN.md — Related nodes filter: server _relations field + composable type + FilterPanel show-related button + viz page handler
- [x] 06-04-PLAN.md — D3 zoom/pan on Mermaid SVG: initMermaidZoom() in useMermaidTemplate + 60vh container + zoom hint

---

*Roadmap created: 2026-06-02*
*Phase 1 planned: 2026-06-02*
*Phase 2 planned: 2026-06-02*
*Phase 3 planned: 2026-06-03*
*Phase 3 gap closure planned: 2026-06-03*
*Phase 4 planned: 2026-06-05*
*Phase 5 planned: 2026-06-08*
*Phase 6 planned: 2026-06-12*
