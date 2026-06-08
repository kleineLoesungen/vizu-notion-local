---
phase: quick
plan: 260608-ueq
subsystem: documentation
tags: [handlebars, mermaid, templates, docs, bugfix]
dependency_graph:
  requires: []
  provides: [accurate-handlebars-reference]
  affects: [README.md, config/mermaid.example]
tech_stack:
  added: []
  patterns: []
key_files:
  modified:
    - README.md
    - config/mermaid.example
  created: []
decisions:
  - "Document only standard Handlebars 4.x built-ins; templates.ts registers no custom helpers"
  - "Use this.id (Notion page ID) as stable node handle in example — avoids arithmetic entirely"
metrics:
  duration: "~5 minutes"
  completed: "2026-06-08T19:57:51Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Quick Task 260608-ueq: Document Handlebars template helpers in README + fix example

**One-liner:** Expanded README Handlebars bindings table to all 7 stock helpers (`#unless`, `@first`, `this.id`) and replaced broken `{{math}}` helper call in `config/mermaid.example` with working `{{#unless @first}}` + `{{this.id}}` pattern.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Expand README.md Handlebars bindings table | 6dbd328 | README.md |
| 2 | Fix mermaid.example — replace broken math helper | fbb7d3d | config/mermaid.example |

---

## What Was Done

### Task 1 — README.md

Found the 4-row Handlebars bindings table under "Mermaid Diagram Templates". Expanded it to 7 rows:

- Added `{{this.id}}` — Notion page ID always available in `#each` without a `columnMappings` entry
- Added `{{@first}}` — boolean true on first iteration, used with `#unless` for separator suppression
- Added `{{#unless condition}}` — renders block when condition is falsy

Added a blockquote note explaining that no arithmetic helpers (`math`, `add`, etc.) are registered, and directing admins to use Notion formula columns for computed values.

### Task 2 — config/mermaid.example

Removed the broken `{{math @index '-' 1}}` call (Handlebars silently returns empty string for unknown helpers — would produce malformed Mermaid syntax). Replaced the "link all rows in sequence" example with:

- `node_{{this.id}}` for stable node handles (Notion page ID, no arithmetic needed)
- `{{#unless @first}}Start --> node_{{this.id}}[...]{{/unless}}` for the linear chain pattern
- Updated comment block to mention `{{this.id}}` availability

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] File has no .mmd extension**

- **Found during:** Task 2
- **Issue:** Plan referenced `config/mermaid.example.mmd` but the actual file on disk is `config/mermaid.example` (no extension — it cannot be loaded by the template loader which filters for `.endsWith('.mmd')`)
- **Fix:** Edited the correct file `config/mermaid.example` as found; did not rename (the example file is documentation only, not loaded by the template engine — it must be copied and renamed to `.mmd` by the admin anyway per the header comment)
- **Files modified:** config/mermaid.example
- **Commit:** fbb7d3d

---

## Known Stubs

None — this is a documentation-only change. No data flow or rendering stubs introduced.

---

## Self-Check: PASSED

- README.md modified: found at /Users/sebastianwiller/Documents/github/vizu-notion-local/README.md
- config/mermaid.example modified: found at /Users/sebastianwiller/Documents/github/vizu-notion-local/config/mermaid.example
- Task 1 commit 6dbd328: verified in git log
- Task 2 commit fbb7d3d: verified in git log
- `#unless`, `@first`, `this.id` present in README.md: confirmed
- `math` helper absent from config/mermaid.example: confirmed
- `math` not documented as a helper in README.md: confirmed (only appears in "arithmetic" note)
