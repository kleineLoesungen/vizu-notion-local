---
phase: 02-visualization
plan: "01"
subsystem: ui
tags: [tailwindcss, vue-flow, metroviz, vite, nuxt]

# Dependency graph
requires:
  - phase: 01-backend-foundation
    provides: Nuxt project scaffold with nuxt.config.ts, package.json, server routes
provides:
  - TailwindCSS v4 configured via @tailwindcss/vite Vite plugin in nuxt.config.ts
  - assets/css/main.css entry point with @import "tailwindcss"
  - "@vue-flow/core installed in node_modules"
  - Metroviz vendored in vendor/metroviz/js/ (MetroRenderer, LayoutEngine, DataModel, parseDate, color-utils)
  - vendor/metroviz/css/metroviz.css for SVG styling
affects:
  - 02-02-metroviz-component
  - 02-03-vueflow-component

# Tech tracking
tech-stack:
  added:
    - "@vue-flow/core ^1.x"
    - "@tailwindcss/vite (devDependency)"
    - tailwindcss v4 (devDependency)
    - Metroviz vendored JS (metro-renderer.js, layout-engine.js, data-model.js, utils.js, color-utils.js)
  patterns:
    - "TailwindCSS v4: no tailwind.config.ts, single @import 'tailwindcss' in main.css, Vite plugin in nuxt.config.ts"
    - "Vendor pattern: trim upstream libraries to only required modules (D-01/D-02)"

key-files:
  created:
    - assets/css/main.css
    - vendor/metroviz/js/metro-renderer.js
    - vendor/metroviz/js/layout-engine.js
    - vendor/metroviz/js/data-model.js
    - vendor/metroviz/js/utils.js
    - vendor/metroviz/js/color-utils.js
    - vendor/metroviz/css/metroviz.css
    - vendor/metroviz/VENDOR.md
  modified:
    - nuxt.config.ts
    - package.json
    - package-lock.json

key-decisions:
  - "TailwindCSS v4 via @tailwindcss/vite (not @nuxtjs/tailwindcss) — v4 does not use tailwind.config.ts, only @import 'tailwindcss' in CSS entry"
  - "Metroviz vendored trimmed to 5 rendering modules only — app.js and all UI-only files excluded per D-01/D-02"
  - "vendor/metroviz/css/metroviz.css included — required by MetroRenderer for SVG styling"

patterns-established:
  - "TailwindCSS v4 pattern: @tailwindcss/vite plugin + @import 'tailwindcss' in CSS (no config file)"
  - "Vendoring pattern: download only must-have files, document in VENDOR.md with source tracking"

requirements-completed:
  - VIZ-01
  - VIZ-02

# Metrics
duration: 2min
completed: 2026-06-03
---

# Phase 2 Plan 01: Visualization Infrastructure Setup Summary

**TailwindCSS v4 with Vite plugin configured, @vue-flow/core installed, and Metroviz JS engine vendored from GitHub (5 rendering modules, Alpine.js excluded)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-06-03T03:10:04Z
- **Completed:** 2026-06-03T03:12:13Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- Installed @vue-flow/core and @tailwindcss/vite — both immediately importable in Vue components
- Configured TailwindCSS v4 in nuxt.config.ts using @tailwindcss/vite Vite plugin; no legacy tailwind.config.ts
- Vendored Metroviz MetroRenderer, LayoutEngine, DataModel, parseDate utilities, and color-utils from GitHub master branch

## Task Commits

Each task was committed atomically:

1. **Task 1: Install npm packages (TailwindCSS v4 + Vue Flow)** - `2f9c3e7` (chore)
2. **Task 2: Configure TailwindCSS v4 in Nuxt** - `014d303` (feat)
3. **Task 3: Vendor Metroviz library from GitHub** - `8bb91a5` (feat)

## Files Created/Modified
- `nuxt.config.ts` - Added @tailwindcss/vite Vite plugin import and registration, css entry
- `assets/css/main.css` - TailwindCSS v4 entry point with @import "tailwindcss" and .metroviz-canvas sizing rule
- `package.json` - Added @vue-flow/core, @tailwindcss/vite, tailwindcss
- `package-lock.json` - Updated with all new dependencies
- `vendor/metroviz/js/metro-renderer.js` - MetroRenderer class (SVG rendering engine, 42KB)
- `vendor/metroviz/js/layout-engine.js` - LayoutEngine class (computes x/y positions)
- `vendor/metroviz/js/data-model.js` - DataModel.validateAndNormalize() (validates raw JSON)
- `vendor/metroviz/js/utils.js` - parseDate() and utility functions
- `vendor/metroviz/js/color-utils.js` - Color palette helpers
- `vendor/metroviz/css/metroviz.css` - SVG styling required by MetroRenderer (23KB)
- `vendor/metroviz/VENDOR.md` - Source tracking for vendored library

## Decisions Made
- Used `@tailwindcss/vite` Vite plugin approach (not `@nuxtjs/tailwindcss` module) — v4 requires this; the v3 module would conflict
- Vendored Metroviz to only 5 rendering modules — Alpine.js shell (app.js) and all UI helper files excluded per D-01/D-02 decisions, as we wrap the renderer directly in Vue
- Included metroviz.css — discovered during download that MetroRenderer requires it for SVG line and node styling

## Deviations from Plan

None - plan executed exactly as written.

(The plan correctly anticipated that metroviz.css would be needed; it was included as specified.)

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three visualization dependencies are installed and importable
- Plan 02-02 can now import `import { MetroRenderer } from '@/vendor/metroviz/js/metro-renderer.js'`
- Plan 02-03 can now import `import { VueFlow } from '@vue-flow/core'`
- TailwindCSS utility classes will apply immediately in all Vue components

---
*Phase: 02-visualization*
*Completed: 2026-06-03*
