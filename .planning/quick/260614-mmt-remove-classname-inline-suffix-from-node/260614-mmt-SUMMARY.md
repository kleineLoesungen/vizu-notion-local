---
phase: quick-260614-mmt
plan: 01
subsystem: server/utils
tags: [mermaid, handlebars, node-styling, bug-fix]
dependency_graph:
  requires: []
  provides: [nodeId helper without :::className inline suffix]
  affects: [server/api/mermaid routes, any route emitting post-render class blocks]
tech_stack:
  added: []
  patterns: [accumulator-driven post-render class assignment]
key_files:
  modified:
    - server/utils/templates.ts
decisions:
  - "Remove :::className from SafeString return; rely solely on _classAccum for class assignment — correct per Mermaid spec"
metrics:
  duration: "< 5 minutes"
  completed: "2026-06-14"
  tasks_completed: 1
  files_modified: 1
---

# Phase quick-260614-mmt Plan 01: Remove :::className inline suffix from nodeId helper

**One-liner:** Removed invalid `:::className` inline suffix from Mermaid `nodeId` helper return — node styling now driven exclusively by post-render `class nodeId cls_X` blocks.

## What Was Done

Single-line fix in `server/utils/templates.ts` inside the `nodeId` Handlebars helper's `if (className)` branch:

- **Before:** `return new Handlebars.SafeString(\`${id}${open}${safeLabel}${close}:::${className}\`)`
- **After:** `return new Handlebars.SafeString(\`${id}${open}${safeLabel}${close}\`)`

The `_classAccum.set(id, className)` call on the preceding line is unchanged. It populates the accumulator that route files read after template execution to emit `class nodeId cls_X` statements — the only Mermaid-spec-valid mechanism for class assignment.

Also updated the helper comment to remove the phrase "appends :::className suffix" and replace it with the correct description of the className-present behavior.

## Why

Mermaid's lexer only permits `:::className` on standalone node definition lines. When a styled node appears as an edge target (e.g., `nXXX --> nYYY:::cls_parent`), the lexer fails with a syntax error. The inline suffix was redundant: the `_classAccum` accumulator already drives the correct post-render mechanism in route files.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1    | 3eb8042 | fix(quick-260614-mmt): remove :::className inline suffix from nodeId helper return |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `server/utils/templates.ts` modified: confirmed (1 file changed in commit 3eb8042)
- `grep ':::${className}'` returns no matches in the helper return: confirmed (exit:1)
- `_classAccum.set(id, className)` present on line 82: confirmed
- Commit 3eb8042 exists: confirmed
