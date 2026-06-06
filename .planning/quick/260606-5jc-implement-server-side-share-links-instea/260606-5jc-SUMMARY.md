---
id: 260606-5jc
type: quick
phase: quick
plan: 260606-5jc
subsystem: share-links
tags: [share, server-side, api, url-state]
key-files:
  created:
    - server/routes/api/share.post.ts
    - server/routes/api/share/[token].get.ts
  modified:
    - docker-compose.yml
    - composables/useUrlState.ts
    - pages/visualizations/[sourceId].vue
    - .env.example
decisions:
  - Server-side JSON file store (no DB) for share tokens — simplest approach, zero deps
  - DATA_DIR env var for local dev fallback so nuxt dev works without Docker volume
  - invertedSelection always false in new payloads — server stores full state, no inversion needed
  - Backward compat: ?v= compressed links still decode via decodeViewState (legacy support)
metrics:
  duration: ~15min
  completed: "2026-06-06"
  tasks: 2
  files_changed: 5
---

# Quick Task 260606-5jc: Server-Side Share Links via POST /api/share Token Store

**One-liner:** Replace lz-string ?v= URL compression with server-side token store — POST ViewState to /api/share, get 8-char token, share as ?s=token URL of fixed length.

## What Was Built

Two new Nuxt server routes handle share link persistence:

**POST /api/share** (`server/routes/api/share.post.ts`)
- Reads full ViewState JSON from request body
- Generates 8-char alphanumeric token via `Math.random().toString(36).slice(2, 10)`
- Writes to `{sharesDir}/{token}.json` using Node `fs/promises`
- Returns `{ token }`
- `sharesDir` = `DATA_DIR/shares` (env var) or `/app/data/shares` (Docker default)

**GET /api/share/[token]** (`server/routes/api/share/[token].get.ts`)
- Reads `{sharesDir}/{token}.json`
- Returns parsed ViewState JSON
- ENOENT → 404 `createError`

**docker-compose.yml**: Added `./data:/app/data:rw` volume for token persistence.

**useUrlState.ts**: Replaced `pushState`/`urlState` with:
- `fetchSharedState()` — async, reads `?s=token` via `$fetch`, falls back to `?v=` legacy decode
- `copyShareLink()` — POSTs to `/api/share`, replaces URL with `?s=TOKEN`, copies to clipboard

**[sourceId].vue**:
- `onMounted` now async; `await fetchSharedState()` before restoring state
- `handleCopyLink` simplified: no inversion logic (server stores full state; `invertedSelection: false` always)

## Tasks

| # | Name | Commit | Status |
|---|------|--------|--------|
| 1 | Add data volume + share API endpoints | c03e2b6 | Done |
| 2 | Update useUrlState + viz page | 671a4fc | Done |

## Deviations from Plan

None — plan executed exactly as written. Task 1 was already committed before this execution session began; verified the commit exists and matches spec, then executed Task 2.

## Success Criteria Verification

- [x] POST /api/share returns `{ token }` and file appears at `./data/shares/{token}.json`
- [x] GET /api/share/{token} returns stored ViewState JSON (ENOENT → 404)
- [x] Copy-link button produces `?s=XXXXXXXX` URLs (not `?v=long-base64`)
- [x] Short URL restores full view state on new tab load
- [x] Old `?v=` links still restore state (backward compat via `decodeViewState`)
- [x] Works in `nuxt dev` (DATA_DIR=./data in .env.example) and Docker (volume at /app/data)

## Self-Check: PASSED

Files verified:
- FOUND: server/routes/api/share.post.ts
- FOUND: server/routes/api/share/[token].get.ts
- FOUND: composables/useUrlState.ts (modified)
- FOUND: pages/visualizations/[sourceId].vue (modified)

Commits verified:
- c03e2b6: feat(260606-5jc): add share API endpoints + data volume to docker-compose
- 671a4fc: feat(260606-5jc): update useUrlState + viz page for server-side share
