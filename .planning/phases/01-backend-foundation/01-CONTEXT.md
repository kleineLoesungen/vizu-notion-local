# Phase 1: Backend Foundation - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete end-to-end Notion data pipeline with validated configuration, deployable via Docker. Covers: Notion API integration, rate limiting, in-memory caching, cross-database relation fetching, config file loading and schema validation, and Docker deployment.

Visualization rendering and user interface are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Config file format
- **D-01:** JSON format — not YAML. No extra parsing dependency.
- **D-02:** Config file named `sources.json`, mounted at `/app/config/sources.json` in the container.
- **D-03:** Pure JSON — no comment stripping. Admin documents mappings in a separate README if needed.
- **D-04:** Notion integration token is strictly via env var / `.env` file only — never read from `sources.json`. Keeps secrets separate from config.

### Relation resolution depth
- **D-05:** Resolve relations 1 level deep only (direct relation properties in the source database). No recursive following of nested relations.
- **D-06:** Relations pointing to databases not listed in `sources.json` are silently skipped — no warning, no error.
- **D-07:** Cross-database views are assembled server-side in the API route. Server merges data from multiple sources and returns a single unified payload. Client receives one clean response — visualization code does not handle multi-source composition.

### Claude's Discretion
- Startup validation feedback format (container logs vs /health endpoint — Claude picks simplest approach)
- Offline/cold-cache behavior when Notion is unreachable (error response vs partial data — Claude picks sensible default)
- Rate limiter implementation details (p-throttle vs bottleneck vs custom)
- LRU cache size limits
- Breadth-first relation fetching algorithm internals

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — Full v1 requirements, especially DATA-01–05, CONF-01–06, INFRA-01–03
- `.planning/PROJECT.md` — Core constraints (stack, deployment, auth model, read-only)

### No external specs
No external ADRs or feature docs exist yet — requirements are fully captured in decisions above and REQUIREMENTS.md.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project. No existing components, hooks, or utilities.

### Established Patterns
- None — first phase. Patterns established here will carry forward.

### Integration Points
- Phase 2 (Visualization) will consume the API routes built in this phase to fetch transformed Notion data.
- Phase 3 (User Experience) will use the same routes for filtering and node-click detail views.

</code_context>

<specifics>
## Specific Ideas

No specific references or "I want it like X" moments from discussion — open to standard approaches within the decided constraints.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-backend-foundation*
*Context gathered: 2026-06-02*
