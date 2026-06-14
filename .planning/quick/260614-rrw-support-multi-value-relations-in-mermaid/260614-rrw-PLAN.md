---
type: quick
id: 260614-rrw
wave: 1
depends_on: []
files_modified:
  - server/routes/api/mermaid/[templateId].get.ts
  - server/routes/api/mermaid/preview.post.ts
autonomous: true

must_haves:
  truths:
    - "row[role] still equals the first non-hidden relation title (backward compat)"
    - "row[role + '_all'] is an array of all non-hidden relation titles for that role"
    - "Hidden page IDs are excluded from both the single value and the _all array in [templateId].get.ts"
    - "preview.post.ts includes all relation titles (no hiddenIds filtering)"
    - "Templates can iterate {{#each parent_all}} to emit one edge per relation target"
  artifacts:
    - path: "server/routes/api/mermaid/[templateId].get.ts"
      provides: "resolveRelationValues with hiddenIds, produces role + role_all"
    - path: "server/routes/api/mermaid/preview.post.ts"
      provides: "resolveRelationValues without hiddenIds, produces role + role_all"
  key_links:
    - from: "resolveRelationValues (toFetch loop)"
      to: "ALL relation IDs per page (not just [0])"
      pattern: "for.*rel.*of.*relation"
    - from: "row[role + '_all']"
      to: "template {{#each parent_all}}"
      via: "Handlebars context passed to compiled template"
---

<objective>
Support multi-value Notion relation properties in Mermaid templates.

Currently `resolveRelationValues` only resolves the first related page (`[0]`), so templates can only render a single edge per relation role. This change makes every relation target available in the Handlebars context.

Purpose: Enable template authors to write `{{#each parent_all}}` to emit one Mermaid edge per relation target, while keeping `{{parent}}` backward-compatible for existing single-relation templates.

Output:
- Both route files updated with multi-value `resolveRelationValues`
- `row[role]` = first non-hidden title (unchanged semantics for existing templates)
- `row[role + "_all"]` = `string[]` of all non-hidden titles (new field for multi-edge templates)
- `mappedRows` type widened to `Record<string, unknown>[]` in both files
</objective>

<context>
@.planning/STATE.md
@server/routes/api/mermaid/[templateId].get.ts
@server/routes/api/mermaid/preview.post.ts

<interfaces>
<!-- Current resolveRelationValues signature in [templateId].get.ts -->
async function resolveRelationValues(
  rows: Record<string, string>[],
  pages: PageObjectResponse[],
  source: Source,
  titleMap: Map<string, string>
): Promise<void>

<!-- Current resolveRelationValues signature in preview.post.ts — identical, no hiddenIds -->
async function resolveRelationValues(
  rows: Record<string, string>[],
  pages: PageObjectResponse[],
  source: Source,
  titleMap: Map<string, string>
): Promise<void>

<!-- Key Notion property shape for relation fields -->
// page.properties[notionPropName].relation: Array<{ id: string }>
// ALL items must be iterated — currently only [0] is used

<!-- context shape (both files) -->
const context: Record<string, Record<string, string>[]> = {}
// Must become: Record<string, Record<string, unknown>[]>
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update resolveRelationValues in [templateId].get.ts to produce _all arrays with hiddenIds filtering</name>
  <files>server/routes/api/mermaid/[templateId].get.ts</files>
  <action>
Make three targeted changes to this file:

**1. Widen `toFetch` collection loop** — iterate ALL relation IDs per page, not just `[0]`:

In the "Collect related page IDs not yet in titleMap" loop, replace the `const firstId = ...relation[0]?.id` pattern with a loop over the full `.relation` array:

```typescript
const prop = page.properties[notionPropName]
if ((prop as any)?.type === 'relation') {
  for (const rel of ((prop as any).relation as Array<{ id: string }>) ?? []) {
    if (rel.id && !titleMap.has(rel.id)) toFetch.add(rel.id)
  }
}
```

**2. Add `hiddenIds` parameter to `resolveRelationValues`** — add optional `hiddenIds?: Set<string>` as the last parameter. Update the call site at line ~174 to pass the local `hiddenIds` variable (already a `Set<string> | null` — pass `hiddenIds ?? undefined`).

**3. Rewrite the "Write resolved titles back" loop** to produce both `role` (first visible) and `role_all` (all visible):

```typescript
for (let i = 0; i < pages.length; i++) {
  const page = pages[i]
  const row = rows[i]!
  for (const { role, notionPropName } of relationRoles) {
    const prop = page.properties[notionPropName]
    if ((prop as any)?.type === 'relation') {
      const allIds: string[] = ((prop as any).relation as Array<{ id: string }>) ?? []
      const allTitles = allIds
        .filter(rel => rel.id && (!hiddenIds || !hiddenIds.has(rel.id)))
        .map(rel => titleMap.get(rel.id) ?? '')
        .filter(t => t !== '')  // skip titles that didn't resolve (deleted pages, etc.)
      row[role] = allTitles[0] ?? ''
      ;(row as Record<string, unknown>)[role + '_all'] = allTitles
    }
  }
}
```

**4. Widen types** — change:
- `resolveRelationValues` parameter: `rows: Record<string, string>[]` → `rows: Record<string, unknown>[]`
- `mappedRows` local variable type (line ~161): `Record<string, string>` → `Record<string, unknown>`
- `context` declaration type: `Record<string, Record<string, string>[]>` → `Record<string, Record<string, unknown>[]>`
- `allRows` push: `row['id']` and `row['title']` casts may need `as string` since row is now `unknown`-valued — use `String(row['id'] ?? '')` and `String(row['title'] ?? '')`

Do NOT change the `extractRelationIds` function, `allRows` shape, or any classDef/rendering logic.
  </action>
  <verify>
    <automated>cd /Users/sebastianwiller/Documents/github/vizu-notion-local && npx tsc --noEmit 2>&1 | head -40</automated>
  </verify>
  <done>
    - `resolveRelationValues` accepts optional `hiddenIds?: Set&lt;string&gt;`
    - All relation IDs per page are fetched (not just first)
    - `row[role]` = first non-hidden title string (backward compat)
    - `row[role + "_all"]` = string[] of all non-hidden titles
    - `mappedRows` typed as `Record&lt;string, unknown&gt;[]`
    - TypeScript compile passes with no new errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Update resolveRelationValues in preview.post.ts to produce _all arrays (no hiddenIds)</name>
  <files>server/routes/api/mermaid/preview.post.ts</files>
  <action>
Apply the same multi-value changes as Task 1 but WITHOUT the `hiddenIds` parameter (preview has no filtering).

**1. Widen `toFetch` collection loop** — iterate ALL relation IDs per page:

Replace `const firstId = ...relation[0]?.id` with:
```typescript
for (const rel of ((prop as any).relation as Array<{ id: string }>) ?? []) {
  if (rel.id && !titleMap.has(rel.id)) toFetch.add(rel.id)
}
```

**2. Rewrite the "Write resolved titles back" loop** to produce both fields (no hidden filtering here):

```typescript
for (let i = 0; i < pages.length; i++) {
  const page = pages[i]
  const row = rows[i]!
  for (const { role, notionPropName } of relationRoles) {
    const prop = page.properties[notionPropName]
    if ((prop as any)?.type === 'relation') {
      const allIds: string[] = ((prop as any).relation as Array<{ id: string }>) ?? []
      const allTitles = allIds
        .filter(rel => rel.id)
        .map(rel => titleMap.get(rel.id) ?? '')
        .filter(t => t !== '')
      row[role] = allTitles[0] ?? ''
      ;(row as Record<string, unknown>)[role + '_all'] = allTitles
    }
  }
}
```

**3. Widen types** — change:
- `resolveRelationValues` parameter: `rows: Record<string, string>[]` → `rows: Record<string, unknown>[]`
- `mappedRows` local variable type (line ~129): `Record<string, string>` → `Record<string, unknown>`
- `context` declaration type: `Record<string, Record<string, string>[]>` → `Record<string, Record<string, unknown>[]>`

Do NOT add a `hiddenIds` parameter — preview has no visibility filter. Do NOT change any classDef, rewriteTemplateBody, or Handlebars.compile logic.
  </action>
  <verify>
    <automated>cd /Users/sebastianwiller/Documents/github/vizu-notion-local && npx tsc --noEmit 2>&1 | head -40</automated>
  </verify>
  <done>
    - `resolveRelationValues` in preview.post.ts fetches all relation IDs per page
    - `row[role]` = first title string (backward compat)
    - `row[role + "_all"]` = string[] of all titles (no filtering)
    - `mappedRows` typed as `Record&lt;string, unknown&gt;[]`
    - TypeScript compile passes with no new errors
    - No hiddenIds parameter added (preview is filter-free)
  </done>
</task>

</tasks>

<verification>
After both tasks complete:

1. TypeScript check passes: `npx tsc --noEmit` — zero new errors
2. Both routes compile: Nuxt dev server starts without TS/module errors
3. Manual spot-check: existing single-relation template still renders correctly (row[role] = first title, same as before)
4. For a page with multiple relation targets: `row[role_all]` contains all titles, `row[role]` = first one
</verification>

<success_criteria>
- Handlebars context includes `role_all: string[]` for every relation-type columnMapping role
- Hidden page IDs excluded from both `role` and `role_all` in [templateId].get.ts
- preview.post.ts includes all titles (no exclusion)
- Existing templates using `{{parent}}` continue to work unchanged
- New templates can use `{{#each parent_all}} ... {{/each}}` to emit one edge per target
- TypeScript compiles cleanly in both files
</success_criteria>

<output>
After completion, create `.planning/quick/260614-rrw-support-multi-value-relations-in-mermaid/260614-rrw-SUMMARY.md`
</output>
