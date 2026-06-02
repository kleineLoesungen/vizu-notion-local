# STATE: vizu-notion-local

**Project Reference**: vizu-notion-local
**Core Value**: Any Notion database structure can be visualized as a meaningful diagram without touching application code — purely through configuration
**Current Focus**: Building Phase 1 foundation

---

## Current Position

**Milestone**: v1 Roadmap
**Phase**: 1 (Backend Foundation)
**Plan**: TBD — awaiting `/gsd:plan-phase 1`
**Status**: Not started
**Progress**: 0% ▱▱▱▱▱▱▱▱▱▱

---

## Project Metrics

**Total v1 Requirements**: 23
**Phases**: 3 (coarse granularity)
**Tech Stack**: Nuxt + Vue 3 + TailwindCSS
**Deployment**: Docker Compose

---

## Accumulated Context

### Key Decisions (from PROJECT.md)

| Decision | Rationale | Status |
|----------|-----------|--------|
| Config file over admin UI | Admin has Docker runtime access; file + restart is simpler | Pending implementation |
| Notion API + local cache | Rate limits and offline tolerance both require caching | Pending implementation |
| Metroviz for hierarchy | User explicitly requested this library | Pending implementation |
| Vue Flow for process flows | User requested Vue Flow or simpler alternative | Pending implementation |

### Architecture Notes

- **Backend**: Server-side Notion API integration (token never exposed to client)
- **Rate Limiting**: Max 3 requests/second to Notion API
- **Caching**: In-memory cache with 1-hour TTL (v2 will add SQLite persistent layer)
- **Config**: Admin edits YAML/JSON file, mounts via Docker volume
- **Visualization**: Metroviz for hierarchies, Vue Flow for workflows
- **Deployment**: Single `docker-compose up`, no external dependencies

### Out of Scope for v1

- Authentication / access control (local Docker trust model)
- Write-back to Notion (read-only only)
- Admin UI (config file sufficient)
- Multiple Notion workspaces
- Mobile optimization
- Real-time auto-refresh
- Custom visualization plugins

---

## Session Continuity

**Last Activity**: Roadmap created
**Date**: 2026-06-02
**Next Step**: `/gsd:plan-phase 1` to break down Backend Foundation into executable plans

---

## Blockers & Todos

### Todos
- [ ] Plan Phase 1: Backend Foundation
- [ ] Plan Phase 2: Visualization
- [ ] Plan Phase 3: User Experience
- [ ] Begin Phase 1 implementation

### Blockers
(None identified yet)

---

*State initialized: 2026-06-02*
