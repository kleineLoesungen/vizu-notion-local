# vizu-notion-local

Render Notion databases as interactive metro maps, process flow diagrams, or fully custom [Mermaid](https://mermaid.js.org/) diagrams — self-hosted, config-driven, no code required.

---

## Quick Start

**1.** Create `config/sources.json`:

```json
{
  "sources": [
    {
      "databaseId": "your-32-char-notion-database-id",
      "name": "My Source",
      "columnMappings": {
        "title": "Name",
        "date": "Due Date",
        "next": "Next Milestone",
        "status": "Status"
      }
    }
  ]
}
```

The `databaseId` is the 32-character hex string from the Notion database URL. `columnMappings` maps role names (used in templates and filtering) to the exact column names in your Notion database. A source with both `date` and `next` renders as a metro map; `next` alone renders as a flow diagram.

Create a `.env` with your Notion token:

```env
NOTION_API_TOKEN=secret_your_token_here
```

**2.** Create a `docker-compose.yml`:

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

**3.** Start:

```bash
mkdir -p ./data && chmod 777 ./data
docker compose up
```

Open [http://localhost:3000](http://localhost:3000).

---

For full configuration reference, Mermaid template syntax, column mapping roles, and troubleshooting, see the [GitHub README](https://github.com/sebastianwiller/vizu-notion-local).
