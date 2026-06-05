---
phase: 04-deployment
plan: "02"
subsystem: deployment
tags: [docker, makefile, publishing]
dependency_graph:
  requires: []
  provides: [Makefile with build/run/publish targets]
  affects: [developer workflow]
tech_stack:
  added: []
  patterns: [self-documenting Makefile via ## comments, DOCKER_HUB_USER guard pattern]
key_files:
  created:
    - Makefile
  modified: []
decisions:
  - "D-12: IMAGE=notionviz (shorter, brandable) — locked from CONTEXT.md"
  - "D-13: TAG=latest only — no semver or git SHA tagging — locked from CONTEXT.md"
  - "D-11: Manual publishing via Makefile, no GitHub Actions"
metrics:
  duration: "36 seconds"
  completed: "2026-06-05"
  tasks_completed: 1
  files_created: 1
  files_modified: 0
requirements: [D-11, D-12, D-13, D-14]
---

# Phase 04 Plan 02: Makefile for Docker Hub Publishing Summary

**One-liner:** Makefile with help, build, run, and publish targets — `make publish DOCKER_HUB_USER=myname` builds and pushes `myname/notionviz:latest` with a clear guard if username is missing.

## What Was Built

A `Makefile` at repo root with four targets:

- `help` — self-documenting: greps `## ` comment lines so the list never drifts from actual targets
- `build` — builds Docker image locally as `notionviz:latest`
- `run` — delegates to `docker-compose up`
- `publish` — guards against empty `DOCKER_HUB_USER`, then builds and pushes `USERNAME/notionviz:latest`

The `DOCKER_HUB_USER` variable can be set via environment variable or passed on the command line (`make publish DOCKER_HUB_USER=myusername`). When unset, `make publish` prints an actionable error and exits non-zero.

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Create Makefile with build, run, publish, help targets | Complete | 8d102f0 |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| IMAGE = notionviz, TAG = latest | Per locked decisions D-12 and D-13 from CONTEXT.md — no semver, shorter name |
| DOCKER_HUB_USER via env or CLI arg | Flexible: admin can export DOCKER_HUB_USER once or pass it per-invocation |
| Self-documenting help via grep | No manual list to maintain — comments drive output automatically |
| publish target guards before building | Clear error with usage hint; avoids partial builds with invalid image names |

## Verification Results

- `make --dry-run build` — exits 0, outputs `docker build -t notionviz:latest .`
- `make --dry-run run` — exits 0, outputs `docker-compose up`
- `make --dry-run help` — exits 0, shows all targets
- `make help` (live) — outputs self-documented target list correctly
- `make publish` without DOCKER_HUB_USER — prints error message, exits non-zero

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — Makefile fully wired. All targets functional.

## Self-Check: PASSED

- Makefile exists: FOUND at /Users/sebastianwiller/Documents/github/vizu-notion-local/Makefile
- Commit 8d102f0 exists in git log
- `make --dry-run build` exits 0
- All acceptance criteria met
