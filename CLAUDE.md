<!-- GSD:project-start source:PROJECT.md -->
## Project

**vizu-notion-local**

A locally-hosted Docker webapp that reads Notion databases and renders them as configurable visual diagrams — metro-style maps (Metroviz) for hierarchy and goal/project structures, and process flow diagrams (Vue Flow). Configuration is file-based: an admin edits a JSON/YAML config file to define Notion sources and column mappings, then restarts the container. No authentication or access control — designed for personal or small-team local use only.

**Core Value:** Any Notion database structure can be visualized as a meaningful diagram without touching the application code — purely through configuration.

### Constraints

- **Tech Stack**: Nuxt + Vue 3 + TailwindCSS — chosen by user, not negotiable
- **Deployment**: Docker container only — must work with `docker-compose up`
- **Data Access**: Read-only via Notion Integration API — no write operations
- **Auth**: None — local network trust model
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

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
### Notion Integration
| Package | Purpose | Confidence |
|---------|---------|------------|
| @notionhq/client | Official Notion API SDK | HIGH |
| Nuxt server routes | API proxy to keep token server-side | HIGH |
- Notion API rate limit: 3 requests/second average
- Page size max: 100 items per query (pagination required for large databases)
- Relations require separate API calls to resolve (N+1 risk)
### Caching Layer
| Approach | Choice | Rationale |
|----------|--------|-----------|
| L1 (memory) | node-lru-cache | Fast warm access, configurable max size |
| L2 (persistent) | better-sqlite3 | Zero-dependency SQLite; survives container restart; offline tolerance |
| Rate limiter | p-throttle or bottleneck | Queue-based throttling to stay under 3 req/s |
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
# Recommended: multi-stage build
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
## Dependency Summary
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
