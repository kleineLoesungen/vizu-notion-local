---
phase: quick
plan: 260614-j0t
subsystem: mermaid-templates
tags: [handlebars, mermaid, palette, styling]
dependency_graph:
  requires: [260614-ikw]
  provides: [palette-helper]
  affects: [server/utils/templates.ts, config/mermaid.example, README.md]
tech_stack:
  added: []
  patterns: [handlebars-helper, tableau-10-palette]
key_files:
  created: []
  modified:
    - server/utils/templates.ts
    - config/mermaid.example
    - README.md
decisions:
  - "No SafeString wrapper on palette return value — hex strings are safe plain text in classDef lines"
  - "classDef example uses {{nodeId 'parent' parent}} explicitly, not bare {{parent}}, to avoid nodeId rewriter turning the value into a full nXXXXXX['label'] definition string"
metrics:
  duration: "5 minutes"
  completed: "2026-06-14"
  tasks_completed: 2
  files_modified: 3
---

# Phase quick Plan 260614-j0t: Attribute-Based Node Styling (palette helper) Summary

**One-liner:** Added `palette` Handlebars helper returning Tableau 10 hex colors by index for auto-coloring Mermaid diagram nodes by attribute value group.

## What Was Built

The `palette` Handlebars helper allows template authors to automatically assign distinct colors to groups of nodes that share the same attribute value — without any per-node hardcoding. The helper accepts an index (typically `@index` from a `{{#each (group ...)}}` block) and returns one of 10 accessible Tableau 10 hex color strings, wrapping around when index >= 10.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Register palette Handlebars helper in templates.ts | 0d65472 | server/utils/templates.ts |
| 2 | Update mermaid.example and README.md with palette pattern | cdd76d0 | config/mermaid.example, README.md |

## Palette Colors (Tableau 10)

| Index | Hex |
|-------|-----|
| 0 | `#4e79a7` |
| 1 | `#f28e2b` |
| 2 | `#e15759` |
| 3 | `#76b7b2` |
| 4 | `#59a14f` |
| 5 | `#edc948` |
| 6 | `#b07aa1` |
| 7 | `#ff9da7` |
| 8 | `#9c755f` |
| 9 | `#bab0ac` |
| 10 | `#4e79a7` (wraps) |

## Key Technical Decision

Inside `classDef` lines, the value is used as a CSS class name suffix — not as a Mermaid node. The template rewriter converts bare `{{parent}}` into `{{nodeId "parent" parent}}` which expands to `nXXXXXX["label"]` — invalid as a class name. The example template therefore uses `{{nodeId "parent" parent}}` explicitly, bypassing the rewriter. This is documented both in the example file comments and in the README.

## Deviations from Plan

None - plan executed exactly as written.

The example file target was `config/mermaid.example.mmd` per the plan, but the actual file on disk is `config/mermaid.example` (no .mmd extension). Updated the existing file rather than creating a new one to avoid orphaning the existing content.

## Known Stubs

None.

## Self-Check: PASSED

- server/utils/templates.ts: FOUND (`registerHelper('palette'` at line 72)
- config/mermaid.example: FOUND (palette appears 2 times)
- README.md: FOUND (palette appears 2 times)
- Commits: 0d65472 and cdd76d0 both confirmed in git log
