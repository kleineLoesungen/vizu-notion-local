# ROADMAP: vizu-notion-local

**Phases:** 3
**Granularity:** Coarse
**Coverage:** 23/23 v1 requirements mapped

---

## Phases

- [x] **Phase 1: Backend Foundation** - Complete end-to-end Notion data pipeline with validated configuration, deployable via Docker
- [ ] **Phase 2: Visualization** - Render Notion data as metro maps and process flow diagrams
- [ ] **Phase 3: User Experience** - Interactive UI for exploring, filtering, and sharing visual diagrams

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

**Plans**: 4 plans

Plans:
- [x] 03-01-PLAN.md — State composables + URL encoding utilities + server cache invalidation endpoint (useFilterState, useUrlState, useExport, utils/state-encoding.ts, POST /api/sources/:id/refresh)
- [x] 03-02-PLAN.md — Dashboard: SourceCard component + pages/index.vue overhaul with card grid, timestamps, per-source refresh, global Fetch All
- [ ] 03-03-PLAN.md — Visualization panel components: FilterPanel, NodeDetailPanel, NotionLinksList, ExportButton + node-click wiring in FlowDiagram and MetrovizMap
- [ ] 03-04-PLAN.md — Viz page integration: full overhaul of visualizations/[sourceId].vue assembling all Phase 3 features + human verification checkpoint

---

## Progress Tracking

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Backend Foundation | 4/4 | Complete   | 2026-06-02 |
| 2. Visualization | 2/4 | In Progress|  |
| 3. User Experience | 1/4 | In Progress|  |

### Phase 4: Deployment

**Goal:** Production-ready Docker packaging, Docker Hub publishing prep, user-facing README, and a single-page HTML product site

**Deliverables:**
- Dockerfile (multi-stage) + docker-compose.yml for one-command local startup
- Docker Hub publishing preparation (image tagging, push workflow)
- README.md with key features, architecture overview, and getting started guide
- Single HTML product page — modern, Notion-like aesthetic

**Requirements**: TBD
**Depends on:** Phase 3
**Plans:** 1/4 plans executed

---

---

*Roadmap created: 2026-06-02*
*Phase 1 planned: 2026-06-02*
*Phase 2 planned: 2026-06-02*
*Phase 3 planned: 2026-06-03*
