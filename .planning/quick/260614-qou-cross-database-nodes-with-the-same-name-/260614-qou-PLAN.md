---
phase: quick
plan: 260614-qou
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
    - "Two sources with identically-named nodes produce distinct Mermaid node IDs"
    - "Edges referencing a node from source A never collapse onto a node from source B"
    - "Nodes from a single source (or templates with only one source) behave identically to before"
  artifacts:
    - path: "server/utils/templates.ts"
      provides: "stableId(value, scope?) accepts optional scope; rewriteTemplateBody() exported shared utility"
      exports: ["stableId", "rewriteTemplateBody", "loadTemplates", "getTemplates"]
    - path: "server/routes/api/mermaid/preview.post.ts"
      provides: "Uses rewriteTemplateBody() instead of inline rewriter"
  key_links:
    - from: "server/utils/templates.ts rewriteTemplateBody()"
      to: "Handlebars nodeId helper"
      via: "source= hash arg injected into {{nodeId}} calls inside {{#each SourceName}} blocks"
      pattern: "nodeId.*source="
    - from: "Handlebars nodeId helper"
      to: "stableId(value, scope)"
      via: "options.hash.source passed as scope arg"
      pattern: "stableId\\(.*source"
---

<objective>
Fix cross-database node ID collision: two Notion sources sharing a node label (e.g. "Project Alpha") currently hash to the same Mermaid node ID because `stableId` hashes only the label text. The fix scopes the hash by source name so cross-database nodes with identical labels get distinct IDs.

Purpose: Templates spanning multiple sources render a single merged node when labels collide — edges from both databases point to one node, producing incorrect diagrams.
Output: `stableId(value, scope?)` takes an optional scope; the template rewriter injects `source="SourceName"` into every `{{nodeId}}` call inside `{{#each SourceName}}` blocks; both routes use the shared rewriter.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@server/utils/templates.ts
@server/routes/api/mermaid/preview.post.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extend stableId and extract shared rewriteTemplateBody utility</name>
  <files>server/utils/templates.ts</files>
  <action>
Make two changes to `server/utils/templates.ts`:

**1. Update `stableId` to accept an optional scope parameter:**

```typescript
function stableId(value: string, scope = ''): string {
  const input = scope ? `${scope}\x00${value}` : value
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return 'n' + h.toString(36).padStart(6, '0')
}
```

The null byte separator (`\x00`) prevents "ab" + "c" from colliding with "a" + "bc".

**2. Update the `nodeId` Handlebars helper to pass `source` from hash args to `stableId`:**

```typescript
Handlebars.registerHelper('nodeId', function(_attrName: string, value: unknown, options?: Handlebars.HelperOptions) {
  const source = (options?.hash?.source as string) ?? ''
  const id = stableId(String(value ?? ''), source)
  // ... rest unchanged
})
```

**3. Extract the rewriter as an exported function `rewriteTemplateBody(body, styles)`:**

Move the inline rewriter from inside `loadTemplates` into a standalone exported function so `preview.post.ts` can import and use it instead of duplicating the logic. The function signature:

```typescript
export function rewriteTemplateBody(body: string, styles: StylesMap): string
```

The rewriter must become block-aware. Replace the current `body.split('\n').map(line => ...)` approach with a loop that tracks the current `{{#each SourceName}}` block:

```typescript
export function rewriteTemplateBody(body: string, styles: StylesMap): string {
  const HB_KEYWORDS = new Set(['else', 'this', 'log'])
  const lines = body.split('\n')
  let currentSource = ''            // name of the active {{#each X}} block, '' if none
  const eachDepth: string[] = []    // stack to handle nested #each

  return lines.map(line => {
    const trimmed = line.trimStart()

    // Track {{#each SourceName}} open — capture the source name
    const eachOpen = trimmed.match(/^\{\{#each\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/)
    if (eachOpen) {
      eachDepth.push(currentSource)
      currentSource = eachOpen[1]!
      return line   // don't rewrite the #each line itself
    }

    // Track {{/each}} close
    if (trimmed.startsWith('{{/each}}')) {
      currentSource = eachDepth.pop() ?? ''
      return line
    }

    // Don't rewrite classDef or subgraph directives
    if (trimmed.startsWith('classDef ') || trimmed.startsWith('subgraph ')) {
      return line
    }

    return line.replace(
      /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g,
      (match, name) => {
        if (HB_KEYWORDS.has(name)) return match
        const style = styles[name]
        const sourcePart = currentSource ? ` source="${currentSource}"` : ''
        if (!style) return `{{nodeId "${name}" ${name}${sourcePart}}}`
        const shapePart = style.shape ? ` shape="${style.shape}"` : ''
        const hasColor = !!(style.fill || style.stroke || style['stroke-width'] != null)
        const classPart = hasColor ? ` className="cls_${name}"` : ''
        return `{{nodeId "${name}" ${name}${shapePart}${classPart}${sourcePart}}}`
      }
    )
  }).join('\n')
}
```

In `loadTemplates`, replace the inline rewriter with a call to `rewriteTemplateBody(body, styles)`.
  </action>
  <verify>npx tsc --noEmit 2>&1 | head -30</verify>
  <done>TypeScript compiles without errors. `stableId` accepts optional second arg. `rewriteTemplateBody` is exported. `loadTemplates` calls `rewriteTemplateBody` instead of inline logic.</done>
</task>

<task type="auto">
  <name>Task 2: Update preview.post.ts to use shared rewriteTemplateBody</name>
  <files>server/routes/api/mermaid/preview.post.ts</files>
  <action>
In `preview.post.ts`:

1. Import `rewriteTemplateBody` from `../../../utils/templates`:
   ```typescript
   import { getTemplates, buildClassDefs, resetClassAccumulator, getClassAssignments, rewriteTemplateBody } from '../../../utils/templates'
   ```

2. Remove the inline `rewrittenBody` block (lines ~145-162 in current file — the `.split('\n').map(...)` chain).

3. Also remove the local `HB_KEYWORDS` constant (line 90) since it moves into `rewriteTemplateBody`.

4. Replace with:
   ```typescript
   const rewrittenBody = rewriteTemplateBody(bodyText, styles)
   ```

The rest of the handler (compile, render, classDefBlock, classAssignments) stays unchanged.
  </action>
  <verify>npx tsc --noEmit 2>&1 | head -30</verify>
  <done>TypeScript compiles without errors. `preview.post.ts` has no inline rewriter block and no local `HB_KEYWORDS`. It imports and calls `rewriteTemplateBody`.</done>
</task>

</tasks>

<verification>
After both tasks:
- `npx tsc --noEmit` exits 0
- Manual check: open `server/utils/templates.ts` and confirm `stableId('foo', 'A') !== stableId('foo', 'B')` — evaluate mentally: different input strings produce different FNV-1a hashes
- Confirm `rewriteTemplateBody` is exported and `loadTemplates` calls it
- Confirm `preview.post.ts` imports `rewriteTemplateBody` and has no duplicated inline rewriter
</verification>

<success_criteria>
- `stableId(value, scope)` hashes `scope\x00value` when scope is non-empty
- `nodeId` Handlebars helper reads `options.hash.source` and passes it to `stableId`
- `rewriteTemplateBody` injects `source="X"` into `{{nodeId}}` calls when inside `{{#each X}}` blocks
- Both `loadTemplates` (templates.ts) and `preview.post.ts` use the same rewriter via the exported function — no duplication
- TypeScript compiles clean
</success_criteria>

<output>
After completion, create `.planning/quick/260614-qou-cross-database-nodes-with-the-same-name-/260614-qou-SUMMARY.md`
</output>
