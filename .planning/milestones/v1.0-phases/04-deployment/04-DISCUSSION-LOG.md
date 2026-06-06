# Phase 4: Deployment - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-05
**Phase:** 04-deployment
**Areas discussed:** README depth, Product page, Docker Hub publishing

---

## README depth

| Option | Description | Selected |
|--------|-------------|----------|
| Setup-first | Lead with docker-compose up, then features, then config reference | ✓ |
| Feature-first | Lead with what the app does and a screenshot | |
| Comprehensive | Full docs: features, architecture, config reference, troubleshooting, contribution guide | |

**Config reference:** Table of fields — yes (not just example file link) ✓

**Screenshots:** No — text only ✓

**Architecture section:** Brief overview only (2-3 bullets) ✓

---

## Product page

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub Pages | Served from /docs or gh-pages branch | |
| Static file in repo root | No deployment needed | |
| Upload to own webserver | User uploads HTML file to their own server | ✓ |

**Sections selected:** Hero + tagline + CTA, Feature highlights, How it works ✓

| Aesthetic | Description | Selected |
|-----------|-------------|----------|
| Notion-like | Clean white, Inter font, minimal color | ✓ |
| Dark/technical | Dark background, monospace | |
| Bold/marketing | Gradients, colorful CTAs | |

**CTA:** GitHub link + Docker Hub link (two buttons) ✓

---

## Docker Hub publishing

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub Actions workflow | Automatic push on main | |
| Manual Makefile/script | Developer runs make publish | ✓ |
| Document steps only | No automation | |

**Tags:** latest only ✓

**Image name:** notionviz ✓

**Dockerfile changes:** None — it's fine as-is ✓

---

## Claude's Discretion

- Exact Makefile target names
- README section ordering
- Feature highlight copy and icons on product page
- Whether to add .dockerignore

## Deferred Ideas

None
