# Domain Pitfalls: Notion API + Config-Driven Visualization + Docker

**Project:** vizu-notion-local (Notion API → Configurable Visualization)
**Researched:** 2026-06-02
**Focus:** Critical mistakes in Notion integration, config-driven schema mapping, niche library integration, and local Docker development

---

## Critical Pitfalls

These mistakes cause rewrites, data loss, or fundamental architecture breaks.

### Pitfall 1: Notion API Relation Resolution Without Breadth-First Traversal

**What goes wrong:**
You fetch a Notion database with relations/rollups, then naively follow each relation as you encounter it (depth-first). This causes:
- Exponential API calls (one property fetch can trigger 10+ nested fetches)
- Rate limit hits after fetching a small dataset
- N+1 query patterns (fetch parent, then each child, then each grandchild)
- Circular dependency loops (A → B → A) crash the traversal

**Why it happens:**
Notion API returns relation IDs but not the linked object data. To resolve relations, you must fetch each linked database. It's tempting to do this immediately. Developers don't realize the relationship graph is densely connected.

**Consequences:**
- First visualization load times out or fails after a few seconds
- Rate limit hit message confuses users (they think it's a quota issue, not an implementation issue)
- App becomes unusable with >500 rows of data across linked databases
- If you cache aggressively to work around rate limits, stale data becomes a support nightmare

**Prevention:**
1. **Batch relations upfront** — On startup, map all databases and their relations in a single pass. Don't fetch relation targets lazily.
2. **Implement breadth-first collection** — Collect all IDs at level N before fetching level N+1 data. Use batched queries (Notion API supports `filter` and pagination).
3. **Cache aggressively and document TTL** — Store fetched objects locally with explicit TTL (e.g., 5 min for development, 1 hour for production). Document that visualizations reflect cached state.
4. **Detect circular dependencies early** — Before fetching, scan the relation schema graph. Flag cycles and warn users in logs.
5. **Implement a query budget** — Count API calls before executing. Fail early with a clear message: "Would require 500+ API calls. Consider narrowing scope or caching."
6. **Test with realistic data** — Use a test Notion workspace with >1000 rows across 3+ linked databases. Measure API call count before rate limits hit.

**Detection:**
- App hangs during initial load (>30 seconds)
- Logs show repeating "Rate limit exceeded" errors in quick succession
- First page load works; second database/config load fails
- Users report "worked yesterday, doesn't work today" (rate limit reset daily)

**Phase to address:** Phase 1 (Core Notion Integration)
- Must design fetching strategy before building resolvers
- Test with target data size during Phase 1 implementation
- If not addressed: Phases 2+ visualization layers become useless

---

### Pitfall 2: Property Type Mismatch in Config-Driven Schema Mapping

**What goes wrong:**
Your config maps Notion properties to visualization fields (e.g., "title → node name", "relation → edge target"). But Notion properties have subtle type variations:
- A "Title" property and a "Rich text" property both return strings, but Title is always single-line, Rich text can be multi-line
- A relation returns an array of linked database entries, but if the relation is single-select masquerading as a link, it returns a string
- Rollup properties return different types depending on aggregation function (sum → number, concatenate → string, count_all → number)
- Property names can be renamed; old config points to a deleted/renamed column and silently fails

**Why it happens:**
Notion API documentation lists property types, but most developers skip the "gotchas" section. Config is human-editable, so typos in property names silently skip fields. Type coercion happens implicitly in JavaScript.

**Consequences:**
- Visualization shows blank/missing data for valid properties
- Configuration appears "correct" but renders wrong
- Some databases work; others with similar structure fail
- Data loss if you aggressively coerce types (e.g., JSON.stringify() on a relation array)

**Prevention:**
1. **Validate property existence and type at config load time** — Before the app starts, fetch database schema and verify:
   - Property names match exactly (case-sensitive)
   - Property types match expected mappings
   - Fail loudly with a message: "Config maps 'Author' but database has 'Owner' (did you rename it?)"
2. **Create a property type mapping layer** — Don't assume "text-like" properties are interchangeable. Map explicitly:
   ```
   { notionType: "title", visualizationType: "nodeLabel", coerce: (v) => v[0]?.plain_text || "" }
   { notionType: "relation", visualizationType: "edgeTarget", coerce: (v) => v.map(r => r.id) }
   ```
3. **Test config parsing with schema validation** — Generate a test suite that runs for each database:
   - Load config
   - Fetch schema
   - Validate mappings
   - Report mismatches before visualization renders
4. **Handle missing/null properties gracefully** — If a row doesn't have a mapped property, don't crash. Log it, skip that row, continue.
5. **Document expected property types in config template** — Show examples of valid mappings for each type.

**Detection:**
- Entire sections of visualization are blank
- Some databases render; others don't
- Config validation passes but visualization is empty
- Logs show no errors, but data isn't appearing

**Phase to address:** Phase 1-2 (Config system + data fetching)
- Phase 1: Define config schema and validation
- Phase 2: Implement type mappers and validate against real databases
- If not addressed: Phase 3 visualization becomes unreliable

---

### Pitfall 3: Config Flexibility Explosion (Scope Creep in Schema Mapper)

**What goes wrong:**
You start with a simple config: "map column X to visualization field Y". Then users request:
- "Can I use a formula result instead of a column?"
- "Can I combine two columns?"
- "Can I map nested properties (relation → relation → property)?"
- "Can I apply transforms (uppercase, truncate, etc.)?"

Each request adds 10% more complexity to the config schema and mapper. By month 3, your config parser is a mini-programming language. You're debugging config inheritance, nested mappings, and conditional transforms. The config file becomes harder to understand than the original Notion database.

**Why it happens:**
File-based config seems infinitely flexible. Each feature is "just one more mapping rule". You don't charge for config complexity (no UI to gate complexity), so users pile on requests.

**Consequences:**
- Config validation becomes 500+ lines of recursive schema checking
- Bugs in transforms cascade (transform A breaks transform B)
- Users create invalid configs that crash the visualizer with cryptic errors
- Config files become 500+ lines of YAML/JSON that only power users can understand
- Maintenance burden grows: every change to mapper logic requires testing 10+ config variations

**Prevention:**
1. **Draw a hard scope line upfront** — Decide: config maps columns to fields, period. Transforms? Out of scope. Nested relations? Define max depth (e.g., 2 levels).
2. **Start with the simplest possible config schema** — Only add features when 3+ users request them AND provide real use cases.
   ```yaml
   # YES - simple
   databases:
     - id: "abc123"
       nodeLabel: "Title"        # Direct column mapping
       nodeColor: "Status"

   # NO - complex
   databases:
     - id: "abc123"
       nodeLabel:
         source: "Title"
         transform: [uppercase, truncate(20)]
       nodeColor:
         if: "Status == 'Done'"
         then: "green"
         else: "gray"
   ```
3. **Build validation that rejects complex configs** — If config requires more than 20 lines per database, warn the user. Suggest simplifying or adding a transform step before Notion.
4. **Implement a "config linter"** — Validate and suggest simplifications:
   - Warn if mapping 5+ properties for same field (likely misconfigured)
   - Suggest using Notion formulas instead of app transforms
   - Detect unused mappings
5. **Document the scope clearly** — In README and config template, state: "Config maps Notion columns to visualization fields. For complex transforms, use Notion formulas."

**Detection:**
- Config file is >300 lines and growing
- Users are requesting transforms and conditionals
- Mapper logic is >200 lines and hard to follow
- New features require touching multiple parts of mapper

**Phase to address:** Phase 1 (Config schema design)
- Define scope before implementation
- If addressed late (Phase 2+): Requires refactor to simplify

---

### Pitfall 4: Metroviz Constraint Violations (Graph Layout Issues)

**What goes wrong:**
Metroviz (metro map library) has implicit constraints:
- It expects a DAG (directed acyclic graph) with a clear "flow" direction. If your data has cycles, rendering breaks.
- It expects a relatively shallow hierarchy (3-4 levels). Deep hierarchies (10+ levels) cause visual collapse.
- It has limited customization for node shapes/colors. Users expect to color nodes by status; Metroviz doesn't expose per-node styling easily.
- Performance degrades with >200 nodes. Beyond that, layout engine struggles.
- It assumes data is "metro-like" (linear flow with branches). Highly interconnected graphs (mesh topology) render poorly.

**Why it happens:**
Metroviz documentation shows beautiful examples that all have clean hierarchies. Developers assume it will handle any directed graph. It won't. Real Notion data often has cycles (Person A manages Person B, who manages Person A via matrix reporting) and deep trees.

**Consequences:**
- Visualization renders but looks wrong (overlapping nodes, tangled edges)
- Users see a broken diagram and lose trust in the tool
- You spend 2 weeks trying to "fix" Metroviz, then realize it's a fundamental constraint
- You have to choose: rewrite visualization to work with Metroviz constraints, or switch libraries
- Switching libraries mid-project is expensive (rebuild all data transformations, re-train users)

**Prevention:**
1. **Validate data structure early** — Before passing data to Metroviz, check:
   ```
   - Is it a DAG? (Detect cycles: if A → B → A exists, reject or flatten)
   - What's max depth? (If >6, warn user and suggest Notion-side filtering)
   - How many nodes? (If >150, test performance)
   - How interconnected? (If average node has >3 connections, warn)
   ```
2. **Implement a "metro-compatible" data transformer** — Convert raw Notion graph to metro-friendly format:
   - Detect and break cycles (keep one direction, log the exception)
   - Flatten deep hierarchies (limit to N levels, show overflow in detail view)
   - Drop heavily interconnected edges (show primary relationships only)
3. **Test with realistic data early** — During Phase 2, visualize actual Notion data. Don't assume the example data in Metroviz docs matches your use case.
4. **Document constraints in config** — Show users which database structures work well:
   ```
   # Good for Metroviz:
   - Goals → Projects → Tasks (3 levels, clear hierarchy)
   
   # Bad for Metroviz:
   - Team members with circular reporting lines
   - Highly interconnected knowledge graphs
   - Deep taxonomies (>7 levels)
   ```
5. **Have a fallback visualization** — If data doesn't fit Metroviz constraints, fall back to a simpler graph view or list view. Don't force broken diagrams.

**Detection:**
- Visualization renders but looks visually confusing (nodes overlap, edges tangle)
- Console shows Metroviz warnings or errors
- Performance is slow when loading seemingly small datasets
- Users say "the data looks wrong" but all rows are present

**Phase to address:** Phase 2-3 (Metroviz integration + visualization)
- Phase 2: Implement validation and constraints check
- Phase 3: Build fallback visualizations for non-metro data
- If not addressed: Users see broken diagrams and blame the app

---

### Pitfall 5: Vue Flow Node ID Collision and Data Synchronization

**What goes wrong:**
Vue Flow requires unique node IDs. If you generate IDs from Notion database IDs + property values, you can get collisions:
- Same row appears in multiple databases (ID collision if you don't namespace by database)
- Node IDs change when Notion data changes (hard refresh crashes references)
- Vue Flow internal state (selected nodes, viewport position) gets out of sync with data
- You update Notion data, but Vue Flow still shows old state (no reactivity)
- Edges reference node IDs that no longer exist (silently fail to render)

**Why it happens:**
Vue Flow manages its own state (which nodes are selected, viewport zoom, etc.). It's easy to assume Vue reactivity automatically syncs Vue Flow state with your data. It doesn't. You have to explicitly sync. Node IDs seem like a simple identifier; developers don't realize collisions are possible until data overlaps.

**Consequences:**
- Two different nodes render at the same position (appear as one node, clicking opens wrong node)
- Diagram becomes unresponsive after a data refresh
- Users complain: "I clicked the right node but got the wrong one"
- Edges disappear after configuration changes
- Viewport resets unexpectedly when data loads

**Prevention:**
1. **Namespace node IDs by database and row** — Don't use raw Notion IDs:
   ```typescript
   // BAD: nodeId = "abc123"
   // GOOD: nodeId = "db:goals__row:abc123"
   nodeId = `db:${databaseId}__row:${rowId}`;
   ```
2. **Make IDs immutable** — Never regenerate IDs from changing data. Generate once at load, store in cache.
3. **Implement a sync contract** — When data changes, explicitly update Vue Flow state:
   ```typescript
   // After fetching new Notion data:
   1. Generate new node/edge lists
   2. Validate all edges reference existing nodes
   3. Detect removed nodes and clean up Vue Flow state
   4. Update Vue Flow: setNodes(newNodes); setEdges(newEdges);
   ```
4. **Add collision detection at load time** — Before rendering:
   ```typescript
   const nodeIds = nodes.map(n => n.id);
   const duplicates = nodeIds.filter((v, i) => nodeIds.indexOf(v) !== i);
   if (duplicates.length > 0) {
     console.error("Node ID collision detected:", duplicates);
     // Fail loudly
   }
   ```
5. **Test data refresh** — Verify that re-fetching Notion data and re-rendering Vue Flow doesn't break state:
   - Load data, select a node, verify selection persists
   - Change Notion data, reload config, verify diagram updates
   - Add/remove nodes, verify edges still point to valid nodes

**Detection:**
- Same node appears twice in diagram (collapsed into one visual element)
- Clicking a node opens wrong details panel
- Diagram goes blank after a data refresh
- Console shows Vue Flow errors about missing nodes
- Viewport/zoom resets unexpectedly

**Phase to address:** Phase 2-3 (Vue Flow implementation)
- Phase 2: Design node ID strategy and sync contract
- Phase 3: Implement validation and test data refresh scenarios
- If not addressed: App becomes unreliable after first data change

---

### Pitfall 6: Docker Volume Mount Sync and File-Based Config Hot Reload

**What goes wrong:**
You mount a config file from host into Docker container (`docker-compose.yml` uses `-v host-config:/app/config.yaml`). You expect:
- Admin edits config.yaml on host
- Container detects change and reloads
- Visualization updates

But several things break:
- File watchers (Node.js `fs.watch`) don't work reliably with mounted volumes on macOS (host's FSEvents doesn't signal to container)
- The container sees the file change 5-30 seconds late or not at all
- If admin edits while app is running, file gets partially written; app reads corrupt YAML
- Container restart (via `docker-compose restart`) loses unsaved memory state (in-flight API fetches, cache)
- Permissions: config file written by admin user on host becomes unreadable by container process

**Why it happens:**
Docker on macOS uses Docker Desktop VM with NFS mounts. NFS has eventual consistency; file change notifications are delayed. File watchers assume local filesystem semantics, which don't apply. Admin users don't expect to restart containers; the config-reload promise breaks.

**Consequences:**
- Admin edits config but visualization doesn't update (requires manual container restart)
- App reads partial YAML file during edit, crashes with parse error
- Users think config changes are broken and file bug reports
- Cache becomes unreliable (data fetched before config change is now invalid)
- Setup is fragile: "Works on my machine but not in Docker"

**Prevention:**
1. **Don't rely on file watchers for mounted volumes** — Instead, implement a polling-based reload:
   ```typescript
   const configPath = "/app/config.yaml";
   let configHash = hash(readFileSync(configPath));
   
   setInterval(() => {
     const newHash = hash(readFileSync(configPath));
     if (newHash !== configHash) {
       console.log("Config changed, reloading...");
       reloadConfig();
       configHash = newHash;
     }
   }, 5000); // Poll every 5 seconds
   ```
2. **Implement atomic config writes** — Use a temp file + rename pattern:
   - Admin edits, saves → write to `/tmp/config.new.yaml`
   - Poll detects change → read from stable file
   - On change, app reads from `/tmp/config.new.yaml`, validates, and commits
   - This prevents reading partial files
3. **Clear cache on config reload** — When config changes:
   ```typescript
   reloadConfig() {
     validateNewConfig();
     clearNotionCache();  // Invalidate all cached data
     reloadVisualizations();
   }
   ```
4. **Set proper file permissions in Dockerfile** — Ensure the app process can read config:
   ```dockerfile
   RUN chown -R app:app /app/config/
   RUN chmod 644 /app/config/
   USER app
   ```
5. **Provide a manual reload endpoint (optional)** — If polling is too slow, add a `/reload` endpoint that admin can hit:
   ```
   curl http://localhost:3000/api/admin/reload-config
   ```
6. **Document the setup clearly** — Explain that:
   - Config reload polls every 5 seconds (expected delay)
   - Admin must save file completely before change takes effect
   - First time setup requires `docker-compose up` (config file must exist before container starts)

**Detection:**
- Admin edits config, visualization doesn't change
- Container crashes with YAML parse error during editing
- File is readable on host but "permission denied" in container
- Works on local dev machine but not in Docker

**Phase to address:** Phase 1-2 (Docker setup + config system)
- Phase 1: Design config loading architecture with polling
- Phase 2: Implement and test with real config edits
- If not addressed: Setup becomes frustrating, users blame the app

---

### Pitfall 7: Notion API Token Scope and Invisible Failures

**What goes wrong:**
Notion integration tokens have limited scopes. A token might:
- Have access to Database A but not Database B (user added both to config, but token wasn't authorized for both)
- Have read access to properties but not all property types (some properties are "hidden" from API)
- Have access yesterday but not today (admin revoked token or changed permissions)

The API doesn't clearly indicate "you don't have permission"—it returns empty results. Visualization looks blank, but there's no error message. Users blame the app, not the token.

**Why it happens:**
Notion's token scopes are granular but opaque. Documentation doesn't list "which databases can this token access", so developers assume the token works for all databases listed in config. Notion API returns 200 OK with empty data, not 403 Forbidden, for permission errors.

**Consequences:**
- Visualization is blank but looks like a loading state
- Users think data is missing from Notion, when really it's a permission issue
- No error messages in UI or logs, hard to debug
- Admin doesn't realize token has expired
- Users can't visualize databases they don't have access to, but don't know why

**Prevention:**
1. **Test token scope at startup** — Before rendering, validate the token can access all configured databases:
   ```typescript
   async function validateToken(token, databaseIds) {
     const results = await Promise.all(
       databaseIds.map(id => testDatabaseAccess(token, id))
     );
     const inaccessible = databaseIds.filter((id, i) => !results[i]);
     if (inaccessible.length > 0) {
       throw new Error(
         `Token cannot access databases: ${inaccessible.join(", ")}. ` +
         `Check token scope in Notion integrations page.`
       );
     }
   }
   ```
2. **Log token validation errors prominently** — Don't silently skip missing databases. Show errors on startup:
   ```
   [ERROR] Notion token missing access to databases: goal-tracking, projects
   [ERROR] Visit: https://notion.so/settings/connections to grant access
   [ERROR] App will not start until token scope is fixed
   ```
3. **Provide a diagnostic endpoint** — For admins:
   ```
   curl http://localhost:3000/api/admin/token-status
   Returns: {
     token_valid: false,
     accessible_databases: ["abc123", "def456"],
     requested_databases: ["abc123", "def456", "ghi789"],
     inaccessible: ["ghi789"],
     message: "Token is missing access to 1 database"
   }
   ```
4. **Document token setup in README** — Explain step by step:
   - Create integration in Notion
   - Copy token
   - Add databases to integration (explicit step that users miss!)
   - Paste token in config
   - Run app

**Detection:**
- Visualization is empty (no error messages)
- Some databases show data, others are blank
- No errors in logs or browser console
- Works for one user, not another (different token access)

**Phase to address:** Phase 1 (Notion integration + config)
- Must implement token validation before Phase 2 visualization
- If not addressed: App appears broken with silent failures

---

## Moderate Pitfalls

Common mistakes that cause bugs or performance issues, but not architecture rewrites.

### Pitfall 8: Notion API Caching Without Invalidation Strategy

**What goes wrong:**
You cache Notion data locally (necessary to avoid rate limits). But you don't have a clear strategy for when to invalidate the cache:
- Data is stale but visualization shows it as current
- Admin edits data in Notion but visualization doesn't update for an hour
- Cache persists across container restarts, showing outdated data
- Cache grows unbounded (every fetched object is cached forever)

**Why it happens:**
Caching is a best practice for rate limits. But the caching strategy isn't obvious: when should cache expire? When should it be cleared? It's tempting to say "cache everything forever", but that breaks usability.

**Consequences:**
- Users trust visualization but it shows stale data
- Users make decisions based on outdated information
- Cache files grow large (disk space issues)
- Container takes a long time to restart because cache is huge

**Prevention:**
1. **Implement a TTL strategy**:
   ```typescript
   // Cache objects with explicit TTL
   cache.set(key, value, { ttl: 5 * 60 * 1000 }); // 5 minutes
   
   // On config reload, clear cache
   clearCache();
   
   // On startup, check cache age
   if (cacheAge > 1 hour) {
     clearCache(); // Don't use stale cache from yesterday
   }
   ```
2. **Provide a manual cache clear endpoint** — For admins:
   ```
   curl -X POST http://localhost:3000/api/admin/clear-cache
   ```
3. **Limit cache size** — Don't let cache grow unbounded:
   ```typescript
   const maxCacheSize = 100 * 1024 * 1024; // 100 MB
   if (cacheSize > maxCacheSize) {
     clearCache(); // Nuclear option: clear everything
   }
   ```

**Detection:**
- Notion data changes but visualization doesn't
- Cache directory grows to several GB
- Container startup takes a long time

**Phase to address:** Phase 1-2 (Notion integration)

---

### Pitfall 9: Circular Dependencies in Config Validation

**What goes wrong:**
Your config allows mapping relations (e.g., "Person → Manager → Department → Team"). But users create circular configs:
- "NodeLabel is derived from a relation property that references back to the same database"
- "Edges created from a relation that doesn't point anywhere"

Config validation doesn't catch this, and visualization fails.

**Why it happens:**
Config validation checks that mapped properties exist, but doesn't check if the mapping makes logical sense. Circular logic is hard to detect without a full graph traversal.

**Consequences:**
- App hangs during visualization rendering (infinite loop)
- Memory usage explodes (recursive resolution exhausts stack)
- Cryptic error messages or silent failures

**Prevention:**
1. **Build a config validation graph** — Before rendering, trace the mapping dependencies:
   ```
   - nodeLabel depends on: Title (OK)
   - nodeColor depends on: Status (OK)
   - edgeTarget depends on: Manager (relation to People)
     - Manager.Title → dependency on Title property ✓
   - Circular if: edgeTarget depends on property in same database
   ```
2. **Validate recursion depth limit** — If resolving a mapping requires >5 levels of relation following, fail:
   ```
   Max depth: A → B → C → D → E (4 hops), fail on 6th
   ```

**Detection:**
- App hangs during initial load
- Memory usage grows indefinitely
- "Maximum call stack exceeded" errors

**Phase to address:** Phase 1 (Config validation)

---

### Pitfall 10: Vue Flow Performance Degradation With Large Graphs

**What goes wrong:**
Vue Flow renders well with <100 nodes. Beyond that:
- Re-renders become slow (500ms+ per update)
- Panning/zooming feels laggy
- Browser memory usage grows (each node is a DOM element)
- Layout calculation becomes CPU-intensive

**Why it happens:**
Vue Flow creates a DOM node for each graph node. With 500+ nodes, the DOM tree becomes large. Vue reactivity overhead becomes noticeable. Layout algorithms are O(n²) for edge routing.

**Consequences:**
- App feels sluggish with large datasets
- Browser might crash or become unresponsive
- Users blame the app ("it's slow"), not Vue Flow

**Prevention:**
1. **Limit graph size in config** — Validate that visualization would have <200 nodes:
   ```
   const nodeCount = estimateNodeCount(config);
   if (nodeCount > 200) {
     warn(`Visualization would have ${nodeCount} nodes. Performance may degrade. Consider filtering in Notion config.`);
   }
   ```
2. **Implement node filtering/search** — Let users filter which nodes to display:
   ```
   Show only nodes with Status = "Active" (reduces 500 nodes to 100)
   ```
3. **Use virtual scrolling or pagination** — Don't render all nodes at once.

**Detection:**
- Panning/zooming is slow
- Browser becomes unresponsive after zooming in/out a few times
- Rendering takes >1s per update

**Phase to address:** Phase 3 (Vue Flow optimization)
- Only necessary if actual data exceeds 150 nodes
- Can be deferred to post-launch

---

## Minor Pitfalls

Edge cases and best practices.

### Pitfall 11: Dockerfile Multi-Stage Build Bloat

**What goes wrong:**
Your Dockerfile builds the Nuxt app in the final image, making the image 500MB+ (includes node_modules, build tools). Container takes 2 minutes to pull and start.

**Prevention:**
1. **Use multi-stage builds**:
   ```dockerfile
   FROM node:20-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build

   FROM node:20-alpine
   WORKDIR /app
   COPY --from=builder /app/.output ./
   COPY --from=builder /app/package*.json ./
   RUN npm ci --production
   COPY config/ ./config/
   EXPOSE 3000
   CMD ["node", ".output/server/index.mjs"]
   ```

**Phase to address:** Phase 1 (Docker setup)

---

### Pitfall 12: Config File Encoding Issues

**What goes wrong:**
Admin edits config.yaml on Windows with UTF-16 encoding. Container (Linux) reads it as UTF-8, gets garbage characters or fails to parse.

**Prevention:**
1. **Validate file encoding on read**:
   ```typescript
   const content = readFileSync(configPath, 'utf-8');
   // Throws if invalid UTF-8
   ```
2. **Document in README**: "Save config files as UTF-8 (not UTF-16 or ANSI)"

**Detection:**
- YAML parse errors with weird character messages
- Works on one OS, fails on another

**Phase to address:** Phase 1 (Config system)

---

## Phase-Specific Warnings

| Phase | Topic | Likely Pitfall | Mitigation |
|-------|-------|---------------|-----------|
| Phase 1 | Notion API integration | Relation resolution N+1 queries | Design breadth-first fetching upfront; test with realistic data |
| Phase 1 | Config schema | Property type mismatches | Validate config against actual database schema on startup |
| Phase 1 | Config design | Scope creep | Decide max scope (columns to fields only) before implementation |
| Phase 1 | Docker setup | Volume mount file watching | Use polling instead of fs.watch for config hot reload |
| Phase 1 | Token setup | Silent failures | Validate token scope at startup; provide diagnostic endpoint |
| Phase 2 | Metroviz integration | Graph layout constraints | Test with real data; implement fallback for non-metro graphs |
| Phase 2 | Vue Flow | Node ID collisions | Namespace IDs by database; implement sync validation |
| Phase 2 | Vue Flow | State synchronization | Explicitly sync Vue Flow state after data refresh |
| Phase 3 | Vue Flow | Performance degradation | Monitor node count; implement filtering if >150 nodes |
| Phase 3 | Notion cache | Stale data | Implement TTL-based expiration; clear on config reload |

---

## Prevention Checklist for Each Phase

### Phase 1 (Core Integration)
- [ ] Notion fetching: Design breadth-first relation resolution
- [ ] Notion fetching: Implement query budget and rate-limit protection
- [ ] Config validation: Check property names and types against actual schema
- [ ] Config design: Document scope boundaries (no transforms, max relation depth)
- [ ] Docker: Implement polling-based config reload (not file watch)
- [ ] Docker: Set correct file permissions for container
- [ ] Notion: Validate token scope at startup
- [ ] Notion: Implement local caching with TTL strategy
- [ ] Testing: Use realistic Notion data (>1000 rows, 3+ databases)

### Phase 2 (Visualization)
- [ ] Metroviz: Test with actual Notion data; implement constraints validation
- [ ] Metroviz: Build fallback visualization for non-metro graphs
- [ ] Vue Flow: Design node ID strategy (namespace by database)
- [ ] Vue Flow: Implement sync contract for data refresh
- [ ] Vue Flow: Test data refresh scenarios
- [ ] Config: Validate circular dependencies in mappings

### Phase 3 (Optimization & Polish)
- [ ] Vue Flow: Monitor performance with actual dataset size
- [ ] Vue Flow: Implement filtering if node count >150
- [ ] Notion cache: Monitor cache size growth
- [ ] Documentation: Provide troubleshooting guide for common errors

---

## Sources

**Notion API:**
- Official Notion API documentation (developers.notion.com) — Rate limits, pagination, property types
- Notion API issues on GitHub — Common integration problems

**Vue/Nuxt:**
- Vue Flow documentation — Node/edge state management, performance considerations
- Nuxt documentation — SSR considerations, build optimization

**Docker:**
- Docker documentation — Volume mount semantics on macOS, file permissions
- Common Docker patterns — Multi-stage builds, health checks

**General:**
- Personal experience patterns from Notion-based tools and config-driven systems
- API integration best practices (batching, caching, validation)
