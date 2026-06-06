# vizu-notion-local

Render Notion databases as interactive metro maps and process flow diagrams — self-hosted, config-driven, no code required. Point it at your Notion databases, define column mappings in a JSON file, and get visual diagrams in your browser.

---

## Requirements

- Docker and Docker Compose
- A Notion integration token → [notion.so/my-integrations](https://www.notion.so/my-integrations)
- The database IDs you want to visualize (32-char hex from the Notion database URL)

---

## Setup

**1. Create your config files**

Create a `config/sources.json` file:

```json
{
  "sources": [
    {
      "databaseId": "your-32-char-notion-database-id",
      "name": "Project Milestones",
      "columnMappings": {
        "title": "Name",
        "date": "Due Date",
        "next": "Next Milestone",
        "tag": "Team",
        "status": "Status"
      }
    }
  ]
}
```

Create a `.env` file:

```env
NOTION_API_TOKEN=secret_your_token_here
```

Create the data directory for share link storage:

```bash
mkdir -p ./data && chmod 777 ./data
```

**2. Create a `docker-compose.yml`**

```yaml
services:
  app:
    image: sebastianwiller/vizu-notion-local:latest
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

**3. Start**

```bash
docker compose up
```

Open [http://localhost:3000](http://localhost:3000).

---

## Column Mapping Roles

### Metro Map (requires `date` + `next`)

| Role | Notion Type | Description |
|------|-------------|-------------|
| `title` | Title | Station label |
| `date` | Date | Timeline position |
| `next` | Relation | Forward link between entries |
| `parent` | Relation | Groups entries under a parent |
| `tag` | Select / Text | Zone band label |
| `status` | Select / Status | Sidebar filter |

### Flow Diagram (requires `next`)

| Role | Notion Type | Description |
|------|-------------|-------------|
| `title` | Title | Node label |
| `next` | Relation | Creates directed edges |
| `status` | Select / Status | Sub-label on node |
| `date` | Date | Sub-label on node |
| `assignee` | People | Sub-label on node |

A source with both `date` and `next` is eligible for both diagram types.

---

## Troubleshooting

**502 on data fetch** — token not reaching the container. Ensure `.env` has `NOTION_API_TOKEN=secret_...` and the integration is shared with your databases (database → Share → invite integration).

**Empty dashboard** — `config/sources.json` not found or misconfigured. Check database IDs (32-char hex, no hyphens) and that column names match exactly.

**Share links 404 after restart** — `./data` not writable: `chmod 777 ./data`.
