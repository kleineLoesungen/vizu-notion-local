---
phase: 05-mermaid-diagrams
plan: 02
subsystem: api
tags: [mermaid, handlebars, composables, server-routes, notion-api]

# Dependency graph
requires:
  - phase: 05-mermaid-diagrams
    plan: 01
    provides: server/utils/templates.ts (MermaidTemplate interface, getTemplates())
  - phase: 01-backend-foundation
    provides: server/utils/notion.ts (queryDatabase), server/utils/config.ts (getConfig, Source)
  - phase: 02-metro-visualization
    provides: composables/useSourceData.ts (SourceApiResponse, isMetroEligible, isFlowEligible)
provides:
  - server/routes/api/mermaid/[templateId].get.ts — GET /api/mermaid/:templateId returns rendered diagram string
  - server/routes/api/mermaid/templates.get.ts — GET /api/mermaid/templates returns template metadata list
  - composables/useMermaidTemplate.ts — client composable for fetching and rendering Mermaid diagrams
  - composables/useSourceData.ts — extended with hasMermaidTemplates and mermaidTemplates
affects: [05-03, mermaid-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: [dynamic mermaid import for SSR-safety, useFetch for template API, Handlebars context built from columnMappings roles, extractPropertyValue covers 10 Notion property types]

key-files:
  created:
    - server/routes/api/mermaid/[templateId].get.ts
    - server/routes/api/mermaid/templates.get.ts
    - composables/useMermaidTemplate.ts
  modified:
    - composables/useSourceData.ts

key-decisions:
  - "extractPropertyValue handles 10 Notion property types (title, rich_text, select, multi_select, date, checkbox, number, url, email, phone_number) — comprehensive coverage for common admin templates"
  - "page.id always included in mappedRows as 'id' key — provides stable reference for Handlebars templates that need to link back to source pages"
  - "useMermaidTemplate uses dynamic import('mermaid') inside onMounted — ensures SSR safety since mermaid.js accesses window/document at import time"
  - "GET /api/mermaid/templates is a separate endpoint (not part of source response) — lightweight metadata-only call, no Notion API involved, safe to call on every page load"
  - "hasMermaidTemplates derived from sourceName (not sourceId/databaseId) — template frontmatter references source by name, matching getConfig() source.name"

patterns-established:
  - "Notion property extraction via switch(prop.type) with safe fallback to '' — consistent with existing server routes"
  - "Server route error handling: 404 for unknown template, 500 for missing source config, 502 for Notion API failure — covers all failure paths"

requirements-completed: [MERM-01, MERM-02, MERM-03, MERM-04, MERM-05]

# Metrics
duration: 15min
completed: 2026-06-08
---

# Phase 05 Plan 02: Mermaid API Route and Composables Summary

**Mermaid render route + composables: GET /api/mermaid/:templateId returns substituted diagram string; useMermaidTemplate handles SSR-safe client rendering; useSourceData extended with Mermaid eligibility detection**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-08T19:35:00Z
- **Completed:** 2026-06-08T19:50:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `server/routes/api/mermaid/[templateId].get.ts` — fetches source data via queryDatabase(), maps pages to flat objects using columnMappings roles, renders Handlebars template, returns `{ templateId, title, diagramString }`
- Created `server/routes/api/mermaid/templates.get.ts` — returns lightweight template metadata list `[{id, title, sources}]` without any Notion API calls
- Created `composables/useMermaidTemplate.ts` — SSR-safe composable using dynamic `import('mermaid')` inside `onMounted`, useFetch for template API, `renderDiagram(containerId)` function, `renderError` ref
- Extended `composables/useSourceData.ts` with `hasMermaidTemplates` (boolean) and `mermaidTemplates` (Array<{id, title}>) derived from `/api/mermaid/templates`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create GET /api/mermaid/[templateId] server route** - `969cf57` (feat)
2. **Task 2: Create useMermaidTemplate composable + extend useSourceData** - `e9a6921` (feat)

## Files Created/Modified

- `server/routes/api/mermaid/[templateId].get.ts` — main render route with extractPropertyValue(), 404/500/502 error handling
- `server/routes/api/mermaid/templates.get.ts` — template list metadata endpoint
- `composables/useMermaidTemplate.ts` — MermaidTemplateResponse interface, useFetch, onMounted mermaid init, renderDiagram(), watch for re-render on string change
- `composables/useSourceData.ts` — hasMermaidTemplates and mermaidTemplates computed refs added; /api/mermaid/templates fetched in parallel

## Decisions Made

- `extractPropertyValue` handles 10 Notion property types (title, rich_text, select, multi_select, date, checkbox, number, url, email, phone_number) with a safe fallback to `''` for unsupported types.
- `page.id` is always included in each mapped row as the `id` key — provides a stable reference for Handlebars templates that need to link back to Notion source pages.
- `useMermaidTemplate` uses `await import('mermaid')` inside `onMounted` — ensures SSR safety since mermaid.js accesses `window`/`document` at import time.
- `/api/mermaid/templates` is a separate endpoint rather than adding template metadata to the existing source response — keeps it lightweight (no Notion API calls) and safe to call on every source page load.
- `hasMermaidTemplates` derived from `sourceName.value` (not `databaseId`) — template frontmatter references sources by name, matching `config.sources[].name`.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this plan creates server infrastructure and composables with no UI rendering stubs. The `renderDiagram()` function and `containerId` computed ref are ready for Plan 03 to consume.

## Self-Check: PASSED

Files verified:
- `server/routes/api/mermaid/[templateId].get.ts` — FOUND
- `server/routes/api/mermaid/templates.get.ts` — FOUND
- `composables/useMermaidTemplate.ts` — FOUND
- `composables/useSourceData.ts` — FOUND (extended)
Commits verified:
- `969cf57` — FOUND (Task 1)
- `e9a6921` — FOUND (Task 2)
TypeScript: Zero errors in new/modified files

## Next Phase Readiness

- `GET /api/mermaid/:templateId` is ready for Plan 03 to render Mermaid diagrams in the UI
- `GET /api/mermaid/templates` provides the template list for source page eligibility checks
- `useMermaidTemplate(templateId)` exposes `diagramString`, `containerId`, `renderDiagram()`, `renderError` — all needed by MermaidDiagram.vue in Plan 03
- `useSourceData` now returns `hasMermaidTemplates` and `mermaidTemplates` — ready for viz page's viz type selector
