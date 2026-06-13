# Phase 5: Mermaid Diagram Templates - Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin-defined Mermaid diagram templates that bind to live Notion data from configured sources, rendered client-side via mermaid.js. Each template becomes a selectable viz type in the existing source selector.

Creating or editing templates requires a container restart — consistent with the existing config-file model. Template authoring UI is explicitly out of scope.

</domain>

<decisions>
## Implementation Decisions

### Template file location
- **D-01:** Templates are standalone `.mmd` files in `config/` (the existing Docker-mounted config directory)
- **D-02:** Each `.mmd` file has a YAML frontmatter block followed by the Mermaid diagram body
- **D-03:** Frontmatter declares `title` (string) and `sources` (array of source names from sources.json)

Example file structure:
```
---
title: "Project Timeline"
sources:
  - tasks
  - milestones
---
gantt
  title Project Timeline
  dateFormat YYYY-MM-DD
  {{#each tasks}}
  {{title}} :{{date_start}}, {{date_end}}
  {{/each}}
```

### Data binding syntax
- **D-04:** Handlebars-style bindings: `{{fieldName}}` for scalar values, `{{#each sourceName}} ... {{/each}}` for iterating over database rows
- **D-05:** Field names in bindings correspond to `columnMappings` keys from `sources.json` (e.g., `title`, `date`, `status`) — not raw Notion property names
- **D-06:** Each source listed in frontmatter is available as a named context variable in the template body matching its source name

### Database reference
- **D-07:** Sources are referenced by source name from `sources.json`, not raw Notion database IDs — no duplication of IDs

### UI integration
- **D-08:** The template's `title` (from frontmatter) appears as a viz type option in the viz type selector on source pages, for every source listed in that template's `sources` array
- **D-09:** If a source has no templates referencing it, no Mermaid option appears — same eligibility-detection pattern as Metro/Flow viz types

### Config lifecycle
- **D-10:** Templates are loaded at container startup, same as `sources.json` — no hot-reload, restart required for changes
- **D-11:** Invalid templates (unknown source names, malformed frontmatter) fail with a visible error in the diagram area rather than crashing the container

### Claude's Discretion
- Handlebars implementation: use a lightweight library (e.g., `handlebars` npm package) or a minimal custom tokenizer — pick based on what's already in package.json
- Mermaid.js loading: CDN script tag in the Nuxt app layout, or npm package — pick the lighter-weight option
- Error display: show the parse/render error message in the diagram area so admin can debug

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing config model
- `config/sources.json` (example) — Source name conventions, columnMappings key names that templates will reference
- `server/utils/config.ts` — Config loading logic; Mermaid template loader should follow the same pattern

### Existing viz type detection
- `composables/useSourceData.ts` — How metro/flow eligibility is detected; Mermaid eligibility follows the same pattern (template file references the source)

### Existing UI surface
- `pages/visualizations/[sourceId].vue` — Where viz type selector lives; Mermaid option integrates here

### Mermaid library
- https://mermaid.js.org/intro/ — Official docs; check browser-only rendering approach (mermaid.initialize + mermaid.render)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `server/utils/config.ts`: Config loader pattern — template loader should use the same `readFile` + parse approach, scanning `config/` for `*.mmd` files
- `composables/useSourceData.ts`: Viz type eligibility detection — add `hasMermaidTemplates` alongside existing `hasMetro` / `hasFlow` flags
- `pages/visualizations/[sourceId].vue`: Viz type selector and rendering switch — add `mermaid` as a third viz type case

### Established Patterns
- Config-file + restart model: no file watching, no admin UI — templates follow exact same lifecycle as sources.json
- Source names as keys: all cross-referencing in this app uses source names from config (not raw IDs) — consistent with D-07
- Client-side rendering: Metro and Flow both render entirely in the browser; Mermaid follows the same pattern

### Integration Points
- `server/api/sources/[id].get.ts` (or equivalent): Template data needs to reach the client. Either:
  - Server route returns template metadata + substituted string alongside page data, OR
  - New server route `/api/mermaid/[templateId]` returns the rendered template string
- `pages/visualizations/[sourceId].vue`: Mermaid diagram component mounts in the same area as MetrovizMap and FlowDiagram

</code_context>

<specifics>
## Specific Ideas

- User's original framing: "user or admin defines mermaid template and references data from one or more databases" — admin is the right author (consistent with existing config model)
- Frontmatter approach for multi-source binding was user's own idea — confirmed as the implementation direction
- Template title in frontmatter becomes the viz type label — user specified this explicitly

</specifics>

<deferred>
## Deferred Ideas

- Hot-reload of templates without restart — future enhancement if iteration speed becomes a pain point
- Admin UI for template editing — explicitly out of scope (config-file model is sufficient)
- Template validation tooling (CLI lint command) — nice-to-have, not v1

</deferred>

---

*Phase: 05-mermaid-diagrams*
*Context gathered: 2026-06-08*
