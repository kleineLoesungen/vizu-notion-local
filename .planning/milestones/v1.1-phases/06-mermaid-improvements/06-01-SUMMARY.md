---
phase: 06-mermaid-improvements
plan: "01"
subsystem: server-utils
tags: [mermaid, handlebars, node-id, fnv-hash, templates]
dependency_graph:
  requires: [server/utils/templates.ts]
  provides: [stableId, nodeId-helper, body-rewrite]
  affects: [server/utils/templates.ts]
tech_stack:
  added: []
  patterns: [FNV-1a hash, Handlebars helper registration, template body rewrite]
key_files:
  created: []
  modified:
    - server/utils/templates.ts
decisions:
  - "stableId uses null byte separator (attrName + '\\x00' + value) to prevent hash collisions between adjacent string concatenations"
  - "HB_KEYWORDS blocklist (else, this, log) prevents rewriting Handlebars built-in keywords that match the simple-variable pattern"
  - "body stored as original pre-rewrite for debugging; only rewrittenBody passed to Handlebars.compile()"
  - "nodeId helper uses SafeString to prevent Handlebars HTML-escaping of square brackets in Mermaid node syntax"
metrics:
  duration_minutes: 5
  completed_date: "2026-06-12"
  tasks_completed: 1
  tasks_total: 1
  files_created: 0
  files_modified: 1
---

# Phase 06 Plan 01: Node ID Auto-Generation Summary

FNV-1a stableId() + Handlebars nodeId helper + template body rewrite that converts `{{attr}}` → `nXXXXXX["value"]` Mermaid node definitions automatically before compile.

## What Was Built

Added three components to `server/utils/templates.ts`:

1. **`stableId(attrName, value)`** — FNV-1a 32-bit hash function producing `n` + 6 base-36 chars (always 7 chars, always starts with `n` for valid Mermaid IDs). Uses null-byte separator between attribute name and value to prevent hash collisions from adjacent string concatenation.

2. **`nodeId` Handlebars helper** — Registered at module scope. Called as `{{nodeId "attrName" attrValue}}`. Returns a `Handlebars.SafeString` of form `nXXXXXX["label"]` — a full Mermaid rectangle node definition. SafeString prevents HTML-escaping of the square brackets.

3. **Template body rewrite** — Inserted before `Handlebars.compile()` inside the existing try/catch. Rewrites `{{word}}` simple variable references to `{{nodeId "word" word}}` using a regex. An `HB_KEYWORDS` Set (`else`, `this`, `log`) prevents rewriting Handlebars built-in tokens that match the pattern.

## Key Implementation Details

- `MermaidTemplate.body` still stores the original pre-rewrite body string — preserved as a debugging reference
- The rewrite only targets simple variable bindings (`{{word}}`) — block helpers (`{{#each}}`), hash arguments, and partials are untouched
- Two pages with identical attribute+value pairs produce the same node ID across separate `#each` blocks or across different sources — enabling Mermaid deduplication

## Acceptance Criteria — All Pass

| Check | Expected | Result |
|-------|----------|--------|
| `grep -c "registerHelper.*nodeId"` | 1 | 1 |
| `grep -c "rewrittenBody"` | ≥2 | 2 |
| `grep -c "HB_KEYWORDS"` | ≥2 | 2 |
| `grep -c "Handlebars.compile(body)"` | 0 | 0 |
| `grep -c "Handlebars.compile(rewrittenBody)"` | 1 | 1 |
| `stableId('title', 'X').startsWith('n')` | true | true |
| `stableId('title', 'X').length === 7` | true | true |
| `stableId('title', 'X') === stableId('title', 'X')` | true | true |
| `stableId('title', 'X') !== stableId('status', 'X')` | true | true |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | d1013c5 | feat(06-01): add stableId(), nodeId helper, and body rewrite to templates.ts |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `/Users/sebastianwiller/Documents/github/vizu-notion-local/server/utils/templates.ts` — FOUND, modified
- Commit `d1013c5` — FOUND
