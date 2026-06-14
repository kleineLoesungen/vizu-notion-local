---
type: quick
id: 260614-rrw
phase: quick
plan: 260614-rrw
subsystem: mermaid-api
tags: [mermaid, relations, handlebars, multi-value, backend]
dependency_graph:
  requires: []
  provides:
    - "row[role + '_all'] string[] in Handlebars context for all relation-type columnMapping roles"
    - "row[role] first non-hidden title — backward compatible"
  affects:
    - "All Mermaid templates using relation-type columnMappings"
tech_stack:
  added: []
  patterns:
    - "Multi-value relation resolution: iterate all IDs, produce both scalar and array fields"
    - "Non-null assertion (!) for index-bounded array access after length guard"
key_files:
  modified:
    - server/routes/api/mermaid/[templateId].get.ts
    - server/routes/api/mermaid/preview.post.ts
decisions:
  - "hiddenIds filtering applied to both role and role_all in [templateId].get.ts — consistent exclusion"
  - "preview.post.ts intentionally has no hiddenIds param — preview is filter-free by design"
  - "row typed Record<string, unknown>[] to accommodate mixed string/string[] values"
metrics:
  duration: "~10 minutes"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
  completed_date: "2026-06-14"
---

# Quick Task 260614-rrw: Support Multi-Value Relations in Mermaid Templates

**One-liner:** Extended `resolveRelationValues` in both Mermaid API routes to iterate all relation IDs per page and expose `role_all: string[]` alongside the existing backward-compatible scalar `role` field.

## Objective

Enable Handlebars template authors to write `{{#each parent_all}}` to emit one Mermaid edge per relation target, while preserving `{{parent}}` for existing single-relation templates.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Update resolveRelationValues in [templateId].get.ts | 45d5171 | server/routes/api/mermaid/[templateId].get.ts |
| 2 | Update resolveRelationValues in preview.post.ts | 09d665f | server/routes/api/mermaid/preview.post.ts |

## Changes Made

### [templateId].get.ts (Task 1)

1. **`toFetch` loop widened** — replaced `relation[0]?.id` with a full `for...of rel of relation` loop, fetching titles for every related page, not just the first.
2. **`hiddenIds` parameter added** — optional `hiddenIds?: Set<string>` as last parameter; call site passes `hiddenIds ?? undefined`.
3. **Write-back loop rewritten** — now produces:
   - `row[role]` = first non-hidden title (backward compat)
   - `row[role + '_all']` = `string[]` of all non-hidden titles
4. **Types widened** — `rows: Record<string, unknown>[]`, `mappedRows: Record<string, unknown>`, `context: Record<string, Record<string, unknown>[]>`.

### preview.post.ts (Task 2)

1. **`toFetch` loop widened** — same full `for...of` pattern, no hiddenIds.
2. **Write-back loop rewritten** — produces `row[role]` and `row[role + '_all']` with no hidden filtering (preview shows all data).
3. **Types widened** — same as Task 1.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical] Added `!` non-null assertions for index-bounded array access**
- **Found during:** Task 1 TypeScript check
- **Issue:** `pages[0]` and `pages[i]` inferred as `PageObjectResponse | undefined` by TypeScript even after `pages.length === 0` guard — TS18048 errors
- **Fix:** Added `!` non-null assertions (`pages[0]!`, `pages[i]!`) which are safe because the loop bound is `i < pages.length`
- **Files modified:** Both route files
- **Commits:** 45d5171, 09d665f

## Known Stubs

None — all relation values are fully wired from the Notion API. The `role_all` field is populated at runtime from actual relation data.

## Success Criteria Verification

- [x] `row[role + '_all']` is `string[]` in Handlebars context for every relation-type columnMapping role
- [x] Hidden page IDs excluded from both `role` and `role_all` in [templateId].get.ts
- [x] preview.post.ts includes all titles with no exclusion
- [x] Existing templates using `{{parent}}` continue to work (first title, same as before)
- [x] New templates can use `{{#each parent_all}} ... {{/each}}`
- [x] TypeScript compiles cleanly in both files (zero new errors introduced)

## Self-Check: PASSED

- server/routes/api/mermaid/[templateId].get.ts — FOUND
- server/routes/api/mermaid/preview.post.ts — FOUND
- Commit 45d5171 — FOUND
- Commit 09d665f — FOUND
