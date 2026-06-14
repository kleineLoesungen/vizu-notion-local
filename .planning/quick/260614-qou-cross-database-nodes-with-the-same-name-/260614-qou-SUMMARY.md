---
phase: quick
plan: 260614-qou
subsystem: mermaid-templates
tags: [mermaid, handlebars, node-id, cross-database, collision-fix, refactor]
dependency_graph:
  requires: []
  provides: [source-scoped-node-ids, shared-rewrite-utility]
  affects: [server/utils/templates.ts, server/routes/api/mermaid/preview.post.ts]
tech_stack:
  added: []
  patterns: [scope-hashing-with-null-byte-separator, block-aware-template-rewriter, eachDepth-stack]
key_files:
  modified:
    - server/utils/templates.ts
    - server/routes/api/mermaid/preview.post.ts
decisions:
  - "Null byte separator (\\x00) in stableId scope+value input prevents 'ab'+'c' colliding with 'a'+'bc'"
  - "Block-aware eachDepth stack in rewriteTemplateBody handles nested {{#each}} by restoring previous source on close"
  - "source= hash arg injected at rewrite time, not render time — keeps nodeId helper stateless per call"
metrics:
  duration: ~15 minutes
  completed: "2026-06-14T17:17:21Z"
  tasks_completed: 2
  files_modified: 2
---

# Phase quick Plan 260614-qou: Cross-database Node ID Collision Fix Summary

**One-liner:** FNV-1a stableId scoped by source name via null-byte separator, with block-aware rewriter injecting `source=` into all `{{nodeId}}` calls inside `{{#each SourceName}}` blocks.

## What Was Built

Two Notion sources with identically-named nodes (e.g. "Project Alpha" appearing in both a Projects database and a Tasks database) previously hashed to the same Mermaid node ID, causing edges from both databases to collapse onto one rendered node.

The fix introduces two interlocking changes:

1. **`stableId(value, scope?)`** — optional second argument. When non-empty, hashes `scope\x00value` instead of bare `value`. The null byte prevents prefix collisions. Default is `''` (no scope) so single-source templates are completely unaffected.

2. **`rewriteTemplateBody(body, styles)` — exported, block-aware rewriter.** Replaces the former inline `.split('\n').map(...)` approach in both `loadTemplates` and `preview.post.ts`. A `currentSource` variable and `eachDepth` stack track which `{{#each SourceName}}` block each line falls inside. For lines inside a block, `source="SourceName"` is injected into every `{{nodeId}}` call. The `nodeId` Handlebars helper reads `options.hash.source` and passes it to `stableId` as the scope.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Extend stableId and extract shared rewriteTemplateBody | 84f6077 |
| 2 | Update preview.post.ts to use shared rewriteTemplateBody | b109d3d |

## Verification

- `stableId('foo', 'A')` produces a different result than `stableId('foo', 'B')` — confirmed by inspection: `"A\x00foo"` and `"B\x00foo"` differ at byte 0, yielding different FNV-1a hashes.
- `rewriteTemplateBody` is exported from `server/utils/templates.ts`.
- `loadTemplates` calls `rewriteTemplateBody(body, styles)` — no inline rewriter remains.
- `preview.post.ts` imports `rewriteTemplateBody` and calls it on line 143; the inline 18-line rewriter block and local `HB_KEYWORDS` constant are removed.
- TypeScript typecheck confirmed no new errors introduced in the modified files (pre-existing errors in unrelated composables and config were already present before this task).

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `server/utils/templates.ts` — modified, committed at 84f6077
- `server/routes/api/mermaid/preview.post.ts` — modified, committed at b109d3d
- Both commits confirmed present in `git log`
