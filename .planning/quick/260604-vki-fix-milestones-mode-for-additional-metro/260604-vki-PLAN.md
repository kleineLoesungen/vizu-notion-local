---
phase: quick
plan: 260604-vki
type: execute
wave: 1
depends_on: []
files_modified:
  - composables/useMetrovizData.ts
  - pages/visualizations/[sourceId].vue
autonomous: true
requirements: []

must_haves:
  truths:
    - "When an extra source is set to milestones mode, it renders as events on the timeline axis (not as metro lines)"
    - "Events from multiple milestone sources are merged together when mergeMetrovizData is called"
    - "Sources in line mode continue to render as metro lines unchanged"
  artifacts:
    - path: "composables/useMetrovizData.ts"
      provides: "useMetrovizMilestoneEvents export, fixed MetrovizInputData.events type, fixed mergeMetrovizData events merge"
    - path: "pages/visualizations/[sourceId].vue"
      provides: "metrovizData computed uses useMetrovizMilestoneEvents for milestones mode"
  key_links:
    - from: "pages/visualizations/[sourceId].vue"
      to: "composables/useMetrovizData.ts"
      via: "import useMetrovizMilestoneEvents"
      pattern: "useMetrovizMilestoneEvents"
---

<objective>
Fix milestones mode for additional metro sources so they render as Metroviz events on the timeline axis rather than as metro lines.

Purpose: Currently the extrasData block in metrovizData computed strips the `next` key and calls useMetrovizData, which still produces lines. Milestone sources should instead call useMetrovizMilestoneEvents which produces events (date+label pairs) that Metroviz renders as vertical markers on the axis.

Output: useMetrovizMilestoneEvents exported from composable, MetrovizInputData.events typed correctly, mergeMetrovizData merges events, vue page routes milestones-mode extras to the new function.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@composables/useMetrovizData.ts
@pages/visualizations/[sourceId].vue
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix MetrovizInputData.events type and mergeMetrovizData events merge in composable</name>
  <files>composables/useMetrovizData.ts</files>
  <action>
Three changes to this file:

**A) Fix MetrovizInputData interface** — line 37, change:
```ts
events: []
```
to:
```ts
events: Array<{ date: string; label: string }>
```

**B) Fix mergeMetrovizData** — line 372, change:
```ts
events: [],
```
to:
```ts
events: datasets.flatMap(d => d.events ?? []),
```

**C) Add new export at the end of the file** (after the closing brace of useMetrovizData):

```ts
/**
 * Convert EnrichedPage[] to Metroviz events (NOT lines).
 * Used when an extra source is toggled to 'milestones' display mode —
 * events render as vertical markers on the timeline axis.
 */
export function useMetrovizMilestoneEvents(
  pages: EnrichedPage[],
  columnMappings: ColumnMappings,
  sourceTitle: string = 'Milestones'
): MetrovizInputData {
  if (pages.length === 0) {
    return {
      meta: { title: sourceTitle, organization: '' },
      timeline: { start: '2026-Q1', end: '2026-Q4' },
      zones: [],
      lines: [],
      events: [],
    }
  }

  const titlePropName = columnMappings['title']
  const datePropName = columnMappings['date']

  const events = pages
    .map(page => {
      const date = datePropName ? extractDate(page, datePropName) : null
      if (!date) return null
      const label = titlePropName ? extractTitle(page, titlePropName) : page.id.slice(0, 8)
      return { date, label }
    })
    .filter((e): e is { date: string; label: string } => e !== null)
    .sort((a, b) => a.date.localeCompare(b.date))

  const allDates = events.map(e => e.date)
  return {
    meta: { title: sourceTitle, organization: '' },
    timeline: {
      start: allDates[0] ? snapToMonthStart(allDates[0]) : '2026-Q1',
      end: allDates[allDates.length - 1] ? snapToNextMonthStart(allDates[allDates.length - 1]) : '2026-Q4',
    },
    zones: [],
    lines: [],
    events,
  }
}
```

All helper functions used (extractDate, extractTitle, snapToMonthStart, snapToNextMonthStart) are already defined earlier in the file — do not redefine them.
  </action>
  <verify>npx nuxi typecheck 2>&1 | grep -i "useMetrovizData\|events\|error" | head -20</verify>
  <done>MetrovizInputData.events typed as Array<{date: string; label: string}>, mergeMetrovizData merges events from all datasets, useMetrovizMilestoneEvents exported and returns events array with no lines/zones</done>
</task>

<task type="auto">
  <name>Task 2: Update metrovizData computed in [sourceId].vue to route milestones mode to useMetrovizMilestoneEvents</name>
  <files>pages/visualizations/[sourceId].vue</files>
  <action>
Two changes:

**A) Update import line 318** from:
```ts
import { useMetrovizData, mergeMetrovizData } from '@/composables/useMetrovizData'
```
to:
```ts
import { useMetrovizData, mergeMetrovizData, useMetrovizMilestoneEvents } from '@/composables/useMetrovizData'
```

**B) In the metrovizData computed (around lines 610-619), replace the extrasData mapping block.**

Current code (lines 610-619):
```ts
const extrasData = (extraSourcesData.value ?? [])
  .map(d => {
    const visiblePages = (d.pages as EnrichedPage[]).filter(p => extraVisibleIds.value.has(p.id))
    if (visiblePages.length === 0) return null
    const mode = sourceDisplayModes[d.source.id] ?? ('next' in (d.source.columnMappings ?? {}) ? 'line' : 'milestones')
    const effectiveMappings = mode === 'milestones'
      ? Object.fromEntries(Object.entries(d.source.columnMappings).filter(([k]) => k !== 'next'))
      : d.source.columnMappings
    return useMetrovizData(visiblePages, effectiveMappings, d.source.name)
  })
```

Replace with:
```ts
const extrasData = (extraSourcesData.value ?? [])
  .map(d => {
    const visiblePages = (d.pages as EnrichedPage[]).filter(p => extraVisibleIds.value.has(p.id))
    if (visiblePages.length === 0) return null
    const mode = sourceDisplayModes[d.source.id] ?? ('next' in (d.source.columnMappings ?? {}) ? 'line' : 'milestones')
    if (mode === 'milestones') {
      return useMetrovizMilestoneEvents(visiblePages, d.source.columnMappings, d.source.name)
    } else {
      return useMetrovizData(visiblePages, d.source.columnMappings, d.source.name)
    }
  })
```

The `effectiveMappings` variable is removed entirely — it is no longer needed.
  </action>
  <verify>npx nuxi typecheck 2>&1 | grep -i "error" | head -20</verify>
  <done>Import includes useMetrovizMilestoneEvents, extrasData map calls useMetrovizMilestoneEvents when mode === 'milestones' and useMetrovizData otherwise, effectiveMappings variable is gone</done>
</task>

</tasks>

<verification>
After both tasks:
- `npx nuxi typecheck` passes with no new errors
- In the browser, toggling an extra source to milestones mode should render vertical event markers on the timeline axis rather than metro lines
</verification>

<success_criteria>
- useMetrovizMilestoneEvents is exported from composables/useMetrovizData.ts
- MetrovizInputData.events is typed as Array<{date: string; label: string}> (not empty tuple)
- mergeMetrovizData merges events from all datasets via flatMap
- metrovizData computed in [sourceId].vue calls useMetrovizMilestoneEvents when mode === 'milestones'
- TypeScript reports no new errors
</success_criteria>

<output>
After completion, no SUMMARY.md needed for quick tasks — changes are self-contained.
</output>
