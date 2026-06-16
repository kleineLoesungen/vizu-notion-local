# vizu-notion-local

> Render Notion databases as interactive metro maps, process flow diagrams, or custom Mermaid diagrams — config-driven, self-hosted, no code changes required.

## Features

- **Metro map visualization** — Hierarchical Notion databases (goals → projects → tasks) rendered as metro-line style diagrams
- **Process flow diagrams** — Sequential/workflow databases rendered as node-edge flow charts
- **Custom Mermaid diagrams** — Drop a `.mmd` template file into `config/`, restart, and any [Mermaid diagram type](https://mermaid.js.org/intro/) renders with live Notion data
- **Config-driven** — Define sources and column mappings in a JSON file; restart container to apply
- **Share links** — Copy a short URL that restores the exact view (hidden nodes, active sources, viz type) for anyone on your local network
- **Fully local** — Single `docker compose up`, your Notion token stays server-side, no cloud relay

## Prerequisites

- Docker and Docker Compose installed
- A Notion integration token ([create one here](https://www.notion.so/my-integrations))
- Notion database IDs for the databases you want to visualize

## Quick Start

**Step 1:** Copy `.env.example` to `.env` and set your Notion integration token:

```bash
cp .env.example .env
# Edit .env — set NOTION_API_TOKEN=secret_...
```

**Step 2:** Copy `config/sources.example.json` to `config/sources.json` and fill in your database IDs and column mappings:

```bash
cp config/sources.example.json config/sources.json
# Edit config/sources.json with your Notion database IDs and column names
```

**Step 3:** Create the data directory for share link persistence:

```bash
mkdir -p ./data && chmod 777 ./data
```

**Step 4:** Build and start:

```bash
make run        # builds image + starts container
# or directly:
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000).

> On subsequent runs `docker compose up` (or `make run`) is enough unless you change application code.

---

## Configuration Reference

### `config/sources.json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `databaseId` | string | Yes | Notion database ID (32-char hex from the database URL) |
| `name` | string | Yes | Display name shown in the UI |
| `columnMappings` | object | Yes | Maps role names to Notion property/column names |

### columnMappings roles — Metro Map

A source is eligible for metro map when it has **both** `date` and `next` in `columnMappings`.

| Role | Required | Notion Type | Description |
|------|----------|-------------|-------------|
| `date` | **Yes** | Date | Positions each entry on the timeline x-axis |
| `next` | **Yes** | Relation | Points to the next entry — defines how metro lines connect |
| `title` | Recommended | Title | Station label (falls back to entry ID if omitted) |
| `parent` | Optional | Relation | Groups entries under a parent label when `tag` is not defined |
| `tag` | Optional | Select / Text | Groups entries into labeled zone bands (section headers) |
| `status` | Optional | Select / Status | Enables status-based filtering in the sidebar |

### columnMappings roles — Flow Diagram

A source is eligible for flow diagram when it has **`next`** in `columnMappings`.

| Role | Required | Notion Type | Description |
|------|----------|-------------|-------------|
| `next` | **Yes** | Relation | Points to the next node — creates directed edges |
| `title` | Recommended | Title | Node label (falls back to entry ID if omitted) |
| `status` | Optional | Select / Status | Shown as a sub-label on each node |
| `date` | Optional | Date | Shown as a sub-label on each node |
| `assignee` | Optional | People | Shown as a sub-label on each node |

**Visualization type auto-detection:**
- `next` only → flow diagram eligible
- `date` + `next` → metro map eligible (can also toggle to flow)
- When both types are available, metro map is shown by default

**Mapping `next` from Notion:** The `next` role maps to any Relation property that points forward. Notion's built-in **Dependencies** feature creates a "Blocked by" / "Blocking" pair automatically — map `next` to the forward direction (e.g. `"next": "Blocking"`).

→ [Notion docs: Dependencies](https://www.notion.so/help/timeline-and-dependencies)

### Mermaid Diagram Templates

Create a `.mmd` file in `config/` to define a custom Mermaid diagram. Any `.mmd` file found at startup is loaded automatically — no code changes required.

**File format:**

```
---
title: "My Diagram"
sources:
  - source-name
---
flowchart TD
  {{#each source-name}}
  {{title}} --> {{status}}
  {{/each}}
```

**Frontmatter fields:**

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Label shown in the viz type selector for this diagram |
| `sources` | string[] | Source names (from `sources.json`) whose data this template can use |

**Handlebars bindings:**

| Syntax | What it does |
|--------|-------------|
| `{{fieldName}}` | Outputs a full Mermaid node definition: `nXXXXXX["value"]` — the ID is a stable hash of the field name and value. Works at top level and inside `{{#each}}` blocks (bare `fieldName` resolves as `this.fieldName` in Handlebars). |
| `{{this.fieldName}}` | Inside `#each`, outputs the **raw field value** as a plain string — no node ID wrapping. Use this for data that isn't a Mermaid node (e.g. Gantt task labels, date strings, section names). |
| `{{#each source-name}} … {{/each}}` | Iterates over all visible rows from the named source |
| `{{this.id}}` | Inside `#each`, the raw Notion page ID string — available without a `columnMappings` entry |
| `{{@index}}` | Inside `#each`, the zero-based iteration index |
| `{{@first}}` | Inside `#each`, boolean `true` on the first iteration |
| `{{#if fieldName}} … {{/if}}` | Renders the block only when `fieldName` is truthy (non-empty string, non-null). Use to skip edges or labels for rows where an optional field isn't set. |
| `{{#unless condition}} … {{/unless}}` | Renders the block only when `condition` is falsy |
| `{{#each (group sourceName "fieldName")}} … {{/each}}` | Groups all rows from `sourceName` by the distinct values of `fieldName`. Each iteration context has `{{fieldName}}` (the group key, rendered as a Mermaid node) and `{{this.fieldName}}` (the raw key string). |
| `{{#group-item}} … {{/group-item}}` | Inside a `(group …)` each block: iterates every row belonging to the current group. Inner context is the individual row — `{{fieldName}}` and `{{this.fieldName}}` work the same as inside a plain `{{#each}}` block. |
| `{{palette @index}}` | Inside `{{#each (group …)}}`, returns a hex color string from a 10-color accessible palette (Tableau 10), cycling by group index. Use in `classDef` lines to auto-assign a distinct color per attribute value group. |
| `{{#each (join-rows SourceA "fieldA" SourceB "fieldB" "prefix")}} … {{/each}}` | Joins two source arrays into flat merged rows for edge generation. For each row in `SourceA`, finds all rows in `SourceB` where `rowB[fieldB] === rowA[fieldA]`. Inside the block, all `SourceA` fields are available unchanged (`{{title}}`, `{{project}}`, …) and all `SourceB` fields are available with the prefix (`{{prefix_title}}`, `{{prefix_milestone}}`, …). Left-join: `SourceA` rows with no `SourceB` match pass through as-is. Use for edges that span two databases. |
| `{{#each (lookup-by SourceArray "field" value)}} … {{/each}}` | Filters `SourceArray` to rows where `row[field] === value` and iterates them in a **nested** block. Inside the inner block, `{{fieldName}}` refers to the matched row; the outer row's fields are accessible via `{{../fieldName}}` (raw string — not rewritten to a Mermaid node ID). Use for block/subgraph layouts that place related items inside a container, not for drawing edges between outer and inner nodes. |

**Frontmatter node styling (`styles` key):**

Add a `styles` block to any template's frontmatter to define shape and color per attribute — no changes to the template body needed:

```yaml
---
title: "My Diagram"
sources:
  - Projekte
styles:
  parent:
    shape: rounded
    fill: "#4e79a7"
    stroke: "#2d5a8e"
    stroke-width: 2
  title:
    shape: rectangle
    fill: "#ffffff"
---
flowchart TD
{{#each Projekte}}
  {{title}} --> {{parent}}
{{/each}}
```

Each key under `styles` is an attribute name (a `columnMappings` role). All fields are optional:

| Field | Values | Effect |
|-------|--------|--------|
| `shape` | `rectangle` (default), `rounded`, `circle`, `cylindrical`, `diamond`, `stadium` | Changes the Mermaid bracket syntax for nodes of this attribute |
| `fill` | CSS color string, e.g. `"#4e79a7"` | Background color of the node |
| `stroke` | CSS color string | Border color |
| `stroke-width` | Number (pixels) | Border thickness |

When `fill`, `stroke`, or `stroke-width` is set, the engine auto-generates `classDef` lines and appends `:::style-{attrName}` to affected nodes. Shape-only entries change brackets without adding a CSS class.

> Field names come from `columnMappings` keys in `sources.json`, **not** raw Notion property names.

> **Node IDs are stable and value-based.** `{{title}}` and `{{next}}` referencing the same text always produce the same node ID — regardless of which field they come from. This means a project listed as `{{title}}` in one row and referenced as `{{next}}` in another row's edge will correctly collapse to a single node in the diagram, with no duplicates.

> **Rows and node visibility:** Each row inside `{{#each source-name}}` is a flat object whose keys are the `columnMappings` roles (`title`, `date`, `status`, etc.) plus `id` (always present). Rows are filtered by the node-visibility selection the user has applied in the filter panel — hidden nodes are excluded from the Handlebars context automatically, so the rendered diagram reflects the panel state without any extra logic in the template.

> **Multi-value relation fields auto-expand.** When a Notion relation property contains multiple targets (e.g. a project linked to two parent categories), the row is automatically expanded into one row per target before the template runs. This means `{{title}} --> {{parent}}` produces one edge per related page — no template changes required. Grouping by a relation field (e.g. `{{#each (group sourceName "parent")}}`) likewise creates one group per relation target value.

> **Note:** No arithmetic or comparison helpers are registered. If you need a computed value (e.g. a formatted date or number), add a Notion formula column to your database, map it in `columnMappings`, and reference it with `{{this.fieldName}}`.

**Multi-source templates:** list multiple sources in `sources:` and use a separate `{{#each}}` block per source in the template body.

**Cross-source joins with `join-rows`:** generates edges that span two databases by producing flat merged rows where every field from both databases is available in a single `{{#each}}` context.

```yaml
---
title: "Goals to Milestones"
sources:
  - GoalsDB      # has a "project" relation → ProjectsDB
  - ProjectsDB   # has a "milestone" relation → MilestonesDB
---
flowchart TD
{{#each (join-rows GoalsDB "project" ProjectsDB "title" "proj")}}
{{title}} --> {{proj_milestone}}
{{/each}}
```

The merged row for a Goal linked to ProjectX contains:
- `{{title}}` — the goal's title (from GoalsDB)
- `{{project}}` — the matched project title (from GoalsDB)
- `{{proj_title}}` — the project's title (from ProjectsDB, prefixed)
- `{{proj_milestone}}` — the project's milestone (from ProjectsDB, prefixed)
- `{{proj_status}}` — any other ProjectsDB field, prefixed

Multi-value relations auto-expand before the helper runs: if a goal links to 2 projects and each project links to 2 milestones, `join-rows` produces 4 merged rows → 4 edges automatically.

**Nested iteration with `lookup-by`:** filters a source array to matching rows and iterates them in a nested block. Use this for block/subgraph layouts (not edges — `{{../title}}` in the inner context is raw text, not a node ID).

```yaml
---
title: "Goals with their Projects"
sources:
  - GoalsDB
  - ProjectsDB
---
flowchart TD
{{#each GoalsDB}}
subgraph {{title}}
{{#each (lookup-by ProjectsDB "title" project)}}
{{title}}
{{/each}}
end
{{/each}}
```

Inside `{{#each (lookup-by ProjectsDB "title" project)}}`, `{{title}}` is the matched project's title. The outer goal's fields are accessible via `{{../title}}` as plain strings (useful for labels, not for drawing edges to them).

**Error handling:** invalid templates (unknown source name, bad Mermaid syntax) show an error message in the diagram area and log details to the container console. The container does not crash — fix the template and restart.

See `config/mermaid.example.mmd` for an annotated starting point.

**Diagram interactions:**
- **Filter panel** — toggle individual nodes on/off; nodes grouped by source with group-level select/deselect
- **Show related** — click the link icon next to any node to focus on that node and its 1-hop Notion-relation neighbours; click again to reset
- **Zoom / pan** — Ctrl+scroll to zoom, drag to pan
- **Export** — download the rendered diagram as an SVG file
- **Share link** — copy a URL that restores the current filter and template selection

### Example `sources.json`

```json
{
  "sources": [
    {
      "databaseId": "your-notion-database-id-here",
      "name": "Project Milestones",
      "columnMappings": {
        "title": "Name",
        "date": "Due Date",
        "next": "Next Milestone",
        "parent": "Project",
        "tag": "Team",
        "status": "Status"
      }
    },
    {
      "databaseId": "another-database-id-here",
      "name": "Task Flow",
      "columnMappings": {
        "title": "Task Name",
        "next": "Blocked By",
        "status": "Status"
      }
    }
  ]
}
```

---

## Makefile Commands

```bash
make help       # list all targets
make run        # docker compose up --build (build + start)
make stop       # docker compose down
make dev        # nuxt dev (local development, no Docker)
make build      # build Docker image only
make publish DOCKER_HUB_USER=you   # build multi-arch (amd64 + arm64) and push to Docker Hub
```

## Architecture

- **Nuxt 3 server routes** proxy all Notion API calls — your integration token is never exposed to the browser
- **LRU memory cache** (1-hour TTL) reduces redundant API calls and respects Notion's 3 req/s rate limit
- **`./config`** mounted read-only — edit `sources.json` and `.mmd` templates, then restart to apply changes
- **`./data`** mounted read-write — stores `shares.json` for share link persistence

### docker-compose.yml

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    volumes:
      - ./config:/app/config:ro
      - ./data:/app/data:rw
    environment:
      NODE_ENV: production
      NUXT_NOTION_API_TOKEN: ${NOTION_API_TOKEN}
    env_file:
      - .env
    restart: unless-stopped
```

> **Why `NUXT_NOTION_API_TOKEN`?** Nuxt reads `runtimeConfig` overrides at runtime via env vars prefixed `NUXT_`. The value comes from `NOTION_API_TOKEN` in your `.env` file — you don't need to rename anything.

---

## Troubleshooting

**502 Bad Gateway on data fetch / "NOTION_API_TOKEN is not set"**

- Ensure `.env` exists and contains `NOTION_API_TOKEN=secret_...`
- Verify the integration has been shared with the target databases (database → Share → invite integration)
- If you edited `docker-compose.yml` manually, confirm the `NUXT_NOTION_API_TOKEN` environment entry is present

**Container exits immediately / "Invalid config" error**

- Ensure `config/sources.json` exists (copy from `config/sources.example.json`)
- Verify all `databaseId` values are 32-character hex strings (remove hyphens from the Notion URL)
- Check that each property name in `columnMappings` matches the exact column name in your Notion database

**Share links return 404 after container restart**

- `./data/shares.json` must be present and the directory writable by the container: `chmod 777 ./data`

**Blank diagram / no data**

- Use **Fetch All** on the dashboard to trigger a fresh Notion API call
- Check the browser console for API errors
- Confirm the Notion integration has read access to all configured databases

**Mermaid template shows an error message**

- Check the template syntax against the [Mermaid docs](https://mermaid.js.org/intro/) for the diagram type you're using
- Verify every source name in `sources:` exactly matches a `name` in `sources.json`
- Check the container log (`docker compose logs app`) for the detailed parse error

**Debugging a Mermaid template — seeing the rendered output before Mermaid parses it**

Open `http://localhost:3000/api/mermaid/<templateId>` in your browser (replace `<templateId>` with your `.mmd` filename without the extension). The JSON response contains:

- `diagramString` — the full Mermaid diagram text after Handlebars substitution; paste this into [mermaid.live](https://mermaid.live) to validate syntax and see what values each field resolved to
- `rows` — the id and title of every node the FilterPanel will show

Common issues visible in `diagramString`:
- A node with an empty label (`nXXXXXX[""]`) — a relation field that isn't set on that row; guard it with `{{#if fieldName}} … {{/if}}`
- A node appearing with the wrong label — check the `columnMappings` key name matches what you used in the template

**Port 3000 already in use**

- Change the host port in `docker-compose.yml`: `"3001:3000"` and visit [http://localhost:3001](http://localhost:3001)
