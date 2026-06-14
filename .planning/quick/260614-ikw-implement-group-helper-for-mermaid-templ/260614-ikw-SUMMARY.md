---
phase: quick
plan: 260614-ikw
subsystem: server/utils/templates.ts
tags: [handlebars, mermaid, templates, grouping]
tech-stack:
  added: []
  patterns:
    - Handlebars subexpression helper called via (group array "field") syntax
    - Handlebars block helper iterating this.items inside group context
key-files:
  modified:
    - server/utils/templates.ts
    - config/mermaid.example
    - README.md
decisions:
  - group key exposed as named property (not generic "key") so existing nodeId rewriter rewrites it identically to bare field refs
  - group-item uses SafeString + Array.map join to concatenate block outputs without double-escaping
metrics:
  duration: "~8 minutes"
  completed: "2026-06-14"
  tasks_completed: 2
  files_modified: 3
---

# Quick Task 260614-ikw: Implement group() and group-item Handlebars helpers for Mermaid templates

**One-liner:** group() subexpression helper + group-item block helper registered in Handlebars, enabling `{{#each (group SourceName "field")}}…{{#group-item}}…{{/group-item}}{{/each}}` grouping syntax in all Mermaid templates.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Register group() and group-item helpers in templates.ts | 034cf9e | server/utils/templates.ts |
| 2 | Add example usage to mermaid.example and update README | fa58e17 | config/mermaid.example, README.md |

## What Was Built

### Helper 1: `group` (value helper / subexpression)

Registered at module scope in `server/utils/templates.ts` (line 39). Called as `(group arrayOfRows "fieldName")` inside `{{#each}}`.

- Takes an array of row objects and a field name string
- Returns `[{ [fieldName]: key, items: rows[] }]` — one entry per distinct value of `fieldName`
- Group key exposed as `[fieldName]` (not generic `"key"`) so the existing rewriter rewrites it to `{{nodeId "fieldName" fieldName}}` automatically — consistent with all other bare field references
- Empty/undefined field values grouped under the empty string key

### Helper 2: `group-item` (block helper)

Registered immediately after `group` in `server/utils/templates.ts` (line 57). Called as `{{#group-item}}…{{/group-item}}` inside the `{{#each (group …)}}` block.

- `this` in the outer `#each` context is `{ [field]: key, items: rows[] }` — `group-item` reads `this.items`
- Iterates each row in `items`, renders the block body once per row with the row as context
- Inner context is the individual row object, so `{{fieldName}}`, `{{this.id}}` etc. all work normally
- Returns `new Handlebars.SafeString(...)` — prevents double HTML-escaping of nodeId output

### Template rewriter (no changes needed)

The existing regex `/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g` already correctly:
- Skips `{{#each (group …)}}` — block expression, not matched
- Skips `{{#group-item}}` / `{{/group-item}}` — block helper tags, not matched
- Rewrites `{{product}}` inside outer `#each` — CORRECT, becomes `{{nodeId "product" product}}`
- Rewrites `{{title}}` inside `{{#group-item}}` — CORRECT, becomes `{{nodeId "title" title}}`

### Availability

Both helpers are registered at module import time. `preview.post.ts` already imports `getTemplates` from `templates.ts` (line 10), so helpers are available in both the file-based template path and the live editor preview path.

## Usage Pattern

```
{{#each (group Projekte "product")}}
subgraph {{product}}
  {{#group-item}}
  {{title}}
  {{/group-item}}
end
{{/each}}
```

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `server/utils/templates.ts` modified: FOUND
- `config/mermaid.example` modified: FOUND
- `README.md` modified: FOUND
- Commit 034cf9e: FOUND
- Commit fa58e17: FOUND
- `grep -n "registerHelper('group" server/utils/templates.ts` confirms both helpers at lines 39 and 57
