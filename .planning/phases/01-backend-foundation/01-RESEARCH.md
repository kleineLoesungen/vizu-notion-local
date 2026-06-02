# Phase 1: Backend Foundation - Research

**Researched:** 2026-06-02
**Domain:** Notion API integration, data pipeline, config validation, Docker deployment
**Confidence:** HIGH

## Summary

Phase 1 builds the complete end-to-end data pipeline: Notion API integration via server routes, request rate limiting at 3 req/s, in-memory caching with 1-hour TTL, relation property resolution via breadth-first fetching, config file schema validation, and Docker deployment with volume-mounted configuration. This phase is foundational — visualization and UI layers depend on the API routes and data transformations built here.

The technical stack is well-established: @notionhq/client for Notion SDK, Nuxt 3 server routes for API proxying (keeping the token server-side), lru-cache for memory caching, bottleneck for rate limiting, and ajv for schema validation. All decisions lock into the user's chosen stack (Nuxt 3 + Vue 3 + TailwindCSS). The main architectural decision is that cross-database relations are assembled server-side — the client receives pre-merged data, not raw Notion responses.

**Primary recommendation:** Implement the Notion API integration and caching layer first, then add config validation and Docker deployment. Prioritize relation resolution depth limiting (1 level only, as locked) to avoid exponential API call expansion.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** JSON format for config file — not YAML. No extra parsing dependency.
- **D-02:** Config file named `sources.json`, mounted at `/app/config/sources.json` in the container.
- **D-03:** Pure JSON — no comment stripping. Admin documents mappings in a separate README if needed.
- **D-04:** Notion integration token is strictly via env var / `.env` file only — never read from `sources.json`. Keeps secrets separate from config.
- **D-05:** Resolve relations 1 level deep only (direct relation properties in the source database). No recursive following of nested relations.
- **D-06:** Relations pointing to databases not listed in `sources.json` are silently skipped — no warning, no error.
- **D-07:** Cross-database views are assembled server-side in the API route. Server merges data from multiple sources and returns a single unified payload. Client receives one clean response — visualization code does not handle multi-source composition.

### Claude's Discretion

- Startup validation feedback format (container logs vs /health endpoint — Claude picks simplest approach)
- Offline/cold-cache behavior when Notion is unreachable (error response vs partial data — Claude picks sensible default)
- Rate limiter implementation details (p-throttle vs bottleneck vs custom)
- LRU cache size limits
- Breadth-first relation fetching algorithm internals

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | Server routes proxy all Notion API calls (integration token never exposed to client) | Nuxt 3 server routes with useRuntimeConfig() securely stores token server-side |
| DATA-02 | Rate limiting enforces maximum 3 requests/second to Notion API | Bottleneck library with token bucket, respecting Retry-After header |
| DATA-03 | Memory cache stores Notion API responses (1 hour TTL) to reduce redundant calls | lru-cache v11.5.1 with configurable TTL and max size |
| DATA-04 | Cross-database relation properties resolved using breadth-first fetching to prevent N+1 query patterns | Custom breadth-first algorithm with depth limit of 1, queued via rate limiter |
| DATA-05 | App validates config column mappings against actual Notion database schema at container startup, failing fast with a clear error | ajv JSON schema validation at startup; Notion API schema reflection |
| CONF-01 | Admin defines Notion database sources and column-to-role mappings in a JSON config file | sources.json with source array, each with databaseId, name, columnMappings object |
| CONF-02 | Config file is mounted as a read-only Docker volume so admin can update it and restart without rebuilding the image | Docker volume `-v ./config:/app/config:ro` |
| CONF-03 | Config supports all three Notion structure types: nested hierarchy (parent-child relations), linked databases (relation properties), and single database (flat) | Config format supports arbitrary databaseId + columnMappings; type detection happens downstream in viz layer |
| CONF-04 | Visualization type available for a source is determined automatically by the mapped data types | Not in Phase 1 scope — Phase 2 handles viz type detection; Phase 1 returns raw mapped data |
| CONF-05 | Deployment targets a single Notion workspace (one integration token per container) | One NOTION_API_TOKEN env var per docker-compose instance |
| CONF-06 | Notion integration token is supplied via Docker environment variable / env file (not stored in config file) | .env file with NOTION_API_TOKEN, loaded by docker-compose |
| INFRA-01 | App starts with a single `docker-compose up` command | Multi-stage Dockerfile + docker-compose.yml with node:20-alpine |
| INFRA-02 | Config file is mounted via Docker volume (`./config:/app/config:ro`) | docker-compose volume binding with read-only flag |
| INFRA-03 | Notion integration token is passed via `.env` file referenced in docker-compose | docker-compose env_file: .env |

## Standard Stack

### Core Foundation

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Nuxt | 4.4.7 | SSR framework + server routes | User-specified; server routes mandatory for token security |
| @notionhq/client | 5.22.0 | Official Notion API SDK | Only official SDK; stable, well-documented |
| Node.js | 20 LTS | Runtime for server | LTS stability; required for Nuxt 3 server routes |

### Caching & Rate Limiting

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| lru-cache | 11.5.1 | In-memory L1 cache (1h TTL) | Battle-tested, TypeScript-native, used by npm internally; fast warm access |
| bottleneck | 2.19.5+ | Rate limiter (3 req/s) | Token bucket model respects external API limits exactly; handles burst tolerance |

### Config & Validation

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ajv | 8.20.0 | JSON schema validation | Fastest JSON schema validator (Ajv > Zod for startup validation) |

### Docker & Runtime

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Docker | Latest | Container orchestration | User-specified; read-only config volume mount |
| node:20-alpine | 20.x | Base image for production | LTS + minimal footprint (~200MB final image) |

**Installation:**

```bash
npm install \
  nuxt@4.4.7 \
  @notionhq/client@5.22.0 \
  lru-cache@11.5.1 \
  bottleneck@2.19.5 \
  ajv@8.20.0
```

**Version verification:** All versions verified against npm registry as of 2026-06-02. @notionhq/client 5.22.0 supports both 2025-09-03 (default) and 2026-03-11 API versions.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| bottleneck | p-throttle | p-throttle is simpler API but lacks burst tolerance; bottleneck's token bucket matches Notion's "3 req/s average with bursts allowed" exactly |
| bottleneck | p-limit | p-limit is for concurrent promise management, not rate limiting; doesn't respect external service rate limits the same way |
| lru-cache | node-cache | node-cache lacks byte-size limiting and has lower performance; lru-cache is battle-tested at npm scale |
| ajv | zod | zod is orders of magnitude slower for startup validation; ajv compiles schema to JavaScript for near-instant validation |
| better-sqlite3 | node-sqlite3 | Not chosen for Phase 1 (v2 feature), but better-sqlite3 is synchronous and much faster; node-sqlite3 is async with event loop overhead |

## Architecture Patterns

### Recommended Project Structure

```
src/
├── server/
│   ├── routes/
│   │   └── api/
│   │       ├── sources.get.ts          # List configured sources
│   │       └── sources/[id].get.ts     # Fetch source data with relations resolved
│   └── utils/
│       ├── notion.ts                   # @notionhq/client wrapper, rate limiting, caching
│       ├── config.ts                   # Load sources.json, validate schema
│       ├── relations.ts                # Breadth-first relation resolution
│       └── rate-limiter.ts             # Bottleneck instance (singleton)
├── app.vue                             # Root layout (Phase 2/3 will add UI)
└── nuxt.config.ts
```

### Pattern 1: Server Route with Rate-Limited Notion API

**What:** Nuxt 3 server route that proxies Notion API calls through a rate-limited, cached wrapper.

**When to use:** Every server route that needs Notion data (all routes in this phase).

**Example:**

```typescript
// server/routes/api/sources/[id].get.ts
// Source: @notionhq/client official patterns + Nuxt 3 server route docs

import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const { id } = event.context.params
  
  // Notion API token is in useRuntimeConfig().notionApiToken
  // Never expose to client
  const sourceData = await fetchSourceWithRelations(id)
  
  return sourceData
})
```

The key: `useRuntimeConfig()` reads from `NUXT_NOTION_API_TOKEN` env var (set in .env). Server routes always have access; client code does not.

### Pattern 2: Rate Limiter Singleton

**What:** A single Bottleneck instance shared across all server routes to enforce 3 req/s to Notion API.

**When to use:** Wrap all @notionhq/client calls (database queries, page fetches, property lookups).

**Example:**

```typescript
// server/utils/rate-limiter.ts
// Source: Bottleneck documentation + Notion API rate limit spec (3 req/s average)

import Bottleneck from 'bottleneck'

const limiter = new Bottleneck({
  minTime: 333,  // ms between requests: 1000ms / 3 req/s = ~333ms
  maxConcurrent: 1,  // Serial execution respects burst tolerance
  reservoir: 3,  // Burst capacity: allow 3 concurrent
  reservoirRefreshAmount: 3,
  reservoirRefreshInterval: 1000  // Refill every 1 second
})

export const withRateLimit = <T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>
): ((...args: Args) => Promise<T>) => {
  return (...args: Args) => limiter.schedule(() => fn(...args))
}
```

**Retry logic:** Bottleneck catches 429 responses. If encountered, extract Retry-After header and respect it:

```typescript
client.request({...}).catch((error) => {
  if (error.status === 429) {
    const retryAfter = parseInt(error.headers['retry-after'] || '1')
    // Back off and retry after retryAfter seconds
  }
})
```

### Pattern 3: LRU Cache for Notion Responses

**What:** In-memory cache that stores Notion API responses with 1-hour TTL.

**When to use:** Wrap rate-limited Notion calls to avoid redundant requests.

**Example:**

```typescript
// server/utils/notion.ts
// Source: lru-cache documentation

import { LRUCache } from 'lru-cache'

const cache = new LRUCache<string, any>({
  max: 500,  // Cache max 500 items
  ttl: 1000 * 60 * 60,  // 1 hour
  allowStale: false  // Don't serve stale data
})

export const getCachedDatabase = async (databaseId: string) => {
  const cacheKey = `db:${databaseId}`
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)
  }
  
  const data = await withRateLimit(() =>
    client.databases.query({ database_id: databaseId })
  )()
  
  cache.set(cacheKey, data)
  return data
}
```

### Pattern 4: Breadth-First Relation Resolution (1 Level Deep)

**What:** When a source database has relation properties, fetch the related pages without recursing into their relations.

**When to use:** After fetching the primary database, if any column is a relation property.

**Example:**

```typescript
// server/utils/relations.ts
// Custom algorithm: breadth-first, depth=1 only

export async function resolveRelations(
  database: NotionDatabase,
  relationColumnIds: string[],
  configuredSources: ConfigSource[]
): Promise<EnrichedDatabase> {
  const depth0Results = database.results // Primary fetch already done
  
  // Collect all related database IDs from relation columns (depth 0)
  const relationsToFetch = new Map<string, string[]>()
  
  depth0Results.forEach(page => {
    relationColumnIds.forEach(colId => {
      const relProp = page.properties[colId]
      if (relProp?.type === 'relation' && relProp.relation?.length) {
        const relatedDatabaseId = extractRelatedDatabaseId(relProp)
        if (!relationsToFetch.has(relatedDatabaseId)) {
          relationsToFetch.set(relatedDatabaseId, [])
        }
        relationsToFetch.get(relatedDatabaseId)!.push(...relProp.relation)
      }
    })
  })
  
  // Fetch all depth-1 related pages in parallel, respecting rate limit
  const relatedData = new Map<string, NotionPage[]>()
  for (const [dbId, pageIds] of relationsToFetch) {
    if (!configuredSources.find(s => s.databaseId === dbId)) {
      // Skip databases not in sources.json (D-06 decision)
      continue
    }
    const pages = await Promise.all(
      pageIds.map(pid =>
        withRateLimit(() => client.pages.retrieve({ page_id: pid }))()
      )
    )
    relatedData.set(dbId, pages)
  }
  
  // Merge related data back into depth0Results
  return {
    ...database,
    results: depth0Results.map(page => ({
      ...page,
      resolvedRelations: findRelatedPages(page, relatedData)
    }))
  }
}
```

**Key constraint:** STOP at depth 1. Do not fetch relations of relations. This prevents N+1 explosion and respects the locked decision (D-05).

### Pattern 5: Config Validation at Startup

**What:** Load sources.json at container startup, validate schema, fail fast if invalid.

**When to use:** Nuxt app initialization hook.

**Example:**

```typescript
// server/utils/config.ts
// Source: ajv documentation

import Ajv from 'ajv'
import fs from 'fs'
import path from 'path'

const ajv = new Ajv()

const sourcesSchema = {
  type: 'object',
  properties: {
    sources: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          databaseId: { type: 'string' },
          name: { type: 'string' },
          columnMappings: { type: 'object' }
        },
        required: ['databaseId', 'name', 'columnMappings']
      }
    }
  },
  required: ['sources']
}

export async function validateConfig(configPath: string) {
  const validate = ajv.compile(sourcesSchema)
  const configText = fs.readFileSync(configPath, 'utf-8')
  const config = JSON.parse(configText)
  
  if (!validate(config)) {
    throw new Error(
      `Config validation failed:\n${JSON.stringify(validate.errors, null, 2)}`
    )
  }
  
  return config
}

// Call at app startup:
// hooks: {
//   'app:mounted': async () => {
//     await validateConfig('/app/config/sources.json')
//   }
// }
```

### Pattern 6: Notion API Token via Environment Variable

**What:** Store Notion token in useRuntimeConfig(), read from .env or docker-compose.

**When to use:** All server routes that instantiate the Notion client.

**Example:**

```typescript
// nuxt.config.ts

export default defineNuxtConfig({
  runtimeConfig: {
    notionApiToken: process.env.NOTION_API_TOKEN,
    // server-only: not exposed to client
  },
  
  // In any server route:
  // const token = useRuntimeConfig().notionApiToken
})
```

**.env file (in repo root):**

```
NOTION_API_TOKEN=your-integration-token-here
```

**docker-compose.yml:**

```yaml
services:
  app:
    environment:
      NOTION_API_TOKEN: ${NOTION_API_TOKEN}
    env_file: .env
```

### Anti-Patterns to Avoid

- **Exposing Notion token to client:** Do not return the token in API responses. Use server routes exclusively to proxy and transform Notion data.
- **Caching without TTL:** LRU cache must have TTL (1h) to avoid stale Notion data.
- **Recursive relation fetching:** Do not follow relations beyond depth 1. This causes exponential API calls and violates D-05.
- **Ignoring rate limit bursts:** Don't hardcode exactly 3 req/s without burst tolerance. Notion API allows short bursts; use bottleneck's token bucket model.
- **Importing Notion token into frontend bundles:** Never pass process.env.NOTION_API_TOKEN to the client. Nuxt's runtimeConfig is server-only by default — enforce this.
- **Parsing sources.json with regex:** Use JSON.parse() + ajv validation. Regex parsing will miss edge cases and validation fails silently.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting | Custom queue with setTimeout | Bottleneck | Token bucket respects burst tolerance, exponential backoff on 429, built-in concurrency control |
| In-memory cache | Object-based cache with manual cleanup | lru-cache | TTL + LRU eviction are complex to implement correctly; lru-cache is battle-tested and O(1) operations |
| JSON schema validation | Manual object walk + instanceof checks | ajv | Schema validation is deceptively complex (nested objects, type coercion, array bounds); ajv is the industry standard |
| Relation fetching | Naive recursive algorithm | Breadth-first queue (custom, but bounded to depth 1) | Recursion causes exponential API calls; breadth-first with depth limit prevents N+1 problem |
| Notion API wrapper | Raw @notionhq/client calls everywhere | Centralized wrapper in server/utils | Consistency, error handling, caching, and rate limiting must be enforced across all calls |
| Config file watching in Docker | Manual fs.readFile polling | Docker restart + env var reload | macOS NFS doesn't support inotify; polling is inefficient; volume mount + container restart is simpler |

**Key insight:** Caching, rate limiting, and validation are all edge-case-heavy domains. Off-the-shelf libraries encode years of failure scenarios. Building custom solutions introduces subtle bugs (cache stampede, thundering herd, type coercion edge cases).

## Common Pitfalls

### Pitfall 1: N+1 Query Problem in Relation Resolution

**What goes wrong:** If a database has 100 pages with 5 relation properties each, and you recursively fetch related pages, you make 100 × 5 = 500 API calls just for depth 1. If those related pages also have relations, you're at 2,500 calls instantly — triggering rate limit errors.

**Why it happens:** Relation resolution is intuitive to write recursively. It's easy to forget that you're making an API call per relation property per page.

**How to avoid:** Enforce depth limit of 1 in code (D-05, locked decision). Collect all page IDs at depth 0, then batch-fetch depth 1 in parallel. Do not enter a loop that fetches relations of relations.

**Warning signs:** Logs show more API calls than expected; rate limit 429 errors appear; container startup time is very slow.

### Pitfall 2: Token Exposed to Client

**What goes wrong:** Notion token is accidentally included in the final Vue component bundle or sent as a response header. Bad actors can steal the token and make unauthorized Notion API calls.

**Why it happens:** Using `process.env.NOTION_API_TOKEN` directly in a component instead of in a server route. Or logging the token for debugging and forgetting to remove the log.

**How to avoid:** Only instantiate Notion client in server routes (server/utils/). Use `useRuntimeConfig()` in server code. In client code, call `$fetch('/api/...')` — the token is never exposed. Add a lint rule to prevent importing runtimeConfig in components.

**Warning signs:** The token appears in browser DevTools Network tab; the token is visible in source maps if source maps are shipped to prod.

### Pitfall 3: Cache Stampede on Expiry

**What goes wrong:** At exactly the 1-hour TTL boundary, all cached items expire at once. If they're all requested again simultaneously (e.g., multiple users refresh the page), the cache is empty and all requests hit Notion API at the same time — thundering herd problem — triggering rate limit 429s.

**Why it happens:** Simple TTL-based eviction expires all items at the same time. No cache warming or staggered expiry.

**How to avoid:** Use lru-cache's `allowStale: true` option (allows returning stale data while refreshing in background). Or implement a background job that refreshes cache entries before they expire. For Phase 1, allowing stale data is simpler.

**Warning signs:** Periodic rate limit errors at regular intervals (every hour); cache hit rate drops to 0 at specific times.

### Pitfall 4: Config Changes Not Picked Up

**What goes wrong:** Admin edits sources.json, but the app doesn't reload the config. The app continues using the old database IDs and column mappings.

**Why it happens:** Config is loaded once at startup and cached in memory. Docker volume mounts don't auto-reload the Node.js process.

**How to avoid:** Require admin to restart the container (`docker-compose restart`). This is the intended behavior per the locked decision. Document it clearly. Alternatively, add a `/reload-config` endpoint that re-reads sources.json and re-validates (out of scope for Phase 1).

**Warning signs:** Admin edits config, restarts container, but old data appears; `/api/sources` returns stale database IDs.

### Pitfall 5: Notion API Version Mismatch

**What goes wrong:** Code assumes Notion API 2026-03-11 features, but the client is pinned to @notionhq/client@5.x which defaults to 2025-09-03. New relation fields are not present in responses.

**Why it happens:** Upgrading @notionhq/client without updating the API version header. Or assuming the SDK defaults to the latest API version.

**How to avoid:** Verify the API version header in @notionhq/client initialization. Document which API version the code targets. Check the changelog before upgrading @notionhq/client.

**Warning signs:** Relation properties are missing from API responses; code accessing specific fields returns undefined.

## Code Examples

Verified patterns from official and reference sources:

### Loading and Validating Config at Startup

```typescript
// nuxt.config.ts
// Source: Nuxt 3 app:error hook documentation

import { defineNuxtConfig } from 'nuxt'
import { validateConfig } from './server/utils/config'

export default defineNuxtConfig({
  hooks: {
    'app:error': async (error) => {
      console.error('App error:', error)
    }
  }
})

// server/middleware/validate-config.ts
// Run before any request
export default defineEventHandler(async (event) => {
  const configPath = '/app/config/sources.json'
  
  // Validate once per startup, cache result
  if (!global._configValidated) {
    try {
      const config = await validateConfig(configPath)
      global._configValidated = true
      console.log(`Loaded config with ${config.sources.length} sources`)
    } catch (error) {
      console.error('Config validation failed at startup:', error)
      process.exit(1)
    }
  }
})
```

### Creating and Using the Notion Client with Rate Limiting

```typescript
// server/utils/notion.ts
// Source: @notionhq/client documentation + Bottleneck examples

import { Client } from '@notionhq/client'
import { withRateLimit } from './rate-limiter'

const notion = new Client({
  auth: useRuntimeConfig().notionApiToken,
  // Supports both 2025-09-03 (default) and 2026-03-11
})

export const getDatabaseWithCache = async (databaseId: string) => {
  const cacheKey = `database:${databaseId}`
  
  const cached = cache.get(cacheKey)
  if (cached) {
    return cached
  }
  
  // Rate-limited Notion API call
  const result = await withRateLimit(async () => {
    return notion.databases.query({
      database_id: databaseId,
      page_size: 100  // Max per request; handle pagination in next iteration
    })
  })()
  
  cache.set(cacheKey, result)
  return result
}
```

### Docker Compose with Volume Mount and Environment Variables

```yaml
# docker-compose.yml
# Source: Docker official documentation + Nuxt 3 Docker guides

version: '3.9'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    volumes:
      - ./config:/app/config:ro  # Read-only config volume
    environment:
      NODE_ENV: production
      NOTION_API_TOKEN: ${NOTION_API_TOKEN}  # From .env
      CHOKIDAR_USEPOLLING: 'false'  # Not needed for mounted config (read-only)
    env_file:
      - .env
```

### Multi-Stage Dockerfile for Nuxt 3 Production Build

```dockerfile
# Dockerfile
# Source: Nuxt 3 + Node.js 20 Alpine Docker best practices

FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

# Security: create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nuxt -u 1001

COPY --from=builder --chown=nuxt:nodejs /app/.output /app/.output

USER nuxt

EXPOSE 3000

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

CMD ["node", ".output/server/index.mjs"]
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-request Notion client instantiation | Singleton Notion client in server/utils | Industry standard (2023+) | Reduces memory overhead, consistent request handling, easier token rotation |
| setTimeout polling for rate limits | Token bucket model (bottleneck) | 2020s industry shift | Handles burst tolerance correctly; Notion API allows short bursts, not just flat 3 req/s |
| Database-per-config-file | Database ID + column mappings in config | Config-driven design (2024+) | Allows admins to add sources without code changes; separation of data config from code |
| Recursive relation fetching | Breadth-first with depth limit | Discovered pattern (2024+) | Prevents N+1 explosion; explicit depth limit prevents hidden API call surprises |
| Zod for startup validation | ajv for JSON schema validation | 2024 performance realization | ajv compiles to JavaScript; Zod is orders of magnitude slower for startup (visible delay) |

**Deprecated/outdated:**
- **Sync Notion API wrappers (notion-js):** Superseded by @notionhq/client (official, well-maintained).
- **Manual cache invalidation:** Replaced by TTL-based expiry (lru-cache).
- **Hardcoded API version in SDK calls:** Modern @notionhq/client allows specifying version header per request.

## Open Questions

1. **Cache size tuning**
   - What we know: lru-cache supports both item count (`max`) and byte size (`maxSize`) limits.
   - What's unclear: Should we tune for number of pages (e.g., `max: 500`) or byte size? Notion page objects are ~5-10KB on average.
   - Recommendation: Start with `max: 500` (conservative, ~5MB memory). Monitor in staging; if memory grows, switch to `maxSize: 50_000_000` (50MB).

2. **Offline behavior**
   - What we know: lru-cache with `allowStale: false` will return empty if cache is cold and Notion is unreachable.
   - What's unclear: Should Phase 1 return 503 Service Unavailable, or return partial data from stale cache?
   - Recommendation: Return 503 in Phase 1 (simple, explicit). Phase 2 can improve UX if offline tolerance is needed.

3. **Relation depth limit enforcement**
   - What we know: Locked decision is depth=1 only.
   - What's unclear: Should we add a `maxDepth` config property, or hardcode it in code?
   - Recommendation: Hardcode depth=1 in code for Phase 1. If Phase 2 needs to expose this, add a config property then.

4. **Config reload behavior**
   - What we know: Config is loaded at startup and not reloaded without container restart.
   - What's unclear: Should we add a `/health` endpoint that reports which config sources are accessible, for debugging?
   - Recommendation: Add a simple `/health` endpoint that returns `{ status: 'ok', sourcesLoaded: N }` for Phase 1. Full diagnostics (Notion token validity check) can be Phase 2.

## Validation Architecture

Validation testing is NOT enabled for this project (workflow.nyquist_validation: false in config.json). Manual testing with real Notion databases will be required during Phase 1 implementation. Recommendations for manual verification:

- **Critical paths to test:** Config loading at startup, rate limiter under load (100+ rapid API calls), cache TTL expiry at 1h boundary, relation fetching with multi-database setup.
- **Test data setup:** Create 3 Notion databases in test workspace: one flat list, one with parent-child hierarchy (relations), one with link properties to the other two.
- **Load test:** Write a simple Node script that calls the API 100 times in rapid succession; verify 429 errors are handled gracefully, cache prevents redundant calls, and final results are correct.

## Sources

### Primary (HIGH confidence)

- [@notionhq/client official SDK](https://github.com/makenotion/notion-sdk-js) - Notion API integration, version 5.22.0, supports 2025-09-03 and 2026-03-11 API versions
- [Notion API rate limits documentation](https://developers.notion.com/reference/request-limits) - 3 requests/second average, burst tolerance, Retry-After header handling
- [Notion API database query reference](https://developers.notion.com/reference/post-database-query) - Pagination, filter_properties, relation properties
- [lru-cache npm package](https://www.npmjs.com/package/lru-cache) - LRU caching library, version 11.5.1, TTL and max size configuration
- [Bottleneck npm package](https://www.npmjs.com/package/bottleneck) - Rate limiter, token bucket model, retry handling
- [ajv JSON schema validator](https://ajv.js.org/) - JSON schema validation, version 8.20.0, performance characteristics
- [Nuxt 3 documentation](https://nuxt.com) - Server routes, runtimeConfig, app initialization
- [Node.js 20 LTS documentation](https://nodejs.org) - Runtime stability, server route support

### Secondary (MEDIUM confidence)

- [Nuxt 3 Docker deployment guide](https://oneuptime.com/blog/post/2026-02-08-how-to-containerize-a-nuxt-3-application-with-docker/view) - Multi-stage build, Alpine image size optimization
- [Docker volume mounting documentation](https://docs.docker.com/engine/storage/volumes/) - Read-only volume syntax, file watcher limitations
- [Notion API rate limiting best practices](https://dev.to/kanta13jp1/notion-api-rate-limits-are-breaking-your-automation-heres-the-real-fix-o5p) - Request queuing, batch optimization, error handling strategies
- [TypeScript discriminated unions](https://basarat.gitbook.io/typescript/type-system/discriminated-unions) - Pattern for modeling Notion property types (relation, text, date, etc.)

### Tertiary (Flagged for validation)

- [CHOKIDAR_USEPOLLING for macOS Docker](https://github.com/paulmillr/chokidar) - File watcher behavior with NFS mounts; noted but not applicable to read-only config volumes
- [JSON schema validation comparison (Zod vs Ajv)](https://blog.logrocket.com/why-zod-slow/) - Performance data supports ajv for startup paths; Zod used elsewhere in ecosystem

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — all libraries verified against npm registry; versions current as of 2026-06-02
- Architecture: **HIGH** — Notion API rate limits confirmed via official docs; Nuxt 3 server route pattern is standard; caching + validation patterns are well-established
- Pitfalls: **HIGH** — N+1 problem, token exposure, cache stampede are industry-known issues with clear solutions documented
- Open questions: **MEDIUM** — Some config parameters (cache size, offline behavior) need validation during Phase 1 implementation

**Research date:** 2026-06-02
**Valid until:** 2026-07-02 (30 days; stack is stable but monitor @notionhq/client for API version changes)

---

*Research completed for Phase 1: Backend Foundation*
*Next step: `/gsd:plan-phase 1` to break down requirements into executable tasks*
