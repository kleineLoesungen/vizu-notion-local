# vizu-notion-local

> Render Notion databases as interactive metro maps and process flow diagrams — config-driven, self-hosted, no code changes required.

## Features

- **Metro map visualization** — Hierarchical Notion databases (goals → projects → tasks) rendered as metro-line style diagrams using Metroviz
- **Process flow diagrams** — Sequential/workflow databases rendered as node-edge flow charts using Vue Flow
- **Config-driven** — Define sources and column mappings in a JSON file; restart container to apply
- **Fully local** — Single `docker-compose up`, your Notion token stays server-side, no cloud relay

## Prerequisites

- Docker and Docker Compose installed
- A Notion integration token ([create one here](https://www.notion.so/my-integrations))
- Notion database IDs for the databases you want to visualize

## Quick Start

**Step 1:** Copy `.env.example` to `.env` and set your Notion integration token:

```bash
cp .env.example .env
# Edit .env and set NOTION_API_TOKEN=secret_...
```

**Step 2:** Copy `config/sources.example.json` to `config/sources.json` and fill in your database IDs and column mappings:

```bash
cp config/sources.example.json config/sources.json
# Edit config/sources.json with your Notion database IDs and column names
```

**Step 3:** Start the app and open [http://localhost:3000](http://localhost:3000):

```bash
docker-compose up
```

### docker-compose.yml (for reference)

```yaml
version: '3.9'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    volumes:
      - ./config:/app/config:ro
    environment:
      NODE_ENV: production
      NOTION_API_TOKEN: ${NOTION_API_TOKEN}
    env_file:
      - .env
    restart: unless-stopped
```

## Configuration Reference

### Config file: `config/sources.json`

Mount path: `/app/config/sources.json`

### Source object fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `databaseId` | string | Yes | Notion database ID (32-char hex from the database URL) |
| `name` | string | Yes | Display name shown in the UI source switcher |
| `columnMappings` | object | Yes | Maps role names to Notion property/column names |

### columnMappings roles

| Role | Type | Viz Type | Description |
|------|------|----------|-------------|
| `title` | string | Both | Maps to the primary Notion title property (e.g. "Name") |
| `status` | string | Both | Maps to a Notion Select or Status property for filtering |
| `parent` | string | Metro | Maps to a Notion Relation property pointing to parent entries — enables metro map hierarchy |
| `children` | string | Metro | Maps to a Notion Relation property pointing to child entries |
| `relatedGoal` | string | Metro | Maps to any cross-database Relation property to link entries |
| `assignee` | string | Flow | Maps to a People property |
| `sequence` | string | Flow | Maps to a Number property for ordering flow nodes |

**Visualization type auto-detection:**
- A source with `parent` or `children` in columnMappings is eligible for metro map
- A source with `sequence` in columnMappings is eligible for process flow

### Example sources.json

```json
{
  "sources": [
    {
      "databaseId": "your-notion-database-id-here",
      "name": "My Goals",
      "columnMappings": {
        "title": "Name",
        "status": "Status",
        "parent": "Parent Goal",
        "children": "Sub-Goals"
      }
    },
    {
      "databaseId": "another-database-id-here",
      "name": "My Projects",
      "columnMappings": {
        "title": "Project Name",
        "status": "Status",
        "assignee": "Owner",
        "relatedGoal": "Goal"
      }
    }
  ]
}
```

## Architecture

- **Nuxt 3 server routes** proxy all Notion API calls — your integration token is never exposed to the browser
- **LRU memory cache** (1-hour TTL) reduces redundant API calls and respects Notion's 3 req/s rate limit
- **Config-driven** — no application code changes needed; only `config/sources.json` and `.env`

## Troubleshooting

**Container exits immediately / "Invalid config" error**

- Ensure `config/sources.json` exists (copy from `config/sources.example.json`)
- Verify all `databaseId` values are 32-character hex strings (remove hyphens from Notion URL ID)
- Check that each property name in `columnMappings` matches the exact column name in your Notion database

**"NOTION_API_TOKEN not set" error**

- Ensure `.env` exists and contains `NOTION_API_TOKEN=secret_...`
- Verify your Notion integration has been shared with the target databases (database → Share → invite integration)

**Blank diagram / no data loads**

- Check browser console for API errors
- Use the "Fetch All" button on the dashboard to trigger a fresh Notion API fetch
- Confirm the Notion integration has read access to all configured databases

**Port 3000 already in use**

- Change the host port in `docker-compose.yml`: `"3001:3000"` and visit [http://localhost:3001](http://localhost:3001)
