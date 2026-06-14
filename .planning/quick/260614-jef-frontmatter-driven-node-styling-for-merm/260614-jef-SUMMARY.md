---
phase: quick
plan: 260614-jef
subsystem: mermaid-template-engine
tags: [mermaid, templates, styling, handlebars, frontmatter]
dependency_graph:
  requires: []
  provides:
    - frontmatter-driven node shape + color styling for Mermaid templates
  affects:
    - server/utils/templates.ts
    - server/routes/api/mermaid/[templateId].get.ts
    - server/routes/api/mermaid/preview.post.ts
tech_stack:
  added: []
  patterns:
    - line-aware template rewriter (skip classDef/subgraph lines)
    - Handlebars hash argument injection for shape and className
    - classDef block prepend after template compilation
key_files:
  created: []
  modified:
    - server/utils/templates.ts
    - server/routes/api/mermaid/[templateId].get.ts
    - server/routes/api/mermaid/preview.post.ts
decisions:
  - "StylesMap extracted from frontmatter at loadTemplates() time, stored on MermaidTemplate — avoids re-parsing per request"
  - "SHAPE_BRACKETS map duplicated in preview.post.ts rather than imported from templates.ts — preview has no import path to SHAPE_BRACKETS (not exported) and avoids circular dependency risk"
  - "classDef lines prepended (not appended) to diagram string — Mermaid requires classDef before node references in some renderers"
  - "Shape-only entries (no fill/stroke) apply bracket syntax but emit no classDef and no ::: suffix — consistent with must_haves truth #4"
metrics:
  duration: ~8 minutes
  completed: "2026-06-14T12:04:16Z"
  tasks_completed: 3
  files_modified: 3
---

# Phase quick Plan 260614-jef: Frontmatter-Driven Node Styling for Mermaid Templates Summary

**One-liner:** Frontmatter `styles` map auto-injects Mermaid shape bracket syntax and classDef color definitions — zero template body changes required.

## What Was Built

Admins can now declare a `styles` map in any `.mmd` template's YAML frontmatter. The engine automatically:

1. **Applies bracket syntax** — `rounded` → `("label")`, `diamond` → `{"label"}`, etc. — via the extended `nodeId` Handlebars helper
2. **Appends `:::style-fieldName`** suffix when the entry has color properties (triggers Mermaid class application)
3. **Prepends `classDef style-fieldName fill:...,stroke:...`** lines before the diagram body at render time

Both the precompiled template route (`/api/mermaid/[templateId]`) and the live preview endpoint (`/api/mermaid/preview`) apply the same logic.

### Example

Frontmatter:
```yaml
styles:
  parent:
    shape: rounded
    fill: "#4e79a7"
    stroke: "#2d5a8e"
  title:
    shape: rectangle
```

Output:
```
classDef style-parent fill:#4e79a7,stroke:#2d5a8e
flowchart TD
  n1a2b3c("Parent Label"):::style-parent --> n4d5e6f["Title Label"]
```

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Extend nodeId helper and rewriter in templates.ts | e04d814 |
| 2 | Inject classDef lines at render time in [templateId].get.ts | 1487386 |
| 3 | Replicate styles-aware rewriter and classDef injection in preview.post.ts | 1f7961e |

## Deviations from Plan

None — plan executed exactly as written. Pre-existing TypeScript errors in `useFlowData.ts` and `useMetrovizData.ts` were not introduced by these changes and are out of scope.

## Known Stubs

None.

## Self-Check: PASSED

- server/utils/templates.ts — modified, exists
- server/routes/api/mermaid/[templateId].get.ts — modified, exists
- server/routes/api/mermaid/preview.post.ts — modified, exists
- Commit e04d814 — verified present
- Commit 1487386 — verified present
- Commit 1f7961e — verified present
