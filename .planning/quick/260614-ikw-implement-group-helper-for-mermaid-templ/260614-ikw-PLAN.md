---
phase: quick
plan: 260614-ikw
type: execute
wave: 1
depends_on: []
files_modified:
  - server/utils/templates.ts
  - server/routes/api/mermaid/preview.post.ts
autonomous: true
requirements: []
must_haves:
  truths:
    - "{{#each (group SourceName 'fieldName')}} iterates over distinct groups"
    - "Inside the each block, {{fieldName}} resolves to the group key"
    - "{{#group-item}}...{{/group-item}} iterates over each item in the group, with row fields (e.g. {{title}}) available"
    - "Works in both file-based templates ([templateId].get.ts path) and the live preview editor (preview.post.ts path)"
  artifacts:
    - path: "server/utils/templates.ts"
      provides: "group helper + group-item block helper registered with Handlebars"
    - path: "server/routes/api/mermaid/preview.post.ts"
      provides: "Same helpers available in preview path (via templates.ts import)"
  key_links:
    - from: "templates.ts Handlebars.registerHelper('group')"
      to: "{{#each (group Projekte 'product')}}"
      via: "Handlebars subexpression call syntax"
    - from: "templates.ts Handlebars.registerHelper('group-item')"
      to: "{{#group-item}}...{{/group-item}}"
      via: "block helper iterating this.items"
---

<objective>
Add `group()` and `group-item` Handlebars helpers to the mermaid template engine so templates can group rows by a field value.

Purpose: Enables Mermaid templates to render block-level groupings (e.g., Mermaid `block` diagrams, subgraphs) where rows from a source are clustered by a categorical property value.

Output: Two new Handlebars helpers registered in templates.ts; preview.post.ts already imports templates.ts so helpers are automatically available in the editor path.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@server/utils/templates.ts
@server/routes/api/mermaid/preview.post.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Register group() and group-item helpers in templates.ts</name>
  <files>server/utils/templates.ts</files>
  <action>
Add two Handlebars helpers after the existing `nodeId` helper registration:

**Helper 1 — `group` (value helper, called via subexpression):**

```typescript
// group helper: called as (group arrayOfRows "fieldName") inside {{#each}}.
// Returns an array of { [fieldName]: key, items: rows[] } objects — one per distinct
// value of fieldName in the input array.
// The group key is exposed as a direct property named after the field (not "key")
// so {{fieldName}} resolves naturally in the outer #each block and gets rewritten
// to {{nodeId "fieldName" fieldName}} by the template rewriter — same as bare field refs.
// Empty/undefined values are grouped under the empty string key.
Handlebars.registerHelper('group', function(array: Record<string, string>[], field: string) {
  if (!Array.isArray(array) || !field) return []
  const map = new Map<string, Record<string, string>[]>()
  for (const row of array) {
    const key = row[field] ?? ''
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(row)
  }
  return Array.from(map.entries()).map(([key, items]) => ({
    [field]: key,
    items,
  }))
})
```

**Helper 2 — `group-item` (block helper):**

```typescript
// group-item block helper: called as {{#group-item}}...{{/group-item}} inside
// {{#each (group ...)}} block. `this` in the outer each is { [field]: key, items: rows[] }.
// group-item iterates over this.items and renders the block body once per item.
// The inner context is the individual row object, so {{title}} etc. work normally.
Handlebars.registerHelper('group-item', function(this: { items?: Record<string, string>[] }, options: Handlebars.HelperOptions) {
  const items = this.items ?? []
  return new Handlebars.SafeString(
    items.map((item) => options.fn(item)).join('')
  )
})
```

Place both helpers in `server/utils/templates.ts` immediately after the existing `nodeId` helper (around line 30), before the `MermaidTemplate` interface declaration.

**Rewriter note:** The existing rewriter regex `\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}` only touches bare `{{word}}` expressions. It already correctly skips:
- `{{#each (group ...)}}` — block expression, not matched
- `{{#group-item}}` — block helper open tag, not matched
- `{{/group-item}}` — closing tag, not matched
- `{{product}}` inside the outer each — matched and rewritten to `{{nodeId "product" product}}` — CORRECT, this is the group key field and should render as a node label
- `{{title}}` inside group-item — matched and rewritten to `{{nodeId "title" title}}` — CORRECT

No rewriter changes needed.
  </action>
  <verify>
    Start the Nuxt dev server and POST to /api/mermaid/preview with a body containing:
    ```
    content: "---\nsources:\n  - Projekte\n---\nflowchart TD\n{{#each (group Projekte \"product\")}}\n  subgraph {{product}}\n  {{#group-item}}\n    {{title}}\n  {{/group-item}}\n  end\n{{/each}}"
    ```
    Should return a diagramString with one subgraph per distinct `product` value, containing node definitions for each item in that group.

    TypeScript compile check: `npx nuxi build` (or `npx tsc --noEmit`) should pass with no type errors.
  </verify>
  <done>
    - `group` helper registered: takes (array, fieldName), returns [{[fieldName]: key, items: rows[]}]
    - `group-item` block helper registered: iterates this.items, renders block body per item
    - Both helpers usable in file-based templates AND preview editor (preview.post.ts imports templates.ts)
    - No TypeScript errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Add example usage to mermaid.example and update README</name>
  <files>config/mermaid.example, README.md</files>
  <action>
**config/mermaid.example:** Append a new section showing group() usage. Add after the existing `{{#unless @first}}` example block:

```
  %% Example: group rows by a field value (e.g. group by "product")
  %% (group sourceName "fieldName") returns [{fieldName: key, items: rows[]}]
  %% Use {{#group-item}}...{{/group-item}} inside #each to iterate grouped items.
  {{#each (group my-source "product")}}
  subgraph {{product}}
    {{#group-item}}
    {{title}}
    {{/group-item}}
  end
  {{/each}}
```

**README.md:** Find the "Handlebars template helpers" or "Mermaid Templates" section (whichever exists). Add a `group()` / `group-item` entry explaining:
- Syntax: `{{#each (group SourceName "fieldName")}}...{{/each}}`
- Inside the each: `{{fieldName}}` gives the group key
- `{{#group-item}}...{{/group-item}}` iterates each row in the group
- Fields inside `{{#group-item}}` behave like normal `{{#each}}` item fields

Find the existing template helpers documentation (search for "nodeId" in README.md) and add adjacent to it.
  </action>
  <verify>
    `grep -n "group" README.md` shows the new group() section.
    `grep -n "group" config/mermaid.example` shows the example block.
  </verify>
  <done>
    - mermaid.example contains a commented group() usage example
    - README.md Mermaid Templates section documents group() and group-item block helper with syntax and field access rules
  </done>
</task>

</tasks>

<verification>
After both tasks:
1. `grep -n "registerHelper('group" server/utils/templates.ts` — confirms both helpers registered
2. Server starts without error: `npx nuxi dev` shows no TypeScript errors
3. Preview API responds correctly to a group() template (manual curl or editor test)
4. README and mermaid.example updated with group() docs
</verification>

<success_criteria>
- Template authors can write `{{#each (group Projekte "product")}}...{{#group-item}}...{{/group-item}}{{/each}}`
- The group key field renders as a Mermaid node (via nodeId rewriter)
- Inner items render their fields normally within the group-item block
- Works in both file-based (.mmd) and live-preview editor paths
- No breaking changes to existing helpers or templates
</success_criteria>

<output>
After completion, create `.planning/quick/260614-ikw-implement-group-helper-for-mermaid-templ/260614-ikw-SUMMARY.md`
</output>
