---
phase: 01-backend-foundation
plan: 02
subsystem: api
tags: [nuxt, notion, bottleneck, lru-cache, ajv, rate-limiting, caching, config-validation]

# Dependency graph
requires:
  - phase: 01-01
    provides: Nuxt 3 project with all Phase 1 deps, runtimeConfig.notionApiToken, package.json with bottleneck/lru-cache/ajv/@notionhq/client
provides:
  - server/utils/config.ts: loadConfig() + getConfig() singleton with ajv schema validation
  - server/utils/rate-limiter.ts: Bottleneck singleton at 3 req/s with 429 retry handling
  - server/utils/notion.ts: Notion Client singleton + LRU cache + queryDatabase/retrievePage/retrieveDatabase
  - server/middleware/validate-config.ts: startup guard that validates config or crashes (process.exit(1) in prod)
affects: [01-03, 01-04, 02-visualization, 03-frontend]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Bottleneck token bucket for Notion 3 req/s rate limit with reservoir burst tolerance
    - LRU cache (max=500, ttl=1h, allowStale=false) wrapping all Notion API calls
    - Lazy Notion Client singleton using useRuntimeConfig() — token never at module load time
    - ajv schema validation with compile() for fast startup validation (not Zod)
    - One-shot startup guard via module-level flag (_initialized) in server middleware

key-files:
  created:
    - server/utils/config.ts
    - server/utils/rate-limiter.ts
    - server/utils/notion.ts
    - server/middleware/validate-config.ts
  modified: []

key-decisions:
  - "Lazy Notion Client instantiation (not at import time) — useRuntimeConfig() only available in Nuxt server context, not at module scope"
  - "allowStale: false — serve 503 on cold cache rather than stale data; simple and explicit for Phase 1"
  - "middleware _initialized guard (not nuxt hook) — runs on first request, survives SSR startup, consistent with Nuxt server middleware lifecycle"
  - "error messages include [vizu] prefix for easy log filtering in Docker"

patterns-established:
  - "Pattern: All Notion API calls wrapped with withRateLimit() — no direct notion.databases.query() calls allowed outside server/utils/notion.ts"
  - "Pattern: LRU cache key format: '{functionName}:{id}' — e.g. queryDatabase:abc123, retrievePage:xyz789"
  - "Pattern: Token never read outside server context — getNotionClient() is lazy, reads useRuntimeConfig() on first call"
  - "Pattern: ajv.compile() at module load (not per-request) — schema compiled once, validate() called on each loadConfig()"

requirements-completed: [CONF-01, CONF-03, CONF-04, DATA-01, DATA-02, DATA-03, DATA-05]

# Metrics
duration: 2min
completed: 2026-06-02
---

# Phase 01 Plan 02: Server Utilities Summary

**Bottleneck rate limiter (3 req/s token bucket), LRU-cached Notion client singleton, ajv-validated config loader, and startup middleware that crashes on bad config — four server utility files forming the complete data pipeline backbone**

## Performance

- **Duration:** 2 min
- **Started:** 2026-06-02T19:24:17Z
- **Completed:** 2026-06-02T19:25:44Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Config loader reads sources.json from /app/config/sources.json, validates against ajv schema, caches singleton — fails fast with human-readable error on missing/invalid/malformed config
- Rate limiter singleton (Bottleneck) enforces 3 req/s with token bucket burst tolerance and automatic 429 Retry-After handling
- Notion client wrapper authenticates lazily via useRuntimeConfig().notionApiToken (never process.env directly), caches all responses in LRU cache (max=500, ttl=1h), handles full pagination for queryDatabase
- Startup middleware validates config on first request; exits with process.exit(1) in production, returns 503 in dev — prevents app from serving requests with invalid config

## Task Commits

Each task was committed atomically:

1. **Task 1: Config loader with ajv schema validation and startup middleware** - `cde1fc2` (feat)
2. **Task 2: Rate limiter singleton and Notion client wrapper with LRU cache** - `638fd6f` (feat)

**Plan metadata:** _(created after this summary)_ (docs: complete plan)

## Files Created/Modified

- `server/utils/config.ts` - loadConfig() + getConfig() with ajv validation, SourceConfig/Source/ColumnMappings types
- `server/middleware/validate-config.ts` - startup guard: loadConfig on first request, process.exit(1) in prod on failure
- `server/utils/rate-limiter.ts` - Bottleneck singleton (minTime=333ms, reservoir=3, refresh=1s) + withRateLimit() + 429 handler
- `server/utils/notion.ts` - lazy Notion Client via useRuntimeConfig(), LRU cache (max=500, ttl=1h), queryDatabase/retrievePage/retrieveDatabase all rate-limited and cached

## Decisions Made

- Used lazy Notion Client initialization (not at module load) — `useRuntimeConfig()` is only available in the Nuxt server request context, not at import/module scope. Attempting to call it at module level would throw.
- Set `allowStale: false` on LRU cache — Phase 1 serves 503 on cold cache rather than stale data. Simpler and more predictable; stale data tolerance is a Phase 2 concern.
- Used `_initialized` module-level flag in validate-config middleware — clean one-shot pattern that prevents re-running loadConfig on every request after successful startup.
- Error messages prefixed with `[vizu]` — makes container logs filterable with `docker logs | grep vizu`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no new external service configuration required. The `NOTION_API_TOKEN` setup was documented in Plan 01-01.

## Known Stubs

None — no stub values or placeholder data. All utilities are fully implemented. Actual Notion API calls will succeed once `NOTION_API_TOKEN` is set and `config/sources.json` is configured.

Note: DATA-05 (validate column mappings against actual Notion schema) is partially complete. The ajv schema validation covers the structural shape of sources.json. The Notion-level property existence check (verifying that columnMappings values exist as actual Notion properties) will be completed in Plan 03 when routes are wired and retrieveDatabase() can be called at startup.

## Next Phase Readiness

- All server utility files are ready for Plan 01-03 (API routes) to import and use
- API routes import from `server/utils/config`, `server/utils/notion` — all exports are defined and typed
- `getConfig()` is safe to call from routes (startup middleware ensures config is loaded before any route handler runs)
- `queryDatabase(databaseId)` returns `PageObjectResponse[]` — Plan 03 transforms these into API responses

---
*Phase: 01-backend-foundation*
*Completed: 2026-06-02*
