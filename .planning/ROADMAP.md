# ROADMAP: vizu-notion-local

**Phases:** 3
**Granularity:** Coarse
**Coverage:** 23/23 v1 requirements mapped

---

## Phases

- [ ] **Phase 1: Backend Foundation** - Complete end-to-end Notion data pipeline with validated configuration, deployable via Docker
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
- [ ] 01-01-PLAN.md — Nuxt 3 project scaffold and Docker infrastructure (Dockerfile, docker-compose, config volume)
- [ ] 01-02-PLAN.md — Server utilities: config loader with ajv validation, Bottleneck rate limiter, Notion client with LRU cache
- [ ] 01-03-PLAN.md — Relation resolver (BFS depth=1) and API routes (/api/sources, /api/sources/:id)
- [ ] 01-04-PLAN.md — Human-verified end-to-end integration check against live Notion API

---

### Phase 2: Visualization

**Goal**: Render Notion data as metro maps and process flow diagrams

**Depends on**: Phase 1

**Requirements**: VIZ-01, VIZ-02, VIZ-03

**Success Criteria** (what must be TRUE):
1. A hierarchical Notion database (goals → missions → projects) renders as a metro-style map with correctly positioned stations and lines
2. A workflow Notion database with sequential steps renders as a process flow diagram with nodes and edges
3. User can switch between available visualization types for a given data source — only valid viz types are shown (e.g., metro map for hierarchy, flow for sequences)

**Plans**: TBD

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

**Plans**: TBD

---

## Progress Tracking

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Backend Foundation | 0/4 | Not started | — |
| 2. Visualization | 0/TBD | Not started | — |
| 3. User Experience | 0/TBD | Not started | — |

---

*Roadmap created: 2026-06-02*
*Phase 1 planned: 2026-06-02*
