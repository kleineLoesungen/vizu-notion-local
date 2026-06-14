---
phase: quick
plan: 260614-sup
subsystem: mermaid-templates
tags: [mermaid, relations, handlebars, templates]
dependency_graph:
  requires: [260614-rrw]
  provides: [expandRelationRows in both mermaid route files]
  affects: [server/routes/api/mermaid/[templateId].get.ts, server/routes/api/mermaid/preview.post.ts, server/utils/templates.ts, README.md]
tech_stack:
  added: []
  patterns: [cross-product expansion of multi-value relation arrays before Handlebars context assignment]
key_files:
  created: []
  modified:
    - server/routes/api/mermaid/[templateId].get.ts
    - server/routes/api/mermaid/preview.post.ts
    - server/utils/templates.ts
    - README.md
decisions:
  - "expandRelationRows strips _all fields from output — they are internal, not template-facing"
  - "allRows (FilterPanel) uses pre-expansion mappedRows — one entry per Notion page, unaffected"
  - "vals.length <= 1 guard: skip cross-product for single-value relations; baseRow already has the value"
metrics:
  duration: ~10 minutes
  completed: 2026-06-14
  tasks_completed: 2
  files_modified: 4
---

# Phase quick Plan 260614-sup: Auto-expand multi-value relation rows Summary

Auto-expand Notion relation rows with multiple targets into one scalar row per target before the Handlebars context is assigned, so `{{title}} --> {{parent}}` transparently produces N edges when parent has N relation targets.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add expandRelationRows to both route files | c7b2769 | [templateId].get.ts, preview.post.ts |
| 2 | Harden group helper + README docs | d78c250 | templates.ts, README.md |

## What Was Built

### Task 1 — expandRelationRows in both mermaid route files

Added `expandRelationRows(rows)` function to both `server/routes/api/mermaid/[templateId].get.ts` and `server/routes/api/mermaid/preview.post.ts`.

The function:
1. Detects `_all`-suffixed array fields produced by `resolveRelationValues`
2. Builds a base row from all non-`_all` string fields
3. Cross-products every multi-value relation array (`vals.length > 1`) into separate rows
4. Strips `_all` fields from output so templates never see them

In `[templateId].get.ts`: applied to `visibleRows` (post-hidden-filter) before `context[sourceName]` assignment. The `allRows.push(...)` block above remains unchanged — it uses pre-expansion `mappedRows`, preserving one FilterPanel entry per Notion page.

In `preview.post.ts`: applied to `mappedRows` directly (no hiddenIds in preview).

### Task 2 — Group helper hardening + README documentation

Updated `group` helper in `server/utils/templates.ts` to use `String(row[field] ?? '')` for the map key — explicit coercion guards against edge cases even though expanded rows are already `Record<string, string>`.

Added a new callout block to README.md immediately after the "Rows and node visibility" callout, documenting the multi-value relation auto-expansion behavior. Confirmed no `_all` suffix mention in README.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `expandRelationRows` defined at line 127 in [templateId].get.ts: FOUND
- `expandRelationRows` defined at line 105 in preview.post.ts: FOUND
- `context[sourceName] = expandRelationRows(visibleRows)` in [templateId].get.ts: FOUND
- `context[sourceName] = expandRelationRows(mappedRows)` in preview.post.ts: FOUND
- `allRows.push` still references `mappedRows` (not visibleRows): FOUND
- `String(row[field] ?? '')` in templates.ts group helper: FOUND
- No `_all` in README.md: CONFIRMED
- Commits c7b2769, d78c250: VERIFIED
