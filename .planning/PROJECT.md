# vizu-notion-local

## What This Is

A locally-hosted Docker webapp that reads Notion databases and renders them as configurable visual diagrams — metro-style maps (Metroviz) for hierarchy, process flow diagrams (Vue Flow), and custom Mermaid diagram templates for any diagram type. Configuration is file-based: an admin edits a JSON config file and `.mmd` template files to define Notion sources, column mappings, and diagram templates, then restarts the container. No authentication or access control — designed for personal or small-team local use only.

## Core Value

Any Notion database structure can be visualized as a meaningful diagram without touching the application code — purely through configuration.

## Requirements

### Validated (v1.0)

- ✓ Notion API integration with local caching layer (respect rate limits, survive offline periods) — *Phase 01*
- ✓ Config file defines Notion integration token, database IDs, and column-to-visualization mappings — *Phase 01*
- ✓ Docker container deployment (single `docker-compose up`, no external dependencies) — *Phase 01*
- ✓ Metroviz-style metro map visualization for hierarchical/relational data — *Phase 02*
- ✓ Vue Flow-based process flow visualization for workflow/process data — *Phase 03*
- ✓ Cross-database views: single visualization drawing from multiple Notion databases — *Phase 02*
- ✓ Read-only user interface with filtering and node-click navigation — *Phase 03*
- ✓ Docker deployment packaging — README, Makefile, .dockerignore — *Phase 04*
- ✓ Product page (docs/index.html) for Docker Hub listing — *Phase 04*

### Validated (v1.1)

- ✓ Admin-defined Mermaid diagram templates bound to live Notion data — *Phase 05*
- ✓ Server-side stable node ID generation (template authors never manage IDs) — *Phase 06*
- ✓ D3 zoom/pan on Mermaid diagrams, consistent with Metro and Flow — *Phase 06*
- ✓ Related-nodes filter (1-hop) and "Has relation" filter across all viz types — *Phase 06*
- ✓ Browser-based MMD editor with live server-side data resolution — *quick tasks*

### Active

(None — planning next milestone)

### Out of Scope

- Authentication / access control — local Docker, trust the network
- Write-back to Notion — read-only visualization only
- Admin UI for configuration — config file + container restart is sufficient
- Mobile optimization — desktop browser target
- Metrics chart types — deferred, not decided
- Hot-reload of templates without restart — config-file model is sufficient
- Shape modifiers in template bindings (`{{title:round}}`) — always-rectangle for now
- Multi-hop related-nodes traversal (depth > 1) — 1 hop is sufficient
- Mermaid viz type in share links — ViewState.vizType not extended; falls back to metro on share

## Context

- Tech stack: Nuxt (Vue 3) + TailwindCSS — user-specified, not negotiable
- Visualization libraries: Metroviz (metro), Vue Flow (process flow), Mermaid.js (custom templates)
- Config format: JSON (`sources.json`) + `.mmd` files for Mermaid templates (YAML frontmatter + Handlebars body)
- Notion data shapes: nested hierarchy, linked flat databases, single databases — all supported
- Admin has Docker runtime access — config file approach is preferred over an admin UI
- Local network deployment only — no public exposure
- Codebase: ~5,000 lines TypeScript/Vue as of v1.1

## Constraints

- **Tech Stack**: Nuxt + Vue 3 + TailwindCSS — chosen by user, not negotiable
- **Deployment**: Docker container only — must work with `docker-compose up`
- **Data Access**: Read-only via Notion Integration API — no write operations
- **Auth**: None — local network trust model

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Config file over admin UI | Admin has Docker runtime access; file + restart is simpler to build and maintain | ✓ Good — Phase 01 |
| Notion API + local cache | Rate limits and offline tolerance both require caching layer | ✓ Good — Phase 01 |
| Metroviz for hierarchy | User explicitly requested this library for goals/missions/projects/architecture | ✓ Good — Phase 02 |
| Vue Flow for process flows | User requested Vue Flow or simpler alternative | ✓ Good — Phase 03 |
| `{{attribute}}` always outputs full `id["value"]` (no ID-only syntax) | Keeps templates simple; template authors never manage node IDs | ✓ Good — Phase 06 |
| Hash input is value-only (not attr+value) | Same text always collapses to same Mermaid node across fields | ✓ Good — Phase 06 |
| POST `/api/mermaid/preview` runs full pipeline server-side | Editor output is byte-for-byte identical to app rendering | ✓ Good — quick tasks |
| Mermaid viz type not persisted in share links | ViewState.vizType typed for metro/flow only; scope kept narrow | ⚠️ Revisit — tech debt |

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
*Last updated: 2026-06-13 after v1.1 milestone complete*
