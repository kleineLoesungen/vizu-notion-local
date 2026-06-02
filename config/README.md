# Config Directory

This directory contains configuration files that define which Notion databases to visualize.

## Quick Start

1. Copy the example config:
   ```bash
   cp sources.example.json sources.json
   ```

2. Edit `sources.json`:
   - Replace `"databaseId"` values with your actual Notion database IDs
   - Set `"name"` to a human-readable label for each source
   - Update `"columnMappings"` to match your database's actual property names

3. Put your Notion Integration Token in the `.env` file at the project root:
   ```
   NOTION_API_TOKEN=secret_your-integration-token-here
   ```
   **Important:** The token goes in `.env`, NOT in `sources.json`. Keep secrets out of config files.

4. Restart the container to apply changes:
   ```bash
   docker-compose restart
   ```

## Getting Your Notion Database ID

The database ID is the part of the Notion URL after the workspace name and before any `?`:

```
https://www.notion.so/myworkspace/a8f0b4cd1e2f3a4b5c6d7e8f9a0b1c2d?v=...
                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                  This is your database ID (32 hex chars)
```

## Getting a Notion Integration Token

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Give it a name (e.g., "vizu-notion-local")
4. Set capabilities to "Read content" only
5. Copy the "Internal Integration Token" (starts with `secret_`)
6. Share each database with this integration (open database → "..." menu → "Add connections")

## columnMappings

The `columnMappings` object maps logical roles to your actual Notion property names.
The property names must exactly match what appears as column headers in Notion.

Example: If your database has a column called "Project Name", use `"Project Name"` (not "project_name" or "name").

## sources.json Format

```json
{
  "sources": [
    {
      "databaseId": "32-character-hex-id",
      "name": "Human-readable name",
      "columnMappings": {
        "role": "Notion Property Name"
      }
    }
  ]
}
```

## Notes

- `sources.json` is gitignored — it stays on your machine and is never committed to version control
- The container mounts this directory read-only at `/app/config`
- Config is loaded once at container startup; restart after any changes
- Relations pointing to databases not listed in `sources.json` are silently skipped
