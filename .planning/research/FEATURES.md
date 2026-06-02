# Feature Landscape: Notion Visualization Dashboard

**Domain:** Local data visualization for Notion databases
**Context:** Docker webapp, read-only, config-driven, hierarchical + process flow visualizations
**Researched:** 2026-06-02

## Table Stakes

Features users expect. Missing = product feels incomplete or unusable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Read data from Notion databases** | Core functionality — tool is meaningless without this | Medium | Requires Notion API integration token, database discovery, rate limit handling |
| **Render hierarchical relationships** | Metroviz specifically requested for goals→missions→projects — if not rendered, primary use case fails | High | Metroviz library integration, parent-child relationship mapping from config |
| **Render process flows** | Vue Flow requested for workflow visualization — second primary use case | High | Vue Flow or equivalent, node/edge mapping from config |
| **Config-file driven setup** | User requirement: no admin UI, file + restart model | Low | JSON/YAML parser, validation, error messaging for malformed configs |
| **Local deployment (Docker)** | User requirement: self-hosted, no cloud dependency | Medium | docker-compose support, environment variable handling, data persistence across restarts |
| **Read-only interface** | Stated requirement: no write-back to Notion, users browse/filter only | Low | Disable edit/create/delete UI elements, ensure API calls are GET-only |
| **Basic filtering** | Users need to focus on subsets of data (e.g., "show only Q2 projects") | Medium | Filter by field value, date range, or boolean flag; preserve filter state in URL |
| **Node click navigation** | Users need to drill down: click a node to see details or related data | Medium | Modal/sidebar detail view, potentially link to related records across databases |
| **Cross-database visualization** | User stated need: single diagram pulling from multiple Notion databases | Medium | Support multiple data sources in config, join logic, composite key handling |
| **Caching / offline tolerance** | Notion API has rate limits; local usage should survive brief offline periods | Medium | SQLite or similar local cache, TTL-based expiry, fallback to cache on API failure |
| **Performance on moderate data** | Render 100-500 nodes without major lag (typical goal/project structure) | Medium | Virtualization or lazy rendering, careful with SVG performance on metro map |

## Differentiators

Features that set this tool apart. Not expected, but valued if present.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Multi-visualization dashboard** | Single tool handles metro maps AND process flows (not just one) | Low-Medium | Allows users to organize multiple views of same database; powerful for complex Notion workspaces |
| **Smart relationship inference** | Config can say "hierarchy is parent-child column" and tool auto-maps relationships | Medium | Reduces config burden; makes tool more approachable for non-technical admins |
| **Real-time data refresh without restart** | Config changes take effect immediately instead of requiring container restart | High | Requires hot-reload mechanism, careful state management, potential UX complexity |
| **Time-series metric charts** | Add gauge/line charts for numeric fields over time (noted as "potentially" in scope) | High | New Metroviz-only tool; significant new visualization library; deferred from MVP |
| **Export as image or PDF** | Users want to share visualizations in documents/slides | Medium | Use SVG/canvas export libraries; PNG/PDF generation requires external service or headless browser |
| **Search across all fields** | Global search box to find nodes by any text field | Low | Simple client-side or server-side search; improves discoverability |
| **Color coding by field value** | Visually distinguish nodes by status, priority, or category (e.g., "red = blocked, green = done") | Medium | Config-driven color mapping, legend display, accessible color choices |
| **Customizable node labels** | Config defines what text appears on each node (title + one other field) | Low | Template-based label rendering; powerful for fitting data into metro map space |
| **Dark mode** | Local tool, user preference, accessible at night | Low | TailwindCSS already supports dark mode; toggle state persistence |
| **Save and share filter state** | Create bookmarkable URLs with specific filters applied | Low | URL query params, shareable links for specific views |
| **Multi-language support** | Tool UI in user's language (not Notion data — just labels/buttons) | Low | i18n framework integration; nice-to-have, not critical for MVP |

## Anti-Features

Features to explicitly NOT build in v1.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Write-back to Notion** | Out of scope by design. Adding this creates auth complexity, requires Notion CRUD permissions, and is a different product category (no longer "read-only visualization") | Keep read-only. If users need to update Notion from visualization, they use Notion UI directly |
| **Authentication / access control** | Local Docker, no auth requirement. Adding this increases complexity 3x (session management, permissions model, secure token storage). Trust the network | Assume single-user or trusted team. Document "not for public internet" clearly |
| **Admin UI for configuration** | User wants config file + restart. Building a web UI for config creates another product to maintain and test. File-based approach is simpler | Keep YAML/JSON config. If users want UI later, that's a Phase 2+ stretch goal |
| **Real-time bidirectional sync** | Watching Notion for changes and auto-updating visualization requires webhooks, websockets, and complex state management. MVP is pull-only with manual refresh | Cache-based refresh with TTL. Manual "refresh" button on UI if needed |
| **Mobile-responsive design** | Project explicitly targets desktop browsers. Adding mobile breaks focus. Users wanting mobile can use Notion app directly | Desktop-first CSS; don't optimize for mobile in v1 |
| **Advanced charting (v1)** | Time-series charts noted as "potentially" and "deferred." This is a substantial feature (new viz library, data aggregation, time-based filtering). Defer until core viz works | Focus on metro map + process flow. Add charts in later milestone when usage patterns are clear |
| **Custom viz library integration** | Users asking for their own viz library? Don't allow arbitrary plugins in v1. Creates security/maintenance burden | Stick with Metroviz + Vue Flow. New viz types require code changes, not config changes |
| **Full-text search with indexing** | Simple field-level filtering is enough. Building a search index adds complexity without clear ROI | Use basic client-side search if users ask; lazy-load this feature |
| **Collaborative editing or comments** | Notion has comments; visualization isn't a document. Don't replicate Notion's collaboration features | Keep visualization read-only and simple |
| **Versioning or undo/redo** | User doesn't edit data here; it comes from Notion. No point in versioning viz state | Unnecessary scope |

## Feature Dependencies

```
Config file parsing
  ├→ Data source connection (Notion API setup)
  │   └→ Caching layer (handle rate limits)
  │       └→ Filtering and search (requires cached data to filter)
  │
  ├→ Metroviz hierarchy mapping
  │   └→ Node click navigation (details modal)
  │       └→ Cross-database linking (references between records)
  │
  ├→ Vue Flow process mapping
  │   └→ Node click navigation (details modal)
  │
  └→ Dark mode, customizable labels (depend on config defining label template)

Core dependencies:
- Notion API integration must complete before filtering/search/caching
- Config parsing must complete before any visualization can render
- Metro map rendering must complete before node interaction features
- Process flow rendering must complete before node interaction features
```

## MVP Recommendation

**Ship with these (MVP):**
1. Read data from Notion databases via API (core)
2. Config-file driven setup with validation
3. Local Docker deployment
4. Render hierarchical metro maps (Metroviz)
5. Render process flows (Vue Flow)
6. Cross-database visualization
7. Read-only interface
8. Basic filtering by field value
9. Node click navigation to details
10. Caching layer with TTL and offline fallback
11. Performance-appropriate for 100-500 nodes

**Defer (Phase 2+):**
- Time-series charts
- Export as image/PDF
- Real-time refresh without restart
- Search across all fields
- Color coding by field value (start simple, add later)
- Save/share filter state in URL
- Dark mode (nice-to-have after MVP launch)
- Multi-language support

**Rationale:**
MVP focuses on the two core visualization types (metro map + process flow) with config-driven setup, covering the stated use cases (goals/missions/projects hierarchy + workflow processes). Caching and offline tolerance are critical for local Docker. Filtering and navigation are minimum for usability. Everything else is optimization or nice-to-have that can come after users validate the core value.

Anti-features (write-back, auth, mobile, plugins) are excluded by design to reduce scope and complexity.

## Sources

**Training data:** Notion API documentation, Metroviz library patterns, Vue Flow documentation, common patterns in Grafana/Metabase/Superset, industry standards for dashboard UX.

**Confidence note:** This is based on established patterns in the Notion/visualization ecosystem (cutoff Feb 2025) and the specific project constraints provided. Web search was unavailable during research; recommendations prioritize the project's stated goals and common pitfalls in similar tools. Recommend validating with early users post-MVP.
