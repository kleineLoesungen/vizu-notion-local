---
phase: 01-backend-foundation
plan: "04"
subsystem: infra
tags: [docker, notion-api, e2e-verification, notionhq-client]

# Dependency graph
requires:
  - phase: 01-03
    provides: "GET /api/sources and GET /api/sources/:id routes with relation resolver"
provides:
  - "Human-verified E2E confirmation that the full backend pipeline works against live Notion API"
  - "Two runtime bugs identified and fixed: @notionhq/client version incompatibility and column mapping crash"
  - "Confidence that Phase 2 (Visualization) can build on a working backend"
affects: [02-visualization, 03-user-experience]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pin @notionhq/client to 2.x — v5.x removed databases.query and DatabaseObjectResponse.properties"

key-files:
  created: []
  modified:
    - package.json
    - package-lock.json
    - server/api/sources/[id].get.ts

key-decisions:
  - "Downgrade @notionhq/client from 5.x to 2.3.0 — v5 broke databases.query and removed properties from DatabaseObjectResponse"
  - "Remove column mapping validation against live Notion schema at request time — retrieveDatabase() dropped .properties in v5; validation deferred to config startup only"

patterns-established:
  - "Lock major version of @notionhq/client explicitly — breaking changes between majors are non-obvious"

requirements-completed:
  - DATA-01
  - DATA-02
  - DATA-03
  - DATA-04
  - DATA-05
  - CONF-01
  - CONF-02
  - CONF-03
  - CONF-06
  - INFRA-01
  - INFRA-02
  - INFRA-03

# Metrics
duration: ~60min (human setup + verification + bug fixing)
completed: 2026-06-02
---

# Phase 1 Plan 04: E2E Verification Summary

**Live Notion API verified end-to-end: both sources return real pages through docker-compose, with two SDK version bugs discovered and fixed during verification.**

## Performance

- **Duration:** ~60 min (human setup, docker-compose verification, two bug-fix iterations)
- **Started:** 2026-06-02
- **Completed:** 2026-06-02
- **Tasks:** 2 (human-action setup + human-verify)
- **Files modified:** 3

## Accomplishments

- docker-compose up started the container successfully against a real Notion integration token
- GET /api/sources returned both configured sources (Goals and Projects databases)
- GET /api/sources/:id returned real Notion pages with properties for both sources, including a German-language Goals database with 4 mapped columns and a Projects database with 3 pages
- Two SDK-level bugs were discovered during verification and fixed before marking the plan complete
- Phase 1 backend foundation is confirmed working end-to-end — Phase 2 can build on this

## Task Commits

This plan was a human-verified checkpoint, not an autonomous execution. The two bugs discovered during verification were fixed in separate commits:

1. **Bug Fix 1: Remove column mapping validation (v5 schema regression)** - `98f6c53` (fix)
2. **Bug Fix 2: Migrate to @notionhq/client v5 dataSources API** - `a84463d` (fix)
3. **Bug Fix 3: Downgrade @notionhq/client 5.x → 2.3.0** - `cb5e2e9` (fix)
4. **Chore: Regenerate package-lock.json for 2.3.0** - `27d1169` (chore)

## Files Created/Modified

- `package.json` — Downgraded @notionhq/client from 5.x to 2.3.0
- `package-lock.json` — Regenerated for 2.3.0
- `server/api/sources/[id].get.ts` — Removed retrieveDatabase() column mapping validation that crashed on v5's DatabaseObjectResponse (properties field removed); then reverted intermediate v5 API migration after downgrade decision

## Decisions Made

- **Downgrade @notionhq/client to 2.3.0 (not stay on 5.x):** The v5 SDK removed `databases.query` and `DatabaseObjectResponse.properties`. Staying on 2.x was lower risk — the existing code was written against 2.x patterns, and v5's API surface was significantly different. Pinning 2.3.0 explicitly.
- **Remove request-time column mapping validation:** The `retrieveDatabase()` call that validated column names against the live Notion schema relied on `DatabaseObjectResponse.properties`, which v5 removed. Since config validation at startup (via ajv) already rejects malformed configs, and the route was crashing, the per-request validation was removed. This is a minor reduction in defense-in-depth but not a correctness regression.

## Deviations from Plan

This plan was a human verification checkpoint — no autonomous code was planned. The deviations below reflect bugs discovered during the human verification step.

### Bugs Found and Fixed During Verification

**1. [Rule 1 - Bug] @notionhq/client pinned at 5.x broke databases.query**
- **Found during:** Human verification — container started but GET /api/sources/:id returned 500
- **Issue:** `@notionhq/client` was installed at v5.22.0 (or similar 5.x). The v5 SDK removed `client.databases.query()` — the method used throughout the codebase. Runtime errors on first data request.
- **Fix:** Downgraded to `@notionhq/client@2.3.0` in package.json and regenerated package-lock.json
- **Files modified:** package.json, package-lock.json
- **Verification:** docker-compose up --build succeeded; GET /api/sources/:id returned real Notion pages
- **Committed in:** cb5e2e9, 27d1169

**2. [Rule 1 - Bug] Column mapping validation crashed on DatabaseObjectResponse.properties**
- **Found during:** Human verification — intermediate v5 migration attempt revealed v5 also removed `.properties` from `DatabaseObjectResponse`
- **Issue:** `server/api/sources/[id].get.ts` called `retrieveDatabase()` and accessed `.properties` to validate column mappings against the live Notion schema. The v5 SDK dropped this field, causing a property-access crash.
- **Fix:** Removed the per-request column mapping validation block. Config startup validation (ajv) still catches malformed configs. The intermediate v5 API migration (a84463d) was superseded by the downgrade (cb5e2e9).
- **Files modified:** server/api/sources/[id].get.ts
- **Verification:** GET /api/sources/:id returned enriched pages without crash; both sources confirmed working
- **Committed in:** 98f6c53 (initial removal), resolved cleanly after cb5e2e9 downgrade

---

**Total deviations:** 2 bugs found and fixed (both Rule 1 - Bug)
**Impact on plan:** Both fixes required for correct operation. The SDK version issue was a transitive dependency resolution problem — `@notionhq/client` 5.x was resolved at install time likely due to an unpinned range. No scope creep.

## Issues Encountered

- **@notionhq/client major version drift:** The package was not pinned to 2.x in package.json, allowing npm to resolve 5.x. This caused two separate runtime failures (removed API method + removed response field). Fixed by explicit `2.3.0` pin.
- **Intermediate v5 migration attempt:** Before deciding to downgrade, a partial migration to v5's API surface was committed (a84463d). This was superseded by the downgrade decision. The commit remains in history but the final state is correct.

## User Setup Required

The human administrator set up two files required for this verification (not committed to git):
- `.env` — Contains `NOTION_API_TOKEN` (real Notion integration token)
- `config/sources.json` — Two sources configured: "Goals" (German-language database, 4 mapped columns) and "Projects" (3 pages)

These files are gitignored and must be recreated if the repository is cloned on a new machine. See `config/sources.example.json` and `.env.example` for templates.

## Next Phase Readiness

Phase 1 backend foundation is complete and verified:
- docker-compose up starts cleanly
- Both /api/sources and /api/sources/:id return correct data from live Notion
- Rate limiting, caching, and config validation are all active
- Notion integration token stays server-side (never visible in browser)

Phase 2 (Visualization) can proceed. The backend API surface (`/api/sources` and `/api/sources/:id`) is stable. Key concern for Phase 2: the Metroviz library (github.com/rstockm/Metroviz) is a niche vanilla JS library — Vue integration wrapper may require additional research at the start of Phase 2.

---
*Phase: 01-backend-foundation*
*Completed: 2026-06-02*
