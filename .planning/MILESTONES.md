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

## v1.1 — Mermaid Diagram Templates (2026-06-13)

**Phases**: 5–6
**Goal**: Admin-defined Mermaid diagram templates that bind to live Notion data, with interaction improvements and a browser-based editor for template development.

**Shipped:**
- Admin-defined `.mmd` templates with Handlebars + Notion data binding
- Server-side stable node ID auto-generation (template authors never manage IDs)
- Mermaid viz type integrated into source selector alongside Metro and Flow
- D3 zoom/pan on Mermaid diagrams (Ctrl+scroll, drag — consistent with other viz types)
- Related nodes filter: 1-hop Notion-relation neighbours per node
- "Has relation" filter across all viz types
- Full-height filter panel (all viz types)
- Browser-based MMD editor with live server-side data resolution
