---
phase: quick
plan: 260614-sup
type: execute
wave: 1
depends_on: []
files_modified:
  - server/routes/api/mermaid/[templateId].get.ts
  - server/routes/api/mermaid/preview.post.ts
  - server/utils/templates.ts
  - README.md
autonomous: true
requirements: []
must_haves:
  truths:
    - "{{title}} --> {{parent}} in a template produces N Mermaid edges when parent has N relation targets"
    - "Templates require zero syntax change to benefit from multi-value expansion"
    - "_all fields never appear in the Handlebars context passed to templates"
    - "allRows (FilterPanel) is unaffected — one entry per Notion page, pre-expansion"
    - "group() by a relation field creates one group per relation target value"
  artifacts:
    - path: "server/routes/api/mermaid/[templateId].get.ts"
      provides: "expandRelationRows applied to visibleRows before context assignment"
    - path: "server/routes/api/mermaid/preview.post.ts"
      provides: "expandRelationRows applied to mappedRows before context assignment"
    - path: "server/utils/templates.ts"
      provides: "group helper uses String(row[field] ?? '') for map key coercion"
    - path: "README.md"
      provides: "Multi-value relation auto-expansion documented; no mention of _all suffix"
  key_links:
    - from: "resolveRelationValues (both route files)"
      to: "expandRelationRows"
      via: "called immediately after resolveRelationValues, before context[sourceName] assignment"
      pattern: "expandRelationRows(visibleRows)"
---

<objective>
Auto-expand multi-value Notion relation rows so that templates produce one Mermaid edge per relation target without any template syntax change.

Purpose: A row with parent=["A","B"] currently produces one edge (parent="A"). After this change it produces two expanded rows so `{{title}} --> {{parent}}` emits two edges — one per parent — transparently.

Output: `expandRelationRows` in both route files; `group` helper with string coercion; README docs for relation auto-expansion.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@server/routes/api/mermaid/[templateId].get.ts
@server/routes/api/mermaid/preview.post.ts
@server/utils/templates.ts
@README.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add expandRelationRows to both route files and apply to Handlebars context</name>
  <files>server/routes/api/mermaid/[templateId].get.ts, server/routes/api/mermaid/preview.post.ts</files>
  <action>
Add the following function to BOTH route files (just above the `export default defineEventHandler` line):

```typescript
// Expand rows with multi-value relation fields into multiple scalar rows.
// Each _all-suffixed string[] field (produced by resolveRelationValues) represents a
// relation role with N targets. This function cross-products all such arrays so that
// a row with parent_all=["A","B"] becomes 2 rows: {parent:"A"} and {parent:"B"}.
// _all fields are stripped from the output — they are internal, not for templates.
// Duplicate Mermaid node/edge declarations are harmless (Mermaid deduplicates them).
function expandRelationRows(rows: Record<string, unknown>[]): Record<string, string>[] {
  const result: Record<string, string>[] = []
  for (const row of rows) {
    const relationRoles = Object.keys(row)
      .filter(k => k.endsWith('_all') && Array.isArray(row[k]))
      .map(k => k.slice(0, -4))

    const baseRow: Record<string, string> = {}
    for (const [k, v] of Object.entries(row)) {
      if (!k.endsWith('_all') && typeof v === 'string') baseRow[k] = v
    }

    let expanded: Record<string, string>[] = [{ ...baseRow }]
    for (const role of relationRoles) {
      const vals = row[`${role}_all`] as string[]
      if (vals.length <= 1) continue  // baseRow already has the single value (or empty)
      expanded = expanded.flatMap(e => vals.map(v => ({ ...e, [role]: v })))
    }

    result.push(...expanded)
  }
  return result
}
```

In `[templateId].get.ts`, replace the current context assignment (line ~198):
```typescript
// BEFORE:
context[sourceName] = hiddenIds ? mappedRows.filter((r) => !hiddenIds.has(String(r['id'] ?? ''))) : mappedRows

// AFTER:
const visibleRows = hiddenIds ? mappedRows.filter((r) => !hiddenIds.has(String(r['id'] ?? ''))) : mappedRows
context[sourceName] = expandRelationRows(visibleRows)
```

The `allRows.push(...)` block above it must remain unchanged — `allRows` uses original `mappedRows` (pre-expansion, one entry per Notion page). The `resolveRelationValues` call already passes `hiddenIds` so `_all` arrays only contain non-hidden titles.

In `preview.post.ts`, replace the current context assignment (line ~151):
```typescript
// BEFORE:
await resolveRelationValues(mappedRows, pages, source, titleMap)
context[sourceName] = mappedRows

// AFTER:
await resolveRelationValues(mappedRows, pages, source, titleMap)
context[sourceName] = expandRelationRows(mappedRows)
```

No `hiddenIds` exists in preview — all rows are included, expansion covers all relation targets.
  </action>
  <verify>
    <automated>cd /Users/sebastianwiller/Documents/github/vizu-notion-local && npx nuxi typecheck 2>&1 | tail -20</automated>
  </verify>
  <done>Both route files contain expandRelationRows; context[sourceName] is assigned expandRelationRows output; _all fields not present in Handlebars context; allRows unchanged in [templateId].get.ts</done>
</task>

<task type="auto">
  <name>Task 2: Harden group helper + update README docs for relation auto-expansion</name>
  <files>server/utils/templates.ts, README.md</files>
  <action>
In `server/utils/templates.ts`, update the `group` helper to use String coercion for the map key. The current line:
```typescript
const key = row[field] ?? ''
```
Change to:
```typescript
const key = String(row[field] ?? '')
```
This is a safety measure — expanded rows are `Record<string, string>` so values are already strings, but the explicit coercion guards against edge cases and satisfies the TypeScript type for Map keys.

In `README.md`, update the "Rows and node visibility" callout block (currently around line 181). Add a new sentence after the existing text describing hidden-node filtering:

Find the block that starts with `> **Rows and node visibility:**` and append:

> **Multi-value relation fields auto-expand.** When a Notion relation property contains multiple targets (e.g. a project linked to two parent categories), the row is automatically expanded into one row per target before the template runs. This means `{{title}} --> {{parent}}` produces one edge per related page — no template changes required. Grouping by a relation field (e.g. `{{#each (group sourceName "parent")}}`) likewise creates one group per relation target value.

Also verify there is NO mention of `_all` suffix in the README. The previous quick task (260614-rrw) may not have added any, but search and remove any reference if found (the `_all` fields are internal implementation details, not a template-facing feature).
  </action>
  <verify>
    <automated>cd /Users/sebastianwiller/Documents/github/vizu-notion-local && grep -n "_all" README.md; echo "---"; grep -n "String(row\[field\]" server/utils/templates.ts</automated>
  </verify>
  <done>group helper uses String() coercion; README documents auto-expansion for multi-value relations; no _all mention in README</done>
</task>

</tasks>

<verification>
After both tasks:
1. `npx nuxi typecheck` passes with no new errors
2. `grep "_all" README.md` returns nothing
3. `grep "expandRelationRows" server/routes/api/mermaid/[templateId].get.ts` shows the function and its call site
4. `grep "expandRelationRows" server/routes/api/mermaid/preview.post.ts` shows the function and its call site
5. The `allRows.push(...)` block in `[templateId].get.ts` still references `mappedRows` (pre-expansion), not `visibleRows`
</verification>

<success_criteria>
- A template with `{{title}} --> {{parent}}` where parent is a multi-value relation field produces N edges (one per target) without any template change
- `_all` fields are absent from all Handlebars template contexts
- FilterPanel `allRows` data is unaffected (one entry per Notion page)
- TypeScript compilation passes
- README accurately documents multi-value relation auto-expansion behavior
</success_criteria>

<output>
After completion, create `.planning/quick/260614-sup-auto-expand-multi-value-relation-rows-so/260614-sup-SUMMARY.md`
</output>
