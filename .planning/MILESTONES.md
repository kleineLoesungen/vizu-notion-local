# Milestones: vizu-notion-local

## v1.0 — Core Visualization (2026-06-06)

**Phases**: 1–4
**Goal**: Working Docker app that reads Notion databases and renders them as metro maps and process flow diagrams — purely through configuration.

**Shipped:**
- Notion API integration (server-side proxy, LRU cache, rate limiting)
- Metro map visualization (Metroviz) for hierarchical data
- Vue Flow process flow visualization for workflow data
- Multi-source views, node filtering, node detail panel, shareable links
- Docker deployment with docs/index.html product page

**Archive**: `.planning/milestones/v1.0-phases/`

---

## v1.1 — Mermaid Diagram Templates ✅ 2026-06-13

**Phases**: 5–6 | **Plans**: 7 | **Files changed**: 52 | **Timeline**: 2026-06-08 → 2026-06-13 (5 days)

**Key Accomplishments:**
1. Admin-defined `.mmd` template files with YAML frontmatter + Handlebars syntax bind to live Notion data server-side — no code changes needed for new diagram types
2. Server-side FNV-1a stable node ID generation — `{{attribute}}` → `nXXXXXX["value"]`, same value always collapses to same node
3. D3 zoom/pan on Mermaid diagrams (Ctrl+scroll, drag) — consistent with Metro and Flow
4. Related-nodes filter (1-hop Notion relations) and "Has relation" filter across all viz types
5. Browser-based MMD editor (`/mermaid-editor`) with live server-side data resolution

**Archive**: `.planning/milestones/v1.1-ROADMAP.md`, `.planning/milestones/v1.1-REQUIREMENTS.md`
