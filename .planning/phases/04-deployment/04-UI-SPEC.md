---
phase: 4
slug: deployment
status: draft
shadcn_initialized: false
preset: none
created: 2026-06-05
---

# Phase 4 — UI Design Contract

> Visual and interaction contract for Phase 04: Deployment. Product page only — README.md and Makefile are non-visual deliverables.

---

## Phase Scope

**Phase 04: Deployment** delivers three non-visual artifacts and one UI deliverable:

| Artifact | Type | UI Spec? |
|----------|------|----------|
| README.md | Documentation | No — pure text |
| Makefile | Build automation | No — CLI only |
| Docker publishing workflow | Process | No — backend ops |
| Product page (HTML) | User-facing marketing | **YES** ← only UI deliverable |

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — static HTML + CDN styling |
| Preset | not applicable |
| Component library | none |
| Icon library | system-ui (no custom icons) |
| Font | Inter (Google Fonts CDN) + system sans-serif fallback |

**Rationale**: Product page is standalone, not part of the Nuxt app. Single HTML file with inline CSS (or CDN-linked Tailwind). No build step, no component library, no bundler.

---

## Spacing Scale

Declared values (multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Inline text gaps, fine details |
| sm | 8px | Compact spacing within cards |
| md | 16px | Default padding, element spacing |
| lg | 24px | Section padding, major gaps |
| xl | 32px | Hero padding, major layout gaps |
| 2xl | 48px | Page-level section breaks |
| 3xl | 64px | Top/bottom hero margins |

Exceptions: **none** — rigid 4-point scale throughout.

---

## Typography

All measured from existing app patterns in TailwindCSS default scale.

| Role | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Display (Hero) | 48px | 700 (bold) | 1.2 | Main heading "Visualize Your Notion Workspace" |
| Heading 1 | 32px | 600 (semibold) | 1.3 | Section headers ("Features", "How It Works") |
| Heading 2 | 20px | 600 (semibold) | 1.4 | Feature titles, subsections |
| Body | 16px | 400 (regular) | 1.6 | Paragraph text, descriptions |
| Label | 14px | 500 (medium) | 1.5 | Button text, small labels |
| Caption | 12px | 400 (regular) | 1.5 | Footer, fine print |

**Font**: Inter from Google Fonts CDN (`https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap`). Fallback: `system-ui, -apple-system, sans-serif`.

---

## Color

All colors match existing app palette (drawn from TailwindCSS defaults + observed usage).

| Role | Hex | Usage |
|------|-----|-------|
| **Dominant (60%)** | #ffffff (white) | Page background, card backgrounds |
| **Dominant Alt (20%)** | #f7f6f3 (warm off-white) | Subtle section background, light fill |
| **Secondary (20%)** | #e8e8e8 (light gray) | Borders, subtle dividers |
| **Text Primary (90%+)** | #1a1a1a (near-black) | All headings, main body text |
| **Text Secondary (60%)** | #666666 (medium gray) | Descriptive text, secondary labels |
| **Text Tertiary (40%)** | #999999 (light gray) | Caption text, disabled states |
| **Accent CTA (10%)** | #2563eb (blue-600) | Primary buttons, links, hover states |
| **Accent Secondary** | #3b82f6 (blue-500) | Accent hover states, secondary highlights |
| **Destructive** | #dc2626 (red-600) | Error messages, warnings only |
| **Success** | #16a34a (green-600) | Success states only |

**Accent (blue) reserved for:**
- Primary CTA buttons ("View on GitHub", "Docker Hub")
- Hyperlinks (external)
- Hover states on interactive elements
- **NOT** used for general UI elements — limited to CTAs and links only

**Color ratio philosophy:** 60% white/off-white background, 20% secondary borders/fills, 20% text, leaving 10% for accent CTAs.

---

## Copywriting Contract

| Element | Copy | Guidance |
|---------|------|----------|
| **Hero Heading** | "Visualize Your Notion Workspace" | Bold, benefit-driven, no product name |
| **Hero Subheading** | "Render hierarchical or sequential Notion databases as interactive metro maps and process flows — no code changes required." | Specific value prop: what it does + how |
| **Primary CTA (Hero)** | "View on GitHub" | GitHub link, secondary priority to Docker button |
| **Secondary CTA (Hero)** | "Docker Hub" | Docker Hub link, primary priority |
| **Feature 1 Title** | "Config-Driven" | ← exact title from D-07 feature list |
| **Feature 1 Body** | "Define Notion sources and column mappings in a JSON config file. Update the config, restart the container, and the app validates and reloads — no code changes." | Concrete how-it-works |
| **Feature 2 Title** | "Two Visualization Types" | ← use plural to match app capability |
| **Feature 2 Body** | "Hierarchical databases render as metro-style maps. Sequential/workflow databases render as process flows. The app auto-detects which type is available for each source." | Explain what user sees |
| **Feature 3 Title** | "Fully Local & Self-Hosted" | ← emphasize privacy/control |
| **Feature 3 Body** | "Single `docker-compose up` command. Your Notion token stays server-side. No cloud relay, no external dependencies — run on your own machine." | Address privacy concern |
| **Step 1 (How It Works)** | "Configure" | Configure Notion sources and mappings |
| **Step 1 Body** | "Edit a simple JSON config file with your Notion database IDs and column mappings." | Show it's simple |
| **Step 2 (How It Works)** | "Run" | Run with Docker |
| **Step 2 Body** | "Start the container with `docker-compose up`. The app validates your config and connects to Notion." | Simple one-liner |
| **Step 3 (How It Works)** | "Visualize" | See the diagrams |
| **Step 3 Body** | "Open the browser and view your data as interactive metro maps or process flows. Filter, export, and share." | Show the outcome |
| **Empty State** | (Not applicable — product page is never empty) | — |
| **CTA Buttons Label** | "View on GitHub" / "Docker Hub" | Primary: GitHub repo. Secondary: Docker Hub |
| **Footer Text** | "Built with Nuxt + Vue 3 + TailwindCSS. Config-driven visualization for Notion." | Credit stack, reinforce value |

**Tone**: Professional, benefit-focused, technical (not marketing-y). Assume audience is developers/power users, not C-suite.

---

## Copywriting Copy Blocks

### Hero Section
```
HEADING: "Visualize Your Notion Workspace"
SUBHEADING: "Render hierarchical or sequential Notion databases as interactive metro maps and process flows — no code changes required."

PRIMARY CTA: "View on GitHub"  [github.com/sebastianwiller/vizu-notion-local]
SECONDARY CTA: "Docker Hub"     [docker.com/r/USERNAME/notionviz]
```

### Feature Highlights (3 features, one per grid cell)

**Feature 1: Config-Driven**
- Title: "Config-Driven"
- Body: "Define Notion sources and column mappings in a JSON config file. Update the config, restart the container, and the app validates and reloads — no code changes."

**Feature 2: Two Visualization Types**
- Title: "Two Visualization Types"
- Body: "Hierarchical databases render as metro-style maps. Sequential/workflow databases render as process flows. The app auto-detects which type is available for each source."

**Feature 3: Fully Local & Self-Hosted**
- Title: "Fully Local & Self-Hosted"
- Body: "Single `docker-compose up` command. Your Notion token stays server-side. No cloud relay, no external dependencies — run on your own machine."

### How It Works (3 steps)

**Step 1: Configure**
- Heading: "Configure"
- Body: "Edit a simple JSON config file with your Notion database IDs and column mappings."

**Step 2: Run**
- Heading: "Run"
- Body: "Start the container with `docker-compose up`. The app validates your config and connects to Notion."

**Step 3: Visualize**
- Heading: "Visualize"
- Body: "Open the browser and view your data as interactive metro maps or process flows. Filter, export, and share."

### Footer
```
"Built with Nuxt + Vue 3 + TailwindCSS. Config-driven visualization for Notion."
```

---

## Product Page Structure

**Single HTML file, self-contained.** No build step, no separate CSS/JS files.

### Layout Grid

| Section | Grid | Mobile | Desktop |
|---------|------|--------|---------|
| Hero | Full bleed | Flex column, center | Flex row, center |
| Feature highlights | 3-col grid | 1 col (stack) | 3 col equal |
| How It Works | 3-col grid | 1 col (stack) | 3 col equal |
| CTA footer | Full width | Stack vertical | Horizontal |

### Visual Principles

- **No custom icons** — use Unicode symbols (→, ✓, ⚙) or system SF Symbols
- **No images** — text and diagrams only (if any, use inline SVG)
- **Borders**: 1px solid #e8e8e8 for section dividers
- **Cards**: Rounded 8px, bg-white, 1px border #e8e8e8, soft shadow (0 1px 3px rgba(0,0,0,0.1))
- **Button styling**:
  - Primary (GitHub): bg-#2563eb, text-white, px-6 py-3, rounded-lg, font-medium
  - Secondary (Docker Hub): bg-transparent, border-2 #2563eb, text-#2563eb, px-6 py-3, rounded-lg, font-medium
  - Hover: Primary darkens to #1e40af; Secondary fills with light blue bg-#eff6ff
- **Spacing**: 64px between sections, 32px between subsections, 16px between elements

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| (None) | Static HTML | not applicable |

No component libraries, no third-party registries. Product page is self-contained HTML + CDN-linked fonts + inline CSS.

---

## Implementation Notes

### Deliverable
- **File**: `product.html` or `docs/index.html` (location TBD in plan)
- **Format**: Single self-contained HTML file with `<style>` block or CDN-linked Tailwind
- **Fonts**: Inter from Google Fonts CDN, fallback to system-ui
- **No build**: Open in browser directly

### Constraint
- **D-06 (locked)**: "Single self-contained HTML file — user uploads to their own webserver; no GitHub Pages or build step"
- **D-08 (locked)**: "Notion-like aesthetic — clean white, Inter/sans-serif font (via CDN), minimal color, subtle borders"

### Out of Scope
- JavaScript interactivity beyond smooth scroll or mobile menu (keep it minimal)
- Responsive breakpoints beyond simple mobile/desktop (flex/grid auto-adjust)
- Dark mode (not in Phase 4 scope per ROADMAP.md)
- Analytics tracking (beyond simple links)

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
