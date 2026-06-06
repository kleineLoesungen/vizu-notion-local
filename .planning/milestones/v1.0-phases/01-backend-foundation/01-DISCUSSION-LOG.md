# Phase 1: Backend Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-02
**Phase:** 01-backend-foundation
**Areas discussed:** Config file format, Relation resolution depth

---

## Config file format

| Option | Description | Selected |
|--------|-------------|----------|
| YAML | More readable for nested mappings, requires js-yaml dependency | |
| JSON | No extra dependency, native to Node.js, slightly more verbose | ✓ |
| YAML with JSON fallback | Support both formats, adds loading complexity | |

**User's choice:** JSON

---

| Option | Description | Selected |
|--------|-------------|----------|
| sources.json | Matches the primary purpose — defining Notion data sources | ✓ |
| config.json | Generic name, works if config grows to include non-source settings | |
| notion.json | Emphasizes the Notion connection | |

**User's choice:** sources.json

---

| Option | Description | Selected |
|--------|-------------|----------|
| No — pure JSON | Simpler parsing, no convention to document | ✓ |
| Yes — strip // comments at load time | Friendlier for admins, requires strip-json-comments library | |
| You decide | Claude picks the simplest approach | |

**User's choice:** No — pure JSON

---

| Option | Description | Selected |
|--------|-------------|----------|
| Not in sources.json — env var only | CONF-06 says token via env/.env file; cleaner separation of secrets | ✓ |
| Allow token in sources.json as fallback | Easier local setup but risks committing the token | |

**User's choice:** Not in sources.json — env var only

---

## Relation resolution depth

| Option | Description | Selected |
|--------|-------------|----------|
| 1 level deep only | Resolve direct relations only, predictable API call budget | ✓ |
| User-configurable max depth per source | Flexible but adds config complexity | |
| Fully recursive until no more relations | Most complete but unbounded API calls — risky | |

**User's choice:** 1 level deep only

---

| Option | Description | Selected |
|--------|-------------|----------|
| Fetch it anyway | Resolve even if target DB isn't in sources.json | |
| Skip it silently | Ignore unregistered relations | ✓ |
| Warn and skip | Log a warning but continue loading | |

**User's choice:** Skip it silently

---

| Option | Description | Selected |
|--------|-------------|----------|
| Server-side merge in the API route | Server merges data from multiple sources, returns single payload | ✓ |
| Client-side composition | Client fetches each source separately and merges | |
| You decide | Claude picks whichever approach fits the architecture | |

**User's choice:** Server-side merge in the API route

---

## Claude's Discretion

- Startup validation feedback format (container logs vs /health endpoint)
- Offline/cold-cache behavior when Notion is unreachable
- Rate limiter library choice
- LRU cache size limits
- Breadth-first relation fetching algorithm internals

## Deferred Ideas

None mentioned during discussion.
