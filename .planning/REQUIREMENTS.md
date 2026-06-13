# Requirements: vizu-notion-local

**Defined:** 2026-06-02
**Core Value:** Any Notion database structure can be visualized as a meaningful diagram without touching application code — purely through configuration.

## v1 Requirements

### Data Layer

- [x] **DATA-01**: Server routes proxy all Notion API calls (integration token never exposed to client)
- [x] **DATA-02**: Rate limiting enforces maximum 3 requests/second to Notion API
- [x] **DATA-03**: Memory cache stores Notion API responses (1 hour TTL) to reduce redundant calls
- [x] **DATA-04**: Cross-database relation properties are resolved using breadth-first fetching to prevent N+1 query patterns
- [x] **DATA-05**: App validates config column mappings against actual Notion database schema at container startup, failing fast with a clear error if a mapped property does not exist

### Configuration

- [x] **CONF-01**: Admin defines Notion database sources and column-to-role mappings in a YAML or JSON config file
- [x] **CONF-02**: Config file is mounted as a read-only Docker volume so admin can update it and restart the container without rebuilding the image
- [x] **CONF-03**: Config supports all three Notion structure types: nested hierarchy (parent-child relations), linked databases (relation properties), and single database (flat)
- [x] **CONF-04**: Visualization type available for a source is determined automatically by the mapped data types (e.g., relation columns with parent → metro map eligible; sequence/step columns → flow eligible)
- [x] **CONF-05**: Deployment targets a single Notion workspace (one integration token per container)
- [x] **CONF-06**: Notion integration token is supplied via Docker environment variable / env file (not stored in config file)

### Visualization

- [x] **VIZ-01**: Metro map visualization (Metroviz) renders hierarchical Notion data as a metro-line style diagram
- [x] **VIZ-02**: Process flow visualization (Vue Flow) renders sequential/workflow Notion data as a node-edge flow diagram
- [x] **VIZ-03**: Available visualization types for a given source are derived from config data type mappings — user selects from valid options only

### User Interface

- [x] **UI-01**: Source switcher allows user to navigate between configured Notion database sources
- [x] **UI-02**: User can enable or disable individual sources from view
- [x] **UI-03**: Visualization type selector lets user switch between available viz types for the active source
- [x] **UI-04**: Filter panel lets user filter visible nodes by property values (status, tag, date range, etc.)
- [x] **UI-05**: Clicking a node opens a detail view showing the full Notion properties for that entry
- [x] **UI-06**: Current application state (active sources, selected viz type, applied filters) is encoded in the URL so users can share a link that restores the exact view

### Infrastructure

- [x] **INFRA-01**: App starts with a single `docker-compose up` command
- [x] **INFRA-02**: Config file is mounted via Docker volume (`./config:/app/config:ro`)
- [x] **INFRA-03**: Notion integration token is passed via `.env` file referenced in docker-compose

## v1.1 Requirements

**Defined:** 2026-06-13 — Phases 5 & 6 (all delivered)

### Mermaid Templates

- [x] **MMD-01**: Admin can define Mermaid diagram templates as `.mmd` files in the config directory, loaded at container start
- [x] **MMD-02**: Templates use YAML frontmatter to declare `title` and `sources` (Notion source names from sources.json)
- [x] **MMD-03**: Template body uses Handlebars syntax to bind Notion data — `{{fieldName}}` for scalar values, `{{#each sourceName}}` to iterate rows
- [x] **MMD-04**: Templates appear as selectable viz types in the source selector for every source listed in the template
- [x] **MMD-05**: Template render errors display inline in the diagram area without crashing the container

### Mermaid Improvements

- [x] **MMD-06**: `{{attribute}}` bindings auto-generate stable Mermaid node definitions (`id["value"]`) server-side — template authors never manage node IDs
- [x] **MMD-07**: User can zoom and pan the Mermaid diagram (Ctrl+scroll, drag-to-pan — consistent with Metro and Flow)
- [x] **MMD-08**: User can isolate a node and its 1-hop Notion-relation neighbours via a per-node "show related" action in the filter panel

### UI Improvements

- [x] **UI-07**: Filter panel spans full viewport height with no height cap (all viz types)
- [x] **UI-08**: "Has relation" filter shows only nodes that have Notion relations to other visible nodes (all viz types)

### Developer Experience

- [x] **DX-01**: Browser-based MMD editor resolves frontmatter, Handlebars bindings, and live Notion data server-side — output is identical to what the app renders
- [x] **DX-02**: Editor provides source field reference, starter templates (blank, simple example, existing server templates), and syntax documentation links

## v2 Requirements

### Persistence & Reliability

- **DATA-06**: SQLite persistent cache layer (24h TTL) for offline tolerance and cache survival across container restarts
- **DATA-07**: Health/diagnostics endpoint to verify Notion token validity and accessible database list at runtime

### Visualization

- **VIZ-04**: Timeline visualization for date-based Notion data
- **VIZ-05**: Table/grid fallback view for any source that doesn't match other visualization types

### UI Polish

- **UI-07**: Dark mode toggle

## Out of Scope

| Feature | Reason |
|---------|--------|
| Authentication / access control | Local Docker, network trust model — no auth needed |
| Write-back to Notion | Read-only visualization by design |
| Admin UI for configuration | Config file + container restart is simpler and sufficient |
| Multiple Notion workspaces | Single workspace per deployment keeps scope simple |
| Mobile optimization | Desktop browser target |
| Real-time auto-refresh | Manual refresh / cache TTL sufficient for v1 |
| Custom visualization plugins | Config-driven type detection covers v1 use cases |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |
| DATA-04 | Phase 1 | Complete |
| DATA-05 | Phase 1 | Complete |
| CONF-01 | Phase 1 | Complete |
| CONF-02 | Phase 1 | Complete |
| CONF-03 | Phase 1 | Complete |
| CONF-04 | Phase 1 | Complete |
| CONF-05 | Phase 1 | Complete |
| CONF-06 | Phase 1 | Complete |
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Complete |
| VIZ-01 | Phase 2 | Complete |
| VIZ-02 | Phase 2 | Complete |
| VIZ-03 | Phase 2 | Complete |
| UI-01 | Phase 3 | Complete |
| UI-02 | Phase 3 | Complete |
| UI-03 | Phase 3 | Complete |
| UI-04 | Phase 3 | Complete |
| UI-05 | Phase 3 | Complete |
| UI-06 | Phase 3 | Complete |

| MMD-01 | Phase 5 | Complete |
| MMD-02 | Phase 5 | Complete |
| MMD-03 | Phase 5 | Complete |
| MMD-04 | Phase 5 | Complete |
| MMD-05 | Phase 5 | Complete |
| MMD-06 | Phase 6 | Complete |
| MMD-07 | Phase 6 | Complete |
| MMD-08 | Phase 6 | Complete |
| UI-07  | Phase 6 | Complete |
| UI-08  | Phase 6 | Complete |
| DX-01  | Quick tasks | Complete |
| DX-02  | Quick tasks | Complete |

**Coverage:**
- v1 requirements: 23 total — Mapped to phases: 23 ✓
- v1.1 requirements: 12 total — Mapped to phases: 12 ✓
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-02*
*Last updated: 2026-06-13 after v1.1 milestone definition*
