# Stack Research: vizu-notion-local

**Domain:** Local Notion visualization webapp
**Date:** 2026-06-02
**Confidence:** MEDIUM (synthesis from known project constraints + library docs)

---

## Recommended Stack

### Core Framework

| Layer | Choice | Version | Confidence | Rationale |
|-------|--------|---------|------------|-----------|
| Framework | Nuxt 3 | ^3.13+ | HIGH | SSR + server routes in one repo; server routes are mandatory to keep Notion token server-side |
| UI Framework | Vue 3 | ^3.5+ | HIGH | User-specified; Composition API enables clean composable patterns |
| Styling | TailwindCSS | ^4.x | HIGH | User-specified; utility-first, pairs well with component libraries |
| Runtime | Node.js | 20 LTS | HIGH | LTS stability; required for Nuxt 3 server routes |

### Visualization Libraries

| Library | Purpose | Confidence | Notes |
|---------|---------|------------|-------|
| Metroviz | Metro-map style hierarchy visualization | MEDIUM | github.com/rstockm/Metroviz — user-specified; niche library, may need vanilla JS integration wrapper in Vue |
| Vue Flow | Process flow / flowchart visualization | HIGH | @vue-flow/core ^1.x; native Vue 3 support, strong docs |

**Metroviz integration note:** Metroviz is a vanilla JS library. Integration into Vue requires a wrapper component using `onMounted`/`useTemplateRef` to initialize the library after DOM mount. SVG output means no direct Vue reactivity — data changes trigger re-initialization, not reactive updates.

### Notion Integration

| Package | Purpose | Confidence |
|---------|---------|------------|
| @notionhq/client | Official Notion API SDK | HIGH |
| Nuxt server routes | API proxy to keep token server-side | HIGH |

**Key constraints:**
- Notion API rate limit: 3 requests/second average
- Page size max: 100 items per query (pagination required for large databases)
- Relations require separate API calls to resolve (N+1 risk)

### Caching Layer

| Approach | Choice | Rationale |
|----------|--------|-----------|
| L1 (memory) | node-lru-cache | Fast warm access, configurable max size |
| L2 (persistent) | better-sqlite3 | Zero-dependency SQLite; survives container restart; offline tolerance |
| Rate limiter | p-throttle or bottleneck | Queue-based throttling to stay under 3 req/s |

**TTL recommendations:**
- Memory cache: 1 hour
- SQLite cache: 24 hours
- Config: loaded once at startup, reload on restart

### Config File Parsing

| Format | Choice | Rationale |
|--------|--------|-----------|
| Config format | YAML | More readable than JSON for nested mappings; use `js-yaml` for parsing |
| Alternative | JSON | Simpler, no extra dependency — decide at implementation |
| Location | `/app/config/sources.yaml` (Docker mount) | Admin edits file on host, restarts container |

### Docker Setup

```dockerfile
# Recommended: multi-stage build
FROM node:20-alpine AS builder
FROM node:20-alpine AS runtime
```

| Concern | Approach |
|---------|----------|
| Config mount | Docker volume: `./config:/app/config:ro` |
| File watching | Polling required on macOS (NFS); set `CHOKIDAR_USEPOLLING=true` |
| Port | Default 3000, expose in docker-compose |
| Hot reload in dev | `nuxt dev` with `--host 0.0.0.0` |

### What NOT to Use

| Rejected | Reason |
|----------|--------|
| Prisma / full ORM | Overkill for SQLite cache — better-sqlite3 with raw queries is sufficient |
| Pinia store for Notion data | Server routes handle data; composables are sufficient client-side |
| GraphQL layer | Extra abstraction with no benefit; REST composables are simpler |
| Redis | External service dependency — SQLite is sufficient for local Docker |
| Vitest / Playwright | Not in scope for v1; config-driven apps are hard to test meaningfully without real data |

---

## Dependency Summary

```json
{
  "dependencies": {
    "nuxt": "^3.x",
    "@notionhq/client": "^2.x",
    "@vue-flow/core": "^1.x",
    "better-sqlite3": "^9.x",
    "lru-cache": "^11.x",
    "bottleneck": "^2.x",
    "js-yaml": "^4.x"
  },
  "devDependencies": {
    "@nuxtjs/tailwindcss": "^6.x",
    "typescript": "^5.x"
  }
}
```

Metroviz: install from GitHub or vendor locally (`/vendor/metroviz/`).

---

*Written: 2026-06-02 — based on user-specified stack + known library constraints. Verify exact versions against npm registry before installation.*
