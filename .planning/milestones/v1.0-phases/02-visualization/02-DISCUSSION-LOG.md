# Phase 2: Visualization - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-02
**Phase:** 02-visualization
**Areas discussed:** Metroviz sourcing, Role-to-viz-type rules, Metro map data model

---

## Metroviz Sourcing

| Option | Description | Selected |
|--------|-------------|----------|
| Vendor locally | Copy into /vendor/metroviz/. Offline, Docker-safe, patchable. | ✓ |
| CDN link | Load via script tag at runtime. Requires internet. | |
| Custom SVG renderer | Build from scratch. Full control, much more work. | |

**User's choice:** Vendor locally, trim to must-haves
**Notes:** User asked "is vendor locally and shrink to must-haves better than built by own?" — discussed that vendoring gives Metroviz's routing quality for free; building custom makes sense only if data model is fundamentally incompatible.

---

## Role-to-Viz-Type Rules

Multiple rounds of refinement. Final locked rules:

| Rule | Value |
|------|-------|
| Metro map minimum | `date` + `next` roles required |
| Flow minimum | `next` role only |
| Both eligible | Source with `date` + `next` can use either viz type |
| Global events | Any source with `title` + `date` can overlay as global events |
| `parent` | Optional — organizes stations into hierarchy lines |
| `tag` | Optional — groups lines into zones |

**Notes:**
- Initial proposal was `parent` → metro map, `next` → flow. User corrected: `next` can be used in metro map too.
- User clarified: detection should not be a hard gate — user should be able to switch freely between viz types.
- User confirmed: `date` + `next` = minimum for metro map; `next` alone = minimum for flow.

---

## Metro Map Data Model

Discovered during discussion that Metroviz has a **horizontal time axis** (user corrected initial assumption that it was a topology map only). This changed the data model significantly.

| Metroviz Concept | Notion Role Mapping |
|-----------------|---------------------|
| X-axis (timeline) | `date` role |
| Lines (colored tracks) | Parent items (`parent` role) |
| Stations | Items with `date` positioned on their parent's line |
| Sequential order | `next` role |
| Zones (Y-axis bands) | `tag` role (optional) |
| Global Events | Items from a second source with `title` + `date` |
| Station label | `title` role |

**Notes:**
- User referenced https://github.com/rstockm/Metroviz to correct understanding
- Metroviz is specifically a roadmap timeline tool (not a pure topology/subway map)
- Milestones from another source as Global Events: user confirmed this use case ("title, date could be a global event")
- Global events discussion deferred to Phase 3 for the UI controls (which source to use as events)

---

## Claude's Discretion

- TailwindCSS setup and configuration
- Vue component file structure
- Metroviz JSON transformation details
- Loading/error/empty states
- Layout and canvas sizing

---

## Deferred Ideas

- Gantt-style timeline visualization (VIZ-04, v2 scope)
- UI for selecting which source to use as global events overlay (Phase 3)
- Sequential before/after relationships at sub-goal level for flow viz (Phase 3 UI)
