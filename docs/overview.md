# vizu-notion-local

Render Notion databases as interactive metro maps, process flow diagrams, or fully custom [Mermaid](https://mermaid.js.org/) diagrams — self-hosted, config-driven, no code required. Point it at your Notion databases, define column mappings in a JSON file, and get visual diagrams in your browser.

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

## Mermaid Diagram Templates

Any [Mermaid diagram type](https://mermaid.js.org/intro/) — Gantt, flowchart, sequence, ER, mindmap, and more — can be rendered from a template file that pulls live data from your Notion sources.

**1. Create a template file**

Add a `.mmd` file inside `config/`. The filename (without extension) becomes the template ID.

```
config/
  sources.json
  sprint-gantt.mmd      ← template ID: sprint-gantt
  data-model.mmd        ← template ID: data-model
```

**2. Write the template**

Templates are [Handlebars](https://handlebarsjs.com/) files that produce valid Mermaid syntax. Available variables depend on the sources you declare in the template's frontmatter.

```
---
title: Sprint Gantt
sources:
  - Project Milestones
---
gantt
  dateFormat YYYY-MM-DD
  {{#each Project Milestones}}
  {{this.title}} : {{this.startDate}}, {{this.endDate}}
  {{/each}}
```

Inside `{{#each SourceName}}`, each row is a flat object whose keys are the `columnMappings` roles from `sources.json` (e.g. `title`, `date`, `status`) plus `id` (always present). Rows are filtered by the node-visibility selection the user has applied in the UI — hidden nodes are excluded from the Handlebars context automatically.

**3. Restart**

```bash
docker compose restart
```

The template appears on the dashboard under each source it references. Clicking it opens the rendered diagram with filter, SVG export, and share-link support.

**Mermaid diagram types**: [mermaid.js.org/intro](https://mermaid.js.org/intro/) lists all supported diagram types and their syntax.

---

## Troubleshooting

**502 on data fetch** — token not reaching the container. Ensure `.env` has `NOTION_API_TOKEN=secret_...` and the integration is shared with your databases (database → Share → invite integration).

**Empty dashboard** — `config/sources.json` not found or misconfigured. Check database IDs (32-char hex, no hyphens) and that column names match exactly.

**Share links 404 after restart** — `./data` not writable: `chmod 777 ./data`.
