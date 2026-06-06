# Phase 4: Deployment - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Production-ready packaging and user-facing documentation. The app is fully built — this phase wraps it for distribution and discoverability. Covers: README.md, a standalone HTML product page (uploaded to a webserver), and a Makefile/script for Docker Hub publishing. The Dockerfile and docker-compose.yml already exist and are production-grade — no changes needed.

</domain>

<decisions>
## Implementation Decisions

### README

- **D-01:** Setup-first structure — lead with `docker-compose up` quick-start, then features, then config reference
- **D-02:** Include config reference as a table of all `sources.json` / `columnMappings` fields (keys, types, descriptions) — not just a link to the example file
- **D-03:** No screenshots — text only; screenshots get stale and require image assets
- **D-04:** Brief architecture overview — 2-3 bullet points only: Nuxt server routes keep Notion token server-side, LRU cache, config-driven. No diagram.
- **D-05:** Standard README sections: features summary, prerequisites, quick start, configuration reference, architecture brief, troubleshooting tips

### Product page (HTML)

- **D-06:** Single self-contained HTML file — user uploads to their own webserver; no GitHub Pages or build step
- **D-07:** Sections: Hero, Feature highlights (3-4 capabilities), How it works (3 steps: configure → run → visualize)
- **D-08:** Notion-like aesthetic — clean white, Inter/sans-serif font (via CDN), minimal color, subtle borders. Matches the app's own design language
- **D-09:** Hero CTA: two buttons — "View on GitHub" + "Docker Hub" — both external links
- **D-10:** No getting-started code block on the product page — the README handles setup detail

### Docker Hub publishing

- **D-11:** Manual publishing via Makefile — no GitHub Actions CI; developer runs `make publish` (or equivalent)
- **D-12:** Image name: `notionviz` (shorter, more brandable) — full name: `USERNAME/notionviz:latest`
- **D-13:** Single tag: `latest` only — no semver or git SHA tagging
- **D-14:** Dockerfile is fine as-is — multi-stage build, non-root user, correct ENV vars; no HEALTHCHECK needed

### Claude's Discretion

- Exact Makefile target names and commands
- README section ordering within the decided structure
- Feature highlight copy and icons on the product page
- Whether to include a `.dockerignore` if missing

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Docker setup (do not overwrite)
- `Dockerfile` — Multi-stage build (builder → runner), node:20-alpine, non-root nuxt user — already production-grade
- `docker-compose.yml` — Volume mount `./config:/app/config:ro`, env_file `.env`, `restart: unless-stopped`

### Config schema (for README reference table)
- `config/sources.example.json` — Canonical example showing all supported fields and roles

### App identity
- `CLAUDE.md` — Project description, tech stack, constraints (source of truth for README feature copy)
- `.planning/PROJECT.md` — Core value statement, requirements summary, key decisions

### No external specs — requirements fully captured in decisions above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `config/sources.example.json` — Use as the basis for the config reference table in README
- `Dockerfile` + `docker-compose.yml` — Already production-ready; copy docker-compose snippet verbatim into README quick-start
- `.env.example` — Copy into README setup section for environment variable documentation

### Established Patterns
- App design: TailwindCSS v4, clean white UI, minimal color — product page should mirror this
- Docker setup: multi-stage build, non-root user, volume for config, env for token — all established

### Integration Points
- README lives at repo root (`README.md`)
- HTML product page is a standalone deliverable (`product.html` or `index.html` in `/docs`)
- Makefile lives at repo root — new file

</code_context>

<specifics>
## Specific Ideas

- Product page uploaded to user's own webserver — deliver as a single self-contained HTML file with inline CSS (or CDN-linked Tailwind/fonts), no build step
- Hero: two CTAs side by side — "View on GitHub" (primary/dark) + "Docker Hub" (secondary/outlined)
- Notion-like = Inter font, `#f7f6f3` or white background, black headings, gray body text, `1px solid #e8e8e8` borders — not a marketing page

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-deployment*
*Context gathered: 2026-06-05*
