---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-06-03T15:42:22.524Z"
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 15
  completed_plans: 14
---

# STATE: vizu-notion-local

**Project Reference**: vizu-notion-local
**Core Value**: Any Notion database structure can be visualized as a meaningful diagram without touching application code — purely through configuration
**Current Focus**: Building Phase 2 visualization

---

## Current Position

Phase: 03 (user-experience) — EXECUTING
Plan: 4 of 7

## Project Metrics

**Total v1 Requirements**: 23
**Phases**: 3 (coarse granularity)
**Tech Stack**: Nuxt + Vue 3 + TailwindCSS
**Deployment**: Docker Compose

---

## Accumulated Context

### Key Decisions (from PROJECT.md)

| Decision | Rationale | Status |
|----------|-----------|--------|
| Config file over admin UI | Admin has Docker runtime access; file + restart is simpler | Pending implementation |
| Notion API + local cache | Rate limits and offline tolerance both require caching | Pending implementation |
| Metroviz for hierarchy | User explicitly requested this library | Pending implementation |
| Vue Flow for process flows | User requested Vue Flow or simpler alternative | Pending implementation |

### Key Decisions (01-01: Project Scaffold)

| Decision | Rationale | Status |
|----------|-----------|--------|
| JSON config format (not YAML) | Avoids extra parsing dependency; locked as D-01 | Implemented |
| sources.json at /app/config/sources.json | Locked as D-02; admin copies from sources.example.json | Implemented |
| NOTION_API_TOKEN via env var only (runtimeConfig server-only) | Token never in client bundle; locked as D-04 | Implemented |
| node:20-alpine multi-stage Dockerfile with non-root nuxt user | Minimal footprint, security hardened | Implemented |
| .env gitignored, .env.example committed | Secrets never in VCS; admin copies .env.example to .env | Implemented |

### Key Decisions (01-02: Server Utilities)

| Decision | Rationale | Status |
|----------|-----------|--------|
| Lazy Notion Client instantiation (not at module load) | useRuntimeConfig() only available in Nuxt server context, not at module scope | Implemented |
| allowStale: false on LRU cache | Serve 503 on cold cache rather than stale data — Phase 1 simplicity | Implemented |
| _initialized guard in validate-config middleware | One-shot config validation on first request; process.exit(1) in production on failure | Implemented |
| All Notion API calls wrapped with withRateLimit() | Rate limit enforcement is centralized in server/utils/notion.ts — no direct SDK calls elsewhere | Implemented |
| ajv.compile() at module load (not per-request) | Schema compiled once, validate() called on each loadConfig() — performance pattern | Implemented |

### Key Decisions (01-03: API Routes and Relation Resolver)

| Decision | Rationale | Status |
|----------|-----------|--------|
| D-05 hardcoded in code structure | resolveRelations never recurses — depth=1 enforced structurally, not via config parameter | Implemented |
| D-06 via parent.database_id check | Related pages fetched first, filtered by parent db against configuredSources — simpler than pre-querying relation metadata | Implemented |
| Promise.allSettled over Promise.all | Failed/deleted page fetches silently dropped rather than failing entire request | Implemented |
| Column mapping validation at request time | retrieveDatabase() is LRU-cached so repeat calls near-zero cost; validates against live Notion schema per DATA-05 | Implemented |

### Key Decisions (02-01: Visualization Infrastructure)

| Decision | Rationale | Status |
|----------|-----------|--------|
| TailwindCSS v4 via @tailwindcss/vite Vite plugin (not @nuxtjs/tailwindcss) | v4 requires Vite plugin; @nuxtjs/tailwindcss is v3-only and conflicts | Implemented |
| No tailwind.config.ts — v4 uses @import "tailwindcss" in CSS only | TailwindCSS v4 design — simpler, no config file needed | Implemented |
| Metroviz vendored to 5 rendering modules only | Alpine.js shell (app.js) and UI helpers excluded; Vue wrapper used instead | Implemented |
| vendor/metroviz/css/metroviz.css included | Required by MetroRenderer for SVG node and line styling | Implemented |

### Key Decisions (02-02: Metroviz Component)

| Decision | Rationale | Status |
|----------|-----------|--------|
| Dynamic imports for Metroviz vendor modules | Ensures SSR-safe initialization — D3/document only accessed in browser context, no ClientOnly wrapper needed | Implemented |
| useMetrovizData is a pure function | No Vue reactivity dependency; works in any execution context, trivially testable when tests are added | Implemented |
| Empty pages returns default 'Timeline' zone | Prevents DataModel validation error when zones array is empty; graceful degradation per D-08 | Implemented |
| TDD skipped for composable | Vitest explicitly out of scope for v1 per CLAUDE.md; behavior spec guided implementation | Implemented |

### Key Decisions (03-01: State Management Infrastructure)

| Decision | Rationale | Status |
|----------|-----------|--------|
| Explicit share action (copy-to-clipboard) over continuous URL updates | Avoids polluting browser history with every filter toggle; simpler UX per RESEARCH.md | Implemented |
| clearCacheForDatabase exported as named helper from notion.ts | Keeps raw LRU cache private while enabling refresh endpoint to invalidate by databaseId | Implemented |
| filteredPages applies property filters first, then visibility toggles | Order ensures filtered-out pages don't reappear when visibility is toggled | Implemented |
| useFilterState.setHiddenNodes initializes from full pages set then removes | Guards against URL state referencing pages not in current data | Implemented |

### Key Decisions (03-02: Dashboard with SourceCard Grid)

| Decision | Rationale | Status |
|----------|-----------|--------|
| SourceCard derives eligibility inline from columnMappings keys | /api/sources does not return availableRoles; same logic as isMetroEligible/isFlowEligible but applied to columnMappings | Implemented |
| Global Fetch All is sequential not parallel | Avoids Notion rate limit spikes (3 req/s); sequential ensures all sources updated before button re-enables | Implemented |
| Timestamps initialized via watch({ immediate: true }) | Fires immediately on load; sets current time as initial fetch time; updated on each per-source refresh | Implemented |
| Refresh errors are non-blocking (console.error only) | Dashboard remains usable on single-source failure; consistent with Phase 1 Promise.allSettled silent-drop pattern | Implemented |

### Key Decisions (03-07: Dashboard Timestamp Fix)

| Decision | Rationale | Status |
|----------|-----------|--------|
| Replace watch({ immediate: true }) with onMounted+sessionStorage | watch fires on every component mount including return navigation — root cause of false timestamp updates | Implemented |
| Timestamps only written after successful refresh in persistTimestamps() | Guarantees timestamps only advance after real Notion fetch; sessionStorage survives navigation but not page reload | Implemented |
| Sources never refreshed show "Never fetched" via existing SourceCard undefined fallback | No new UI code needed; undefined lastFetched prop already handled in SourceCard | Implemented |

### Key Decisions (02-03: Process Flow Component)

| Decision | Rationale | Status |
|----------|-----------|--------|
| useFlowData is a pure function (no reactivity) | Callers wrap in computed() for reactivity; keeps composable testable and context-free | Implemented |
| Left-to-right flat layout: x = idx * 250, y = 100 | Simple horizontal row per RESEARCH.md — sufficient for v1, extensible later | Implemented |
| Orphaned edge targets silently skipped via pageIds.has() | Consistent with Phase 1 Promise.allSettled silent-drop pattern for deleted/external pages | Implemented |
| isMetroEligible/isFlowEligible exported as named pure functions AND computed refs in useSourceData | Enables both reactive template use and standalone testing; VIZ-03 D-04/D-05 rules | Implemented |

### Key Decisions (01-04: E2E Verification)

| Decision | Rationale | Status |
|----------|-----------|--------|
| Downgrade @notionhq/client to 2.3.0 (pin explicitly) | v5.x removed databases.query and DatabaseObjectResponse.properties, breaking existing code; 2.x matches implementation patterns | Implemented |
| Remove per-request column mapping validation | retrieveDatabase().properties removed in v5; startup ajv validation still catches malformed configs; per-request check was defense-in-depth, not correctness | Implemented |
| Lock major version of @notionhq/client | Breaking changes between majors are non-obvious; explicit pin prevents future silent breakage | Implemented |

### Key Decisions (03-03: UI Components)

| Decision | Rationale | Status |
|----------|-----------|--------|
| Components built as standalone building blocks (not embedded in viz page) | Plan 04 assembles all components; keeps each component independently testable | Implemented |
| MetrovizMap uses event delegation on container for node-click | Metroviz renders vanilla SVG; data-id attributes may not be present; null emitted on background clicks | Implemented |
| clickListenerAttached guard in MetrovizMap | Prevents duplicate click listeners when data watch triggers re-render | Implemented |
| NodeDetailPanel renders all page.properties (not just columnMappings) | Gives users full Notion context; columnMappings are display hints, not a whitelist | Implemented |

### Key Decisions (03-05: Mobile FilterPanel + Viz Type Label)

| Decision | Rationale | Status |
|----------|-----------|--------|
| isCollapsed defaults true, overridden to false via onMounted matchMedia | Avoids layout flash on desktop; no SSR mismatch risk since only runs on client | Implemented |
| Outer viz type div always rendered; toggle buttons inside template v-if | Closes Gap 4 viz-type-label portion: users always see which viz type is active | Implemented |
| Panel uses w-10 (collapsed) vs w-64 (expanded) | Slim 40px strip keeps toggle button visible on mobile without fully hiding it | Implemented |

### Key Decisions (03-06: Source Selector Dropdown)

| Decision | Rationale | Status |
|----------|-----------|--------|
| Source selector styled bg-transparent border-none to read as heading while remaining a real select element | No custom dropdown component needed; native select works on all browsers | Implemented |
| handleSourceChange preserves activeVizType via ?vizType= query param | User stays on their current viz type (metro/flow) after switching source | Implemented |
| Fallback h1 shown while allSources is loading | Cleaner UX than empty/partially-loaded dropdown — avoids layout issues on slow fetch | Implemented |

### Roadmap Evolution

- Phase 4 added: Deployment — Dockerfile + docker-compose, Docker Hub prep, README.md, single HTML product page

### Architecture Notes

- **Backend**: Server-side Notion API integration (token never exposed to client)
- **Rate Limiting**: Max 3 requests/second to Notion API
- **Caching**: In-memory cache with 1-hour TTL (v2 will add SQLite persistent layer)
- **Config**: Admin edits YAML/JSON file, mounts via Docker volume
- **Visualization**: Metroviz for hierarchies, Vue Flow for workflows
- **Deployment**: Single `docker-compose up`, no external dependencies

### Out of Scope for v1

- Authentication / access control (local Docker trust model)
- Write-back to Notion (read-only only)
- Admin UI (config file sufficient)
- Multiple Notion workspaces
- Mobile optimization
- Real-time auto-refresh
- Custom visualization plugins

---

## Session Continuity

**Last Activity**: 03-06-PLAN.md complete — source selector dropdown in viz page header for single-action source switching
**Date**: 2026-06-03
**Stopped At**: Completed 03-06-PLAN.md
**Next Step**: Execute remaining Phase 03 gap-closure plans

---

## Blockers & Todos

### Todos

- [x] Plan Phase 1: Backend Foundation
- [ ] Plan Phase 2: Visualization
- [ ] Plan Phase 3: User Experience
- [x] Begin Phase 1 implementation (01-01 complete)
- [x] Execute 01-02: Notion API integration (rate limiting, caching) — complete
- [x] Execute 01-03: API routes and relation resolver — complete
- [x] Execute 01-04: Docker production verification — complete (two SDK bugs found and fixed)
- [x] Execute 02-01: Visualization infrastructure — complete (TailwindCSS v4, Vue Flow, Metroviz vendored)
- [x] Execute 02-02: Metroviz component — complete (useMetrovizData composable, MetrovizMap.vue, LoadingSpinner.vue, ErrorAlert.vue)
- [x] Execute 02-03: Process flow component — complete (useFlowData, useSourceData composables, FlowDiagram.vue)
- [x] Execute 03-03: UI components — complete (FilterPanel, NodeDetailPanel, NotionLinksList, ExportButton, + node-click on viz components)
- [x] Execute 03-07: Dashboard timestamp fix — complete (sessionStorage persistence, removed watch({ immediate: true }))
- [x] Execute 03-06: Source selector dropdown — complete (useFetch /api/sources, select dropdown in viz page header, single-action source switching)

### Blockers

(None identified yet)

---

*State initialized: 2026-06-02*

---

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260604-0nu | extend flow diagram attribute display | 2026-06-04 | 489d8b9 | [260604-0nu-extend-flow-diagram-attribute-display](./quick/260604-0nu-extend-flow-diagram-attribute-display/) |
| 260604-1j9 | fix metro diagram scroll — remove D3 default wheel handler | 2026-06-04 | 5b086d0 | [260604-1j9-fix-metro-diagram-scroll-remove-d3-defau](./quick/260604-1j9-fix-metro-diagram-scroll-remove-d3-defau/) |
