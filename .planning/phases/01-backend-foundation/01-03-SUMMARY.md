---
phase: 01-backend-foundation
plan: 03
subsystem: api
tags: [nuxt, notion, relations, breadth-first, api-routes, column-mapping-validation, typescript]

# Dependency graph
requires:
  - phase: 01-02
    provides: "server/utils/config.ts (getConfig, Source, SourceConfig), server/utils/notion.ts (queryDatabase, retrievePage, retrieveDatabase), server/utils/rate-limiter.ts (withRateLimit)"
provides:
  - "server/utils/relations.ts: resolveRelations() BFS depth-1 implementation, EnrichedPage interface"
  - "server/routes/api/sources.get.ts: GET /api/sources — list all configured sources with columnMappings"
  - "server/routes/api/sources/[id].get.ts: GET /api/sources/:id — full source data with D-05/D-06/D-07 enforced"
affects: [02-visualization, 03-frontend]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - BFS relation resolver with configuredDatabaseIds filter (D-06 enforcement)
    - Promise.allSettled for resilient parallel page fetching (failed/deleted pages silently skipped)
    - Column mapping validation against live Notion schema via retrieveDatabase() at request time (DATA-05)
    - Unified pre-merged payload { source, pages, meta } returned to client (D-07 enforcement)
    - availableRoles in meta for downstream viz type detection (CONF-04)

key-files:
  created:
    - server/utils/relations.ts
    - server/routes/api/sources.get.ts
    - server/routes/api/sources/[id].get.ts
  modified: []

key-decisions:
  - "D-05 hardcoded: resolveRelations never recurses — depth=1 is enforced in code structure, not a config parameter"
  - "D-06 via parent.database_id: related pages are fetched first, then filtered by checking their parent db against configuredSources (simpler than pre-querying relation metadata)"
  - "Promise.allSettled over Promise.all: failed page fetches (deleted pages, permission errors) are silently dropped rather than failing the entire request"
  - "Column mapping validation at request time (not startup): retrieveDatabase() result is LRU-cached, so repeat calls are fast; validation at startup would require Notion API access before serving any requests"

patterns-established:
  - "Pattern: EnrichedPage extends PageObjectResponse with resolvedRelations — client always receives typed merged data, never raw Notion responses"
  - "Pattern: 404 for unknown source id, 500 for invalid column mappings, 502 for Notion API failures — consistent HTTP semantics in routes"
  - "Pattern: [vizu] prefix on all error messages — Docker log filtering with `docker logs | grep vizu`"

requirements-completed: [DATA-01, DATA-04, DATA-05, CONF-03, CONF-04]

# Metrics
duration: 2min
completed: 2026-06-02
---

# Phase 01 Plan 03: API Routes and Relation Resolver Summary

**BFS depth-1 relation resolver + GET /api/sources and GET /api/sources/:id routes with live column mapping validation — complete data pipeline from Notion to visualization layer**

## Performance

- **Duration:** 2 min
- **Started:** 2026-06-02T19:28:26Z
- **Completed:** 2026-06-02T19:30:05Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Relation resolver uses BFS with depth=1 hardcoded — collects all relation page IDs at depth-0 scan, then batch-fetches in parallel using Promise.allSettled; silently drops pages from databases not in config (D-06)
- GET /api/sources returns all configured source descriptors including columnMappings for client consumption — no Notion API calls at this endpoint
- GET /api/sources/:id validates every columnMappings entry against actual Notion property names via retrieveDatabase() (cached), fails with 500 + human-readable error listing all offending roles, then fetches all pages, resolves relations, and returns a unified `{ source, pages, meta }` payload

## Task Commits

Each task was committed atomically:

1. **Task 1: Breadth-first relation resolver (depth=1)** - `ee2078c` (feat)
2. **Task 2: API routes — sources list and source-by-id with column mapping validation** - `2966d0e` (feat)

**Plan metadata:** _(created after this summary)_ (docs: complete plan)

## Files Created/Modified

- `server/utils/relations.ts` - resolveRelations() + EnrichedPage interface; BFS D-05/D-06/D-07 enforcement
- `server/routes/api/sources.get.ts` - GET /api/sources; returns source descriptors without Notion API calls
- `server/routes/api/sources/[id].get.ts` - GET /api/sources/:id; validates mappings, fetches pages, resolves relations, returns unified payload

## Decisions Made

- D-05 hardcoded in code structure, not a config parameter: `resolveRelations` never calls itself and returns `EnrichedPage[]` — no `maxDepth` option to accidentally increase.
- D-06 enforced by checking `page.parent.database_id` after fetching: related pages are fetched unconditionally, then filtered. This avoids needing to pre-query relation metadata to know the target database.
- `Promise.allSettled` over `Promise.all`: a deleted or permission-denied related page should not crash the entire request — those pages are silently skipped.
- Column mapping validation at request time (not startup): `retrieveDatabase()` is LRU-cached so repeat calls are near-zero cost; validating at startup would require Notion API access before the server can serve any request at all.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no new external service configuration required.

## Known Stubs

None — all three files are fully implemented. GET /api/sources and GET /api/sources/:id will work correctly once `NOTION_API_TOKEN` is set and `config/sources.json` is configured with valid Notion database IDs and column mappings.

## Next Phase Readiness

- GET /api/sources and GET /api/sources/:id are the primary endpoints Phase 2 (Visualization) will consume
- `EnrichedPage` type in server/utils/relations.ts should be re-exported or imported by Phase 2 composables
- `availableRoles` in the /api/sources/:id meta payload provides the data Phase 2 needs for automatic visualization type detection (CONF-04)
- Plan 01-04 (Docker production verification) can now test the full stack end-to-end

---
*Phase: 01-backend-foundation*
*Completed: 2026-06-02*
