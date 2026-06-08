# Phase 5: Mermaid Diagram Templates - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-08
**Phase:** 05-mermaid-diagrams
**Areas discussed:** Template location, UI surface, Data binding syntax, Config lifecycle, Database reference

---

## Template location

| Option | Description | Selected |
|--------|-------------|----------|
| Separate .mmd files in config/ | Admin creates config/my-diagram.mmd files with frontmatter for data bindings. Clean, editable, supports multiple diagrams. | ✓ |
| Inline in sources.json/yaml | Template string as a field in the existing sources config. Simpler but awkward for multi-line templates. | |
| Dedicated templates/ subfolder | config/templates/my-diagram.mmd — explicit separation from data sources config. | |

**User's choice:** Separate .mmd files in config/
**Notes:** Consistent with existing config mount model; admin edits on host filesystem.

---

## UI surface

| Option | Description | Selected |
|--------|-------------|----------|
| Third viz type on source pages | If a source has a .mmd template, 'Mermaid' appears as a viz type selector option. | — |
| Dedicated Mermaid page | Separate /mermaid route listing all defined templates. | |
| Dashboard card per template | Each .mmd file shows as its own card on the main dashboard. | |

**User's choice:** Each .mmd template has a `title` in frontmatter. That title appears as the viz type label in the selector for the sources the template references.
**Notes:** More specific than the options presented — the viz type label is the template's own title, not a generic "Mermaid" label.

---

## Data binding syntax

| Option | Description | Selected |
|--------|-------------|----------|
| Handlebars-style: {{title}}, {{#each items}} | Familiar templating syntax. Supports loops over database rows. | ✓ |
| Simple placeholder: {title}, {date} | Simpler syntax, but harder to express loops over multiple rows. | |
| YAML-defined mappings, no templating | Frontmatter fully defines what goes where — less flexible. | |

**User's choice:** Handlebars-style
**Notes:** Enables full iteration over database rows, which is needed for Gantt charts and similar multi-row diagrams.

---

## Config lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| Admin only, requires container restart | Consistent with existing config model. | ✓ |
| Admin only, hot-reload without restart | App watches config/ for .mmd file changes. | |
| Loaded per-request (no caching) | Template re-read from disk on every diagram load. | |

**User's choice:** Admin only, requires container restart
**Notes:** Explicit preference to keep the config-file + restart model consistent across the whole app.

---

## Database reference

| Option | Description | Selected |
|--------|-------------|----------|
| By source name from sources.json | sources: [tasks, milestones] — reuses names already defined in config. | ✓ |
| By raw Notion database ID | Self-contained template, but duplicates IDs already in sources.json. | |
| Either, template declares which | Flexible but more complex to implement. | |

**User's choice:** By source name from sources.json
**Notes:** Avoids duplicating database IDs; keeps templates coupled to the named sources already configured.

---

## Claude's Discretion

- Handlebars implementation: lightweight library vs custom tokenizer
- Mermaid.js loading strategy: CDN vs npm package
- Error display approach in the diagram area

## Deferred Ideas

- Hot-reload of templates without restart — future enhancement
- Admin UI for template editing — out of scope
- Template validation CLI tooling — nice-to-have
