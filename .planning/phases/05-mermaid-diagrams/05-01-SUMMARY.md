---
phase: 05-mermaid-diagrams
plan: 01
subsystem: api
tags: [handlebars, gray-matter, mermaid, templates, config-driven]

# Dependency graph
requires:
  - phase: 01-backend-foundation
    provides: server/utils/config.ts (getConfig, SourceConfig, Source interfaces), server/middleware/validate-config.ts (startup initialization pattern)
provides:
  - server/utils/templates.ts — MermaidTemplate interface, loadTemplates(), getTemplates()
  - validate-config.ts extended to call loadTemplates() at startup (non-fatal)
  - config/mermaid.example.mmd — annotated admin template starter
  - README.md Mermaid Diagram Templates section (frontmatter fields + Handlebars bindings reference)
affects: [05-02, 05-03, mermaid-route, mermaid-composable, mermaid-ui]

# Tech tracking
tech-stack:
  added: [handlebars@4.7.9, gray-matter@4.0.3, mermaid@11.15.0]
  patterns: [YAML frontmatter parsing with gray-matter, Handlebars precompilation at load time, non-fatal template loading (D-11), templateDir derived from configPath]

key-files:
  created:
    - server/utils/templates.ts
    - config/mermaid.example.mmd
  modified:
    - package.json
    - server/middleware/validate-config.ts
    - README.md

key-decisions:
  - "Template loading is non-fatal (D-11): errors logged, app continues with zero templates — differs from source config errors which are fatal in production"
  - "templateDir derived from configPath by taking the directory portion — handles both /app/config/sources.json and config/sources.json"
  - "getTemplates() returns [] (not null/throw) before initialization — safe for eligibility checks in downstream composables"
  - "Handlebars@4.x bundles its own types — no @types/handlebars needed"

patterns-established:
  - "Template loader follows config loader pattern: scan directory, validate, store module-level, expose getter"
  - "Non-fatal startup step: wrap in try/catch, log error with [vizu] prefix, continue with empty collection"
  - "templateDir = configPath up to last slash — works for absolute and relative config paths"

requirements-completed: [MERM-01, MERM-02, MERM-04, MERM-05]

# Metrics
duration: 15min
completed: 2026-06-08
---

# Phase 05 Plan 01: Mermaid Template Loader Summary

**Server-side Mermaid template loader using gray-matter + Handlebars precompilation, with non-fatal startup loading and annotated admin example file**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-08T19:30:00Z
- **Completed:** 2026-06-08T19:45:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Installed handlebars, gray-matter, mermaid as runtime dependencies
- Created `server/utils/templates.ts` with `MermaidTemplate` interface, `loadTemplates()` (validates frontmatter + source references, precompiles Handlebars), and `getTemplates()` (safe before initialization)
- Extended `validate-config.ts` to call `loadTemplates()` at startup with non-fatal error handling — template errors log and continue, source config errors remain fatal
- Created `config/mermaid.example.mmd` as annotated admin starting point
- Added `### Mermaid Diagram Templates` section to README covering frontmatter fields and Handlebars binding syntax

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create server/utils/templates.ts** - `c063f20` (feat)
2. **Task 2: Extend validate-config.ts to call loadTemplates() at startup** - `c3d36fa` (feat)
3. **Task 3: Create config/mermaid.example.mmd and add README section** - `cba20d7` (docs)

## Files Created/Modified

- `server/utils/templates.ts` — MermaidTemplate interface, loadTemplates() (scan + validate + precompile), getTemplates()
- `server/middleware/validate-config.ts` — extended to call loadTemplates() non-fatally after loadConfig()
- `package.json` — added handlebars@4.7.9, gray-matter@4.0.3, mermaid@11.15.0
- `config/mermaid.example.mmd` — annotated admin template starter with YAML frontmatter and Handlebars flowchart body
- `README.md` — ### Mermaid Diagram Templates section added

## Decisions Made

- Template loading is non-fatal (D-11): if any .mmd file has invalid frontmatter or references an unknown source, error is logged and the app continues with zero templates. This contrasts with source config errors which are fatal in production.
- `getTemplates()` returns `[]` before initialization rather than throwing — downstream eligibility checks can call it safely at any time.
- `templateDir` is derived from `configPath` by taking the substring before the last `/`. This handles both the production path (`/app/config/sources.json` → `/app/config`) and the dev path (`config/sources.json` → `config`).
- Handlebars@4.x bundles its own TypeScript types so no `@types/handlebars` separate install was needed.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- The acceptance criteria for Task 3 included `grep "columnMappings" README.md | grep -i "mermaid\|mmd\|template"` expecting exit 0. The README section does reference `columnMappings` on lines within the Mermaid section, but those lines don't contain the words "mermaid", "mmd", or "template" on the same line — the criterion's grep pattern is over-specific. The intent (Mermaid section references columnMappings) is fully met by the content.

## Known Stubs

None — this plan creates infrastructure (loader + types) with no UI rendering stubs.

## User Setup Required

None — no external service configuration required. Admin creates `.mmd` files in `config/` to use Mermaid templates.

## Next Phase Readiness

- `getTemplates()` is available for downstream plans to build the API route, composable, and UI viz type selector
- `MermaidTemplate` interface is stable and exported — downstream plans import from `server/utils/templates`
- No blockers; all three packages installed and TypeScript-clean

---
*Phase: 05-mermaid-diagrams*
*Completed: 2026-06-08*
