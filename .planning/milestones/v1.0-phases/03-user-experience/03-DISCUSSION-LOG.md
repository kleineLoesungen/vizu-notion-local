# Phase 3: User Experience - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-03
**Phase:** 03-user-experience
**Areas discussed:** Dashboard, Metro map multi-source, Viz page (filtering, export, Notion links), App design, Backend pagination
**Note:** Context was reconstructed from user summary after a `/clear` reset mid-session. No interactive Q&A log available; decisions below reflect the user's verbatim summary.

---

## Dashboard (entry page)

| Option | Description | Selected |
|--------|-------------|----------|
| Simple source list (current) | Current index.vue — just links to each source | |
| Full dashboard with management | Entry page showing sources, viz types, timestamps, refresh controls, and error state | ✓ |

**User's choice:** Full dashboard — lists sources + viz types as entry points, shows last fetch timestamp, per-source manual refresh + global "Fetch All" button, error messaging on failure.

---

## Metro Map — Multi-source

| Option | Description | Selected |
|--------|-------------|----------|
| Single source only | One source per metro map (current behavior) | |
| Multi-source lines | Multiple sources contribute lines to one metro map | ✓ |
| Multi-source milestones | Multiple sources can overlay global milestone markers | ✓ |

**User's choice:** Both — user selects multiple sources for lines AND for global milestone overlays.

---

## Viz page — Node filtering

| Option | Description | Selected |
|--------|-------------|----------|
| Property-based filter panel | Filter by status, tags, dates (as in UI-04 requirements) | |
| Per-node deselect/select | Toggle individual pages/nodes on/off regardless of property values | ✓ |

**User's choice:** Per-node visibility toggle — deselect/select individual pages from selected sources.

---

## Viz page — Export

| Option | Description | Selected |
|--------|-------------|----------|
| No export | View only | |
| SVG only | Download current diagram as SVG | |
| SVG + PNG | Download as both SVG and PNG | ✓ |

**User's choice:** Both SVG and PNG download.

---

## Viz page — Notion links

| Option | Description | Selected |
|--------|-------------|----------|
| No links | Diagram only | |
| Node detail panel | Click node → full properties panel (UI-05 original spec) | |
| Notion URL links | Links to source Notion pages — in diagram or as list below | ✓ |

**User's choice:** Notion URL links for visible pages — either inline in diagram nodes or as a list below the diagram.

---

## App design

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal / functional | No design investment, just working UI | |
| Modern, fresh, simple | Clean, uncluttered, modern aesthetic | ✓ |

**User's choice:** Modern, fresh, and simple design.

---

## Backend — Pagination

**User's note:** "API fetch should consider pagination and load all pages from db."

**Actual state:** Already implemented — `server/utils/notion.ts:queryDatabase()` uses a `do...while(cursor)` loop. No action needed.

---

## Claude's Discretion

- URL state encoding (UI-06) — implement per requirements
- Cache invalidation approach for manual refresh
- Multi-source API endpoint design
- Notion link placement (inline vs below diagram)

## Deferred Ideas

None noted.
