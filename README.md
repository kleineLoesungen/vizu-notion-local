# vizu-notion-local

> Render Notion databases as interactive metro maps and process flow diagrams — config-driven, self-hosted, no code changes required.

## Features

- **Metro map visualization** — Hierarchical Notion databases (goals → projects → tasks) rendered as metro-line style diagrams
- **Process flow diagrams** — Sequential/workflow databases rendered as node-edge flow charts
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
  {{this.title}}
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
| `{{fieldName}}` | Inserts a scalar value from the top-level context; `fieldName` is a `columnMappings` key (e.g. `title`, `status`) or `id` (Notion page ID, always available) |
| `{{#each source-name}} … {{/each}}` | Iterates over all rows from the named source |
| `{{this.fieldName}}` | Inside `#each`, accesses a field on the current row |
| `{{this.id}}` | Inside `#each`, the Notion page ID — available without a `columnMappings` entry; useful for stable unique node IDs |
| `{{@index}}` | Inside `#each`, the zero-based iteration index (useful for unique node IDs) |
| `{{@first}}` | Inside `#each`, boolean `true` on the first iteration — useful with `#unless` to skip leading separators |
| `{{#unless condition}} … {{/unless}}` | Renders the block only when `condition` is falsy — commonly used with `@first` to suppress the first separator or arrow |

> Field names come from `columnMappings` keys in `sources.json`, **not** raw Notion property names.

> **Note:** No arithmetic or comparison helpers are registered. If you need a computed value (e.g. an index starting at 1, or a formatted number), add a Notion formula column to your database, map it in `columnMappings`, and reference it with `{{this.fieldName}}`.

**Multi-source templates:** list multiple sources in `sources:` and use a separate `{{#each}}` block per source in the template body.

**Error handling:** invalid templates (unknown source name, bad Mermaid syntax) show an error message in the diagram area and log details to the container console. The container does not crash — fix the template and restart.

See `config/mermaid.example.mmd` for an annotated starting point.

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
- **`./config`** mounted read-only — edit `sources.json` and restart to apply changes
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

**Port 3000 already in use**

- Change the host port in `docker-compose.yml`: `"3001:3000"` and visit [http://localhost:3001](http://localhost:3001)
