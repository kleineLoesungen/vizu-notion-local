---
phase: quick-260608-vlm
plan: 01
subsystem: frontend
tags: [dashboard, mermaid, deep-link, url-params]
dependency_graph:
  requires: [05-03]
  provides: [template-deep-links]
  affects: [pages/index.vue, pages/visualizations/[sourceId].vue]
tech_stack:
  added: []
  patterns: [watch-immediate-for-async-data, useFetch-dashboard-metadata]
key_files:
  created: []
  modified:
    - pages/index.vue
    - pages/visualizations/[sourceId].vue
decisions:
  - "watch(mermaidTemplates, { immediate: true }) used to handle async data load before template activation"
  - "templateCards filters out templates with no matching source (sourceId !== null) — prevents broken navigation"
  - "?template= query param processed after fetchSharedState() in onMounted — shared links remain fully compatible"
metrics:
  duration: "83 seconds"
  completed: "2026-06-08"
  tasks_completed: 2
  files_changed: 2
---

# Quick 260608-vlm Plan 01: List Mermaid Diagram Templates on Dashboard Summary

Dashboard now shows a "Diagram Templates" section listing all configured Mermaid templates with direct deep-link navigation to the viz page with the template pre-activated via `?template=` URL parameter.

## What Was Built

**Task 1 — `pages/visualizations/[sourceId].vue` (commit `1a4baa2`)**

Added `?template=` URL query param handling in the existing `onMounted` block, after the shared state restore logic. Used `watch(mermaidTemplates, { immediate: true })` to defer activation until template metadata is available from the async fetch, then calls `selectMermaidTemplate()` once a match is found and self-destructs the watcher. This is the same pattern already used in the file for deferred page-dependent state restoration.

**Task 2 — `pages/index.vue` (commit `08f6da0`)**

Added three script additions: `useFetch('/api/mermaid/templates')` (lightweight, no Notion calls), `templateCards` computed (resolves template `sources: string[]` to a real `sourceId` via name matching against the sources list, filters out unresolvable templates), and `navigateToTemplate()` helper. Added a "Diagram Templates" grid section to the template, hidden via `v-if="templateCards.length > 0"` when no templates are configured. Cards use the same visual language (border, rounded-lg, hover states) as the existing dashboard.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files modified exist and commits verified:
- `pages/index.vue` — confirmed modified
- `pages/visualizations/[sourceId].vue` — confirmed modified
- Commit `1a4baa2` — exists
- Commit `08f6da0` — exists
- `npx nuxt build` — passed with no TypeScript errors
