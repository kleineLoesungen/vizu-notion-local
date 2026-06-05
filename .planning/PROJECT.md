# vizu-notion-local

## What This Is

A locally-hosted Docker webapp that reads Notion databases and renders them as configurable visual diagrams — metro-style maps (Metroviz) for hierarchy and goal/project structures, and process flow diagrams (Vue Flow). Configuration is file-based: an admin edits a JSON/YAML config file to define Notion sources and column mappings, then restarts the container. No authentication or access control — designed for personal or small-team local use only.

## Core Value

Any Notion database structure can be visualized as a meaningful diagram without touching the application code — purely through configuration.

## Requirements

### Validated

- [x] Notion API integration with local caching layer (respect rate limits, survive offline periods) — *Validated in Phase 01: backend-foundation*
- [x] Config file defines Notion integration token, database IDs, and column-to-visualization mappings — *Validated in Phase 01: backend-foundation*
- [x] Docker container deployment (single `docker-compose up`, no external dependencies) — *Validated in Phase 01: backend-foundation*

### Validated

- [x] Metroviz-style metro map visualization for hierarchical/relational data — *Validated in Phase 02: metro-visualization*
- [x] Vue Flow-based process flow visualization for workflow/process data — *Validated in Phase 03: flow-visualization*
- [x] Cross-database views: single visualization drawing from multiple Notion databases — *Validated in Phase 02*
- [x] Read-only user interface with filtering and node-click navigation — *Validated in Phase 03*
- [x] Docker deployment packaging — README, Makefile, .dockerignore — *Validated in Phase 04: deployment*
- [x] Product page (docs/index.html) for Docker Hub listing — *Validated in Phase 04: deployment*

### Out of Scope

- Authentication / access control — local Docker, trust the network
- Write-back to Notion — read-only visualization only
- Admin UI for configuration — config file + container restart is sufficient
- Mobile optimization — desktop browser target
- Metrics chart types — deferred, not decided

## Context

- Tech stack decided by user: Nuxt (Vue 3) + TailwindCSS
- Visualization libraries: Metroviz (metro map style) and Vue Flow (or simpler alternative for process flows)
- Notion data shapes vary: nested hierarchy, linked flat databases, and single databases all in scope
- Admin has Docker runtime access — config file approach is preferred over an admin UI
- Local network deployment only — no public exposure

## Constraints

- **Tech Stack**: Nuxt + Vue 3 + TailwindCSS — chosen by user, not negotiable
- **Deployment**: Docker container only — must work with `docker-compose up`
- **Data Access**: Read-only via Notion Integration API — no write operations
- **Auth**: None — local network trust model

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Config file over admin UI | Admin has Docker runtime access; file + restart is simpler to build and maintain | Confirmed — Phase 01 |
| Notion API + local cache | Rate limits and offline tolerance both require caching layer | Confirmed — Phase 01 |
| Metroviz for hierarchy | User explicitly requested this library for goals/missions/projects/architecture | Confirmed — Phase 02 |
| Vue Flow for process flows | User requested Vue Flow or simpler alternative | Confirmed — Phase 03 |

## Current State

**v1.0 complete as of Phase 04 (2026-06-06).** All 4 phases shipped: backend foundation → metro visualization → flow visualization → deployment. App is Docker-ready, documented, and has a product page at `docs/index.html`.

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-02 — Phase 01 complete (backend foundation)*
