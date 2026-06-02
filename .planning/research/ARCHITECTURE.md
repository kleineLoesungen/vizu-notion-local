# Architecture Patterns: Notion Visualization Webapp

**Domain:** Configurable Notion visualization (metro maps + process flows)
**Researched:** 2026-06-02
**Confidence:** MEDIUM (training data + patterns from similar systems; not verified against production Notion integrations)

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Browser (Client)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Vue 3 Components (Visualization + UI)                │   │
│  │  - VizualizationContainer (router-based view switch)  │   │
│  │  - MetromizerView (Metroviz metro map)                │   │
│  │  - ProcessFlowView (Vue Flow diagram)                 │   │
│  │  - FilterPanel (interactive controls)                 │   │
│  └──────────────────────────────────────────────────────┘   │
│           │                                                   │
│           │ HTTP / useFetch()                                │
│           ▼                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Nuxt Auto-imports + Composables                      │   │
│  │  - useNotionData(sourceId)  [calls server route]      │   │
│  │  - useVisualizationConfig() [loads config state]      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
           │
           │ /api/notion/[sourceId]
           │ /api/config
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│              Nuxt Server Layer (Backend)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Server Routes (~/server/routes/api/)                  │   │
│  │ - /api/notion/[sourceId].ts  [data endpoint]          │   │
│  │ - /api/config.ts             [config endpoint]        │   │
│  │ - /api/health.ts             [cache status]           │   │
│  └──────────────────────────────────────────────────────┘   │
│           │                                                   │
│           │ Dependency injection / imports                   │
│           ▼                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Service Layer (~/server/services/)                    │   │
│  │                                                       │   │
│  │ ┌────────────────────────────────────────────────┐   │   │
│  │ │ NotionDataService                              │   │   │
│  │ │ - queryNotionDatabase(databaseId, filters)     │   │   │
│  │ │ - queryRelatedDatabases(relationPropertyName)  │   │   │
│  │ │ - transformRawResponse(apiResponse)            │   │   │
│  │ └────────────────────────────────────────────────┘   │   │
│  │           │                                           │   │
│  │           ▼ (delegates)                              │   │
│  │ ┌────────────────────────────────────────────────┐   │   │
│  │ │ CachingLayer                                   │   │   │
│  │ │ - getCached(key, ttl)                          │   │   │
│  │ │ - invalidate(pattern)                          │   │   │
│  │ │ - getCacheStats()                              │   │   │
│  │ │ Backend: SQLite (persistent) + Memory (warm)   │   │   │
│  │ └────────────────────────────────────────────────┘   │   │
│  │           │                                           │   │
│  │           ▼ (on cache miss)                          │   │
│  │ ┌────────────────────────────────────────────────┐   │   │
│  │ │ NotionAPIClient (rate-limited)                 │   │   │
│  │ │ - queryDatabase(databaseId, filter, paging)    │   │   │
│  │ │ - getRateLimitStatus()                         │   │   │
│  │ │ - wait(backoffMs)  [respects 3 req/s limit]    │   │   │
│  │ └────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│           │                                                   │
│           │ HTTP (Notion SDK)                                │
│           ▼                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Config Loader (~/server/utils/config.ts)             │   │
│  │ - loadConfigFile(path)                               │   │
│  │ - parseVisualizationMappings()                        │   │
│  │ - validateConfig()                                   │   │
│  │ Reads: /app/config/vizu-config.json (mounted vol)    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
           │
           │ External APIs
           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Notion API (External)                       │
│  (3 requests/second rate limit)                              │
└─────────────────────────────────────────────────────────────┘

           │ Persistent storage
           ▼
┌─────────────────────────────────────────────────────────────┐
│        Local Filesystem & SQLite (~/server/cache/)           │
│ - SQLite: cache entries (key, value, ttl, timestamp)         │
│ - JSON: config file (mounted via Docker volume)              │
│ - Memory: LRU cache for warm-start (populated from SQLite)   │
└─────────────────────────────────────────────────────────────┘
```

## Component Boundaries

### Client Layer

| Component | Responsibility | Communicates With | Notes |
|-----------|----------------|-------------------|-------|
| **VisualizationContainer** | Route-based view switcher (controls which viz type renders) | MetromizerView, ProcessFlowView | Single page with `<NuxtRouterView>` or conditional rendering |
| **MetromizerView** | Renders Metroviz metro map; manages node/line interaction | useNotionData, MetromizerUI components | Receives hierarchical data, emits click events for filtering |
| **ProcessFlowView** | Renders Vue Flow diagram; manages edge/node state | useNotionData, Vue Flow library | Receives flat workflow data with next-step relationships |
| **FilterPanel** | Manages interactive filters (search, category, status) | useNotionData (triggers refetch with filters), both viz views | Updates URL query params for persistence |

### Client Composables / Composable Layer

| Composable | Responsibility | Communicates With | Returns |
|-----------|----------------|-------------------|---------|
| **useNotionData** | Fetches data from `/api/notion/[sourceId]` with filters | Nuxt server route, maintains local state | `{ data, loading, error, refetch() }` |
| **useVisualizationConfig** | Loads config on app start, watches config changes | Config state, `/api/config` endpoint | `{ config, sources, mappings, isLoading }` |
| **useVisualizationTransform** | Transforms API response → visualization-specific data models | Raw Notion data from useNotionData | `{ metros, flows, nodeMap, relationshipMap }` |

### Server Layer: Routes

| Route | Method | Input | Output | Purpose |
|-------|--------|-------|--------|---------|
| `/api/notion/[sourceId]` | GET | `sourceId` (URL param), `filters` (query string) | `{ success, data, cacheHit, timestamp }` | Fetch visualization data from Notion |
| `/api/config` | GET | — | `{ sources, visualizations, version }` | Load current configuration |
| `/api/health` | GET | — | `{ status, cacheSize, cacheHits, nextRateLimitReset }` | Monitor cache and API health |

### Server Layer: Services

| Service | Responsibility | Methods | Stateful? |
|---------|----------------|---------|-----------|
| **NotionDataService** | Query Notion APIs, transform responses, manage multi-DB relationships | `queryDatabase()`, `queryWithRelations()`, `transformToVizModel()` | No (functional, pure) |
| **CachingLayer** | Persistent (SQLite) + in-memory cache with TTL and rate-limit awareness | `get()`, `set()`, `invalidate()`, `getStats()` | **YES** (maintains cache state) |
| **NotionAPIClient** | Low-level Notion SDK wrapper with rate-limit throttling | `queryDatabase()`, `getRateLimitStatus()`, `wait()` | **YES** (tracks rate limit) |
| **ConfigService** | Load and validate config file on startup | `loadConfig()`, `getSourceById()`, `getMappingsFor()` | **YES** (singleton config state) |

### Storage Layer

| Store | Type | Responsibility | Persistence | Notes |
|-------|------|-----------------|-------------|-------|
| **Cache DB** | SQLite | Persistent cache of Notion data | File system | Located in Docker volume; survives restarts |
| **Memory Cache** | In-Memory LRU | Warm cache for current session | Session only | Populated from SQLite on startup; speeds up first page load |
| **Config File** | JSON/YAML | Admin-editable visualization config | Docker mounted volume | Loaded on server startup; changes require restart |

## Data Flow

### Request Flow: Fetching Visualization Data

```
1. User loads page or applies filter
   └─> Vue component calls useNotionData(sourceId, filters)
   
2. Client composable triggers Nuxt server route
   └─> useFetch('/api/notion/metroviz-goals?status=active&priority=high')
   
3. Server route handler (/api/notion/[sourceId].ts)
   ├─> Parses sourceId from URL, filters from query string
   ├─> Calls NotionDataService.queryWithCaching(sourceId, filters)
   └─> Returns { success, data, cacheHit, timestamp }
   
4. NotionDataService checks cache first
   ├─> (HIT) Return cached data + metadata
   └─> (MISS) Proceed to step 5
   
5. NotionDataService queries Notion API
   ├─> Calls NotionAPIClient.queryDatabase(databaseId, notionFilter)
   ├─> Checks rate limit (3 req/s); waits if necessary
   ├─> Executes API query (paginated if large dataset)
   └─> Returns raw Notion response
   
6. Data transformation
   ├─> NotionDataService.transformToVizModel(rawResponse, mapping)
   │   └─> Maps Notion columns → visualization fields
   │   └─> Resolves relationship properties (linked databases)
   │   └─> Flattens/normalizes for specific viz type
   └─> Returns structured data ready for rendering
   
7. Cache storage (on miss)
   ├─> CachingLayer stores result in SQLite with TTL
   ├─> Also stores in memory cache for fast repeated access
   └─> Tracks timestamp, hit rate, storage size
   
8. Response to client
   └─> Server returns { success: true, data, cacheHit: true/false, timestamp }
   
9. Client renders
   └─> Vue component receives data, passes to viz component
   └─> Metroviz or Vue Flow renders visualization
```

### Config Flow: Application Startup

```
1. Docker container starts → Nuxt server boots
   
2. Config loader runs (early in server lifecycle)
   ├─> Reads /app/config/vizu-config.json (mounted volume)
   ├─> Parses visualization definitions + Notion sources
   ├─> Validates (token format, database ID syntax, mappings)
   └─> Stores in ConfigService singleton
   
3. Server routes come online
   ├─> Each route accesses config via ConfigService.getConfig()
   └─> If config invalid → 500 error on first API call (caught by health check)
   
4. User refreshes browser → client starts
   
5. Client calls /api/config on mount
   └─> Returns { sources, visualizations, version }
   
6. useVisualizationConfig() populates client state
   └─> Client knows which visualization routes to render
```

### Caching Strategy: Rate Limit & Offline Tolerance

```
Rate limit constraint: 3 requests/second (Notion API)

Strategy: Multi-tiered cache with TTL
┌────────────────────────────────────────────┐
│ Request for database X arrives              │
└────────────────────────────────────────────┘
         │
         ▼
    Is it in memory cache?
    ├─ YES (and not expired) ──────────────────────┐
    │                                               │ Return immediately
    │                                               │ (latency: ~1ms)
    │                                               ▼
    │                                        Response to client
    │
    └─ NO (expired or first time)
         │
         ▼
    Is it in SQLite cache?
    ├─ YES (and not expired) ──────────────────────┐
    │                                               │ Hydrate memory cache
    │                                               │ Return from cache
    │                                               │ (latency: ~5-20ms)
    │                                               ▼
    │                                        Response to client
    │
    └─ NO (expired or first time)
         │
         ▼
    Check rate limit queue
    ├─ Rate limit exhausted? ────────────────────┐
    │  (3 reqs/sec, queued)                       │ Queue request
    │                                             │ Wait for slot
    │                                             │ (latency: variable)
    │                                             ▼
    └─ Slot available? ──────────────────────────────┐
         │                                            │
         ▼                                            │
    Execute Notion API query ◄──────────────────────┘
    (paginated if >100 rows)
         │
         ▼
    Store in both caches
    ├─ Memory LRU (1-hour TTL, size limit ~50MB)
    ├─ SQLite (24-hour TTL, unlimited size)
    └─ Record: timestamp, sourceId, filters hash
         │
         ▼
    Response to client
    (latency: 200-500ms + API call time)
```

**TTL Strategy:**
- **Memory cache:** 1 hour (warm access patterns)
- **SQLite persistent:** 24 hours (offline tolerance)
- **Rate limit queue:** 100ms sliding window (smooth 3 req/s)

**Cache invalidation:**
- Admin edits config file → Container restart (full flush)
- User applies filters → Cache hit (filters are query param hash)
- Offline detected → Use SQLite stale data (return with `stale: true`)

## Patterns to Follow

### Pattern 1: Server Routes as API Gateways

**What:** Nuxt server routes (`~/server/routes/api/`) are the single point of entry for all data operations. They validate, cache, and delegate to services.

**When:** Always — never fetch Notion API directly from client components.

**Why:** Centralized rate limiting, caching control, security (token never exposed to client), and Notion API error handling.

**Example:**
```typescript
// server/routes/api/notion/[sourceId].ts
export default defineEventHandler(async (event) => {
  const sourceId = getRouterParam(event, 'sourceId');
  const filters = getQuery(event); // { status: 'active', ... }
  
  try {
    const result = await notionDataService.queryWithCaching(
      sourceId,
      filters
    );
    return {
      success: true,
      data: result.data,
      cacheHit: result.fromCache,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    setResponseStatus(event, 500);
    return { success: false, error: error.message };
  }
});
```

### Pattern 2: Configuration-Driven Visualization Mapping

**What:** The config file defines which Notion columns map to which visualization properties. Services use this mapping to transform raw API responses.

**When:** Building any visualization that needs to support multiple Notion database schemas.

**Why:** Decouples visualization code from Notion schema; admin can adjust without code changes.

**Example config structure:**
```json
{
  "visualizations": [
    {
      "id": "metroviz-goals",
      "type": "metroviz",
      "title": "Goals Map",
      "sources": [
        {
          "databaseId": "notion-db-123",
          "name": "Goals",
          "mapping": {
            "nodeId": "Id",
            "nodeLabel": "Goal Name",
            "parentId": "Parent Goal",
            "statusProperty": "Status",
            "colorByProperty": "Priority"
          }
        }
      ]
    }
  ]
}
```

**Service implementation:**
```typescript
// Transforms raw Notion data using mapping
transformToVizModel(rawResponse, mapping) {
  return rawResponse.results.map(page => ({
    id: page.properties[mapping.nodeId].title[0]?.plain_text,
    label: page.properties[mapping.nodeLabel].title[0]?.plain_text,
    parentId: page.properties[mapping.parentId].relation[0]?.id,
    status: page.properties[mapping.statusProperty].select?.name,
    color: this.getColorForPriority(
      page.properties[mapping.colorByProperty].select?.name
    )
  }));
}
```

### Pattern 3: Multi-Visualization Component Switch

**What:** Single route with conditional rendering; data shape is the same (normalized), each viz component is self-contained.

**When:** Supporting multiple visualization types (Metroviz, Vue Flow, future chart types).

**Why:** Simplifies data flow (one endpoint, one cache), avoids duplicating transformation logic.

**Example:**
```vue
<template>
  <div class="visualization-container">
    <MetromizerView v-if="config.type === 'metroviz'" :data="vizData" />
    <ProcessFlowView v-else-if="config.type === 'process-flow'" :data="vizData" />
  </div>
</template>

<script setup>
const config = useVisualizationConfig();
const { data: vizData } = useNotionData(config.sourceId);
</script>
```

### Pattern 4: Rate-Limited API Client with Queue

**What:** NotionAPIClient wraps Notion SDK, tracks rate limit bucket, queues requests when limit is approached.

**When:** Making any call to Notion API (always through this client).

**Why:** Ensures 3 req/sec limit is never violated; prevents 429 errors and backoff thrashing.

**Example:**
```typescript
class NotionAPIClient {
  private rateLimitBucket = 3; // 3 requests/sec
  private lastResetTime = Date.now();
  private requestQueue: Function[] = [];

  async queryDatabase(databaseId, filter) {
    await this.waitForRateLimit();
    
    const response = await this.client.databases.query({
      database_id: databaseId,
      filter,
      page_size: 100
    });
    
    this.rateLimitBucket--;
    return response;
  }

  private async waitForRateLimit() {
    const now = Date.now();
    if (now - this.lastResetTime > 1000) {
      this.rateLimitBucket = 3;
      this.lastResetTime = now;
    }
    
    while (this.rateLimitBucket <= 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (now - this.lastResetTime > 1000) {
        this.rateLimitBucket = 3;
        this.lastResetTime = now;
      }
    }
  }
}
```

### Pattern 5: Composable for Stateful Data Fetching

**What:** `useNotionData()` composable encapsulates fetch logic, error handling, and state management.

**When:** Any component needing visualization data.

**Why:** Reusable, testable, keeps component template clean.

**Example:**
```typescript
export const useNotionData = (sourceId: string, filters = {}) => {
  const data = ref(null);
  const loading = ref(false);
  const error = ref(null);
  
  const fetchData = async () => {
    loading.value = true;
    error.value = null;
    try {
      const { data: result } = await useFetch(
        `/api/notion/${sourceId}?${new URLSearchParams(filters)}`
      );
      data.value = result.value?.data;
    } catch (e) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  };
  
  onMounted(() => fetchData());
  watch(filters, () => fetchData());
  
  return { data, loading, error, refetch: fetchData };
};
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-Side Notion API Calls

**What:** Putting Notion API token in client code or making direct API calls from Vue components.

**Why bad:** 
- Exposes authentication token to browser (XSS risk)
- Loses rate-limit control (concurrent requests from multiple browser tabs)
- No caching coordination (multiple tabs = duplicate API calls)
- Violates CORS for direct Notion API access

**Instead:** Always route through Nuxt server routes. Token stays server-side, caching is centralized.

### Anti-Pattern 2: Transformation Logic in Components

**What:** Flattening/mapping Notion columns inside Vue component templates or computed properties.

**Why bad:**
- Logic is duplicated across components if multiple viz types need it
- Hard to test
- Tight coupling between component and Notion schema
- Config changes require code changes

**Instead:** Put all transformation in NotionDataService. Components receive pre-transformed data.

### Anti-Pattern 3: Multiple Cache Layers Without TTL

**What:** Caching at component level, route level, and service level without clear invalidation strategy.

**Why bad:**
- Stale data bugs (admin edits Notion, cache doesn't update)
- Memory bloat (unlimited in-memory caches)
- Hard to debug (which layer served the data?)

**Instead:** Two-tier cache: memory (1 hour, size-limited) + SQLite (24 hours). Clear invalidation on config reload.

### Anti-Pattern 4: Visualization Data Models that Match Notion Schema

**What:** Passing raw Notion API responses directly to viz components without normalization.

**Why bad:**
- Notion's schema has null/undefined nesting for missing properties
- Different database structures → different response shapes
- Viz component becomes coupled to Notion API format
- Filtering/sorting is fragile

**Instead:** Normalize to a simple, flat shape that visualization components expect. This is what `transformToVizModel()` does.

### Anti-Pattern 5: No Offline Fallback

**What:** Assuming network is always available; no stale cache strategy.

**Why bad:**
- Network hiccup = broken app
- User can't browse cached data while waiting for API

**Instead:** When API fails, serve stale data from SQLite with `stale: true` flag. Client can show "Data is from [timestamp]" badge.

## Suggested Build Order & Dependencies

This order respects component dependencies and incremental validation:

### Phase 1: Foundation (Config + Caching)
1. **ConfigService** — Load and validate config file
   - Dependency: None
   - Enables: All data fetching
   - Why first: Other components need config to know which databases to query

2. **CachingLayer** (SQLite + memory) — Cache with TTL
   - Dependency: None
   - Enables: Rate limit handling, offline tolerance
   - Why second: Rate-limited API client will delegate to this

3. **NotionAPIClient** — Notion SDK wrapper with rate limiting
   - Dependency: CachingLayer (delegates misses to this)
   - Enables: Data queries
   - Why third: Ready to handle rate limits via cache

### Phase 2: Data Services
4. **NotionDataService** — Query Notion, transform responses
   - Dependency: ConfigService, NotionAPIClient, CachingLayer
   - Enables: Server routes
   - Why: Has all dependencies; handles business logic

5. **Server Routes** (`/api/notion/[sourceId]`, `/api/config`, `/api/health`)
   - Dependency: NotionDataService, ConfigService
   - Enables: Client fetching
   - Why: Thin wrappers around services; ready once services are done

### Phase 3: Client Data Layer
6. **Composables** (`useNotionData`, `useVisualizationConfig`, `useVisualizationTransform`)
   - Dependency: Server routes
   - Enables: Components
   - Why: These are the bridge between components and server layer

### Phase 4: Visualization Components
7. **MetromizerView** — Metro map visualization
   - Dependency: useNotionData, useVisualizationTransform
   - Enables: Metroviz pages
   - Why: Can be built independently once data layer is ready

8. **ProcessFlowView** — Vue Flow diagram
   - Dependency: useNotionData, useVisualizationTransform
   - Enables: Process flow pages
   - Why: Independent, can be parallelized with MetromizerView

### Phase 5: Integration
9. **VisualizationContainer** — Route-based view switcher
   - Dependency: All viz components, all composables
   - Enables: Full app
   - Why: Ties everything together; last piece

10. **FilterPanel** — Interactive filters
    - Dependency: useNotionData, both viz views
    - Enables: Full interactivity
    - Why: Enhances existing views; not blocking MVP

## Nuxt 3 Server Routes vs Client-Side Fetching: Decision

**Verdict:** Use Nuxt 3 server routes for all Notion API access. Never fetch directly from client.

**Rationale:**
- **Rate limiting:** Centralized queue prevents 3 req/s violations
- **Caching:** Single source of truth; avoids duplicate API calls from multiple browser tabs
- **Security:** Notion API token stays server-side (no XSS exposure)
- **Offline tolerance:** Server can return stale cache data; client doesn't know the difference
- **CORS:** No CORS issues (server → Notion, client → server)

**Implementation:** Route at `/api/notion/[sourceId]` wraps `notionDataService.queryWithCaching()`. Client calls via `useFetch()`.

## Scalability Considerations

| Concern | At 100 rows | At 10K rows | At 100K rows |
|---------|-------------|-------------|--------------|
| **Memory cache** | In-memory LRU is fine (< 10MB) | Size-limit at 50MB; use SQLite for cold data | Only warm queries in memory; archive old caches |
| **SQLite** | Single file in Docker volume is fine (< 100MB) | Consider WAL mode for concurrent writes | Implement cache rotation (delete oldest entries) |
| **Notion API pagination** | Single request (<100 items) | Multiple requests required (100-item pages) | Rate limit throttling essential; batch by sourceId |
| **Data transformation** | All columns scanned (fine) | Selective property access (optimize) | Lazy-load related databases (don't fetch all at once) |
| **Visualization rendering** | All nodes rendered (fine) | Virtualization needed for Vue Flow; Metroviz has limits | Implement viewport-based filtering |

## Key Architectural Decisions

| Decision | Rationale | Implication |
|----------|-----------|------------|
| **Server routes for all data** | Centralized rate limiting, caching, security | Client is always thin; server handles complexity |
| **Two-tier cache (memory + SQLite)** | Fast access + offline tolerance | TTL management needed; cache invalidation on config reload |
| **Configuration file, not admin UI** | Simpler to build; admin has Docker access | Config changes require restart; validation happens at startup |
| **Normalized data model in transformToVizModel** | Decouples viz from Notion schema | More code in service layer; but components are simpler |
| **Composables for data fetching** | Reusable, testable, clean component code | Requires strong Nuxt 3 composable patterns |
| **Single endpoint with conditional viz rendering** | Shared data fetch, shared cache | Must design normalized data shape that fits all viz types |

## Sources & References

**Notion API Patterns:**
- Notion SDK documentation (v1.x, 2024+) — Official Notion integration patterns
- Best practices inferred from rate-limit constraints (3 req/s) and pagination (100-item max per request)

**Nuxt 3 Architecture:**
- Nuxt 3 documentation (server routes, composables, auto-imports) — Official patterns
- Vue 3 composition API patterns — Reusable composables design

**Visualization Architecture:**
- Metroviz documentation — Metro map structure and SVG rendering
- Vue Flow documentation — Graph rendering, interactivity, and node/edge architecture
- Configurable dashboard patterns — From systems like Grafana, Superset, and custom dashboards

**Caching & Rate Limiting:**
- Redis/SQLite caching patterns — TTL, invalidation, concurrent access
- Rate limiter queue patterns — Token bucket, sliding window, backoff strategies

---

**Confidence notes:**
- **HIGH:** Nuxt 3 server route patterns, composition API composables, Vue 3 component architecture
- **MEDIUM:** Notion API pagination, rate limit queue design (not verified against production Notion load)
- **MEDIUM:** Two-tier cache strategy (SQLite + memory) — standard pattern, not Notion-specific testing
- **LOW:** Metroviz-specific architectural constraints (would need deeper dive into library internals)
- **LOW:** Optimization thresholds at 100K rows (estimated; depends on actual Notion response sizes)

**Gaps for phase-specific research:**
- Phase 2 (Caching): Verify Notion API actual rate limit behavior and pagination semantics
- Phase 3 (Visualization): Benchmark Metroviz rendering with 100+ nodes; Vue Flow performance at scale
- Phase 4 (Multi-database): Test relationship property resolution with large linked databases
