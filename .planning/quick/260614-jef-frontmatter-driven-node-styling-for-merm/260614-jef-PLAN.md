---
phase: quick
plan: 260614-jef
type: execute
wave: 1
depends_on: []
files_modified:
  - server/utils/templates.ts
  - server/routes/api/mermaid/[templateId].get.ts
  - server/routes/api/mermaid/preview.post.ts
autonomous: true
requirements: []

must_haves:
  truths:
    - "A template with styles.parent.shape=rounded renders parent nodes with () brackets"
    - "A template with styles.title.fill=#fff emits a classDef line and appends :::style-title suffix to title nodes"
    - "A template with no styles key behaves identically to current behavior"
    - "Only shape set (no fill/stroke) applies shape brackets but emits no classDef and no ::: suffix"
    - "The rewriter does NOT inject shape arg on lines starting with classDef or subgraph"
  artifacts:
    - path: "server/utils/templates.ts"
      provides: "Updated nodeId helper with shape+className hash options; styles parsed into MermaidTemplate; rewriter injects shape= for styled fields"
      exports: ["MermaidTemplate", "loadTemplates", "getTemplates"]
    - path: "server/routes/api/mermaid/[templateId].get.ts"
      provides: "classDef lines prepended to diagramString at render time using template.styles"
    - path: "server/routes/api/mermaid/preview.post.ts"
      provides: "Same styles-aware rewriter and classDef injection for live preview"
  key_links:
    - from: "server/utils/templates.ts (rewriter)"
      to: "nodeId helper"
      via: "shape= hash arg in rewritten {{nodeId}} call"
      pattern: 'nodeId "[^"]+" \w+ shape="\w+"'
    - from: "server/routes/api/mermaid/[templateId].get.ts"
      to: "template.styles"
      via: "classDef prepend after template.compiled(context)"
      pattern: "classDef style-"
---

<objective>
Add frontmatter-driven node styling to the Mermaid template engine. Admins declare a `styles` map in template frontmatter; the engine auto-injects Mermaid shape bracket syntax and classDef color definitions — zero template body changes required.

Purpose: Enables visually rich diagrams (colored, shaped nodes) from a single config declaration, consistent with the project's config-over-code value.
Output: Updated templates.ts, [templateId].get.ts, and preview.post.ts.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@server/utils/templates.ts
@server/routes/api/mermaid/[templateId].get.ts
@server/routes/api/mermaid/preview.post.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extend nodeId helper and rewriter in templates.ts</name>
  <files>server/utils/templates.ts</files>
  <action>
**1. Add StyleEntry type and SHAPE_BRACKETS map above the nodeId helper:**

```typescript
type StyleEntry = {
  shape?: 'rectangle' | 'rounded' | 'circle' | 'cylindrical' | 'diamond' | 'stadium'
  fill?: string
  stroke?: string
  'stroke-width'?: number
}

type StylesMap = Record<string, StyleEntry>

const SHAPE_BRACKETS: Record<string, [string, string]> = {
  rectangle:   ['["', '"]'],
  rounded:     ['("',  '")'],
  circle:      ['(("', '"))'],
  cylindrical: ['[("', '")]'],  // Note: Mermaid uses [(label)] for cylindrical
  diamond:     ['{"',  '"}'],
  stadium:     ['(["', '"])'],
}
```

**2. Replace the existing `nodeId` Handlebars helper registration with this:**

```typescript
Handlebars.registerHelper('nodeId', function(_attrName: string, value: unknown, options?: Handlebars.HelperOptions) {
  const id = stableId(String(value ?? ''))
  const safeLabel = String(value ?? '').replace(/["[\]{}()]/g, '')
  const shape = (options?.hash?.shape as string) ?? 'rectangle'
  const className = options?.hash?.className as string | undefined
  const [open, close] = SHAPE_BRACKETS[shape] ?? SHAPE_BRACKETS['rectangle']!
  const suffix = className ? `:::${className}` : ''
  return new Handlebars.SafeString(`${id}${open}${safeLabel}${close}${suffix}`)
})
```

**3. Add `styles` field to MermaidTemplate interface:**

```typescript
export interface MermaidTemplate {
  id: string
  title: string
  sources: string[]
  styles: StylesMap   // ← add this field (empty object when not declared)
  body: string
  compiled: Handlebars.TemplateDelegate
}
```

**4. Extract styles from frontmatter in loadTemplates(), just after the sources validation block:**

```typescript
const styles: StylesMap = (typeof data.styles === 'object' && data.styles !== null)
  ? (data.styles as StylesMap)
  : {}
```

**5. Replace the rewriter logic inside the try block in loadTemplates():**

The current rewriter:
```typescript
const rewrittenBody = body.replace(
  /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g,
  (match, name) => HB_KEYWORDS.has(name) ? match : `{{nodeId "${name}" ${name}}}`
)
```

Replace with a line-aware rewriter that:
- Splits body into lines
- For each line: if the trimmed line starts with `classDef` or `subgraph`, leave all `{{field}}` occurrences on that line untouched (no nodeId injection)
- Otherwise: apply the standard rewrite, but for styled fields inject `shape="X"` and `className="style-{name}"` hash args

```typescript
const rewrittenBody = body.split('\n').map(line => {
  const trimmed = line.trimStart()
  // Don't rewrite inside classDef or subgraph directives
  if (trimmed.startsWith('classDef ') || trimmed.startsWith('subgraph ')) {
    return line
  }
  return line.replace(
    /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g,
    (match, name) => {
      if (HB_KEYWORDS.has(name)) return match
      const style = styles[name]
      if (!style) return `{{nodeId "${name}" ${name}}}`
      const shapePart = style.shape ? ` shape="${style.shape}"` : ''
      const hasColor = style.fill || style.stroke || style['stroke-width'] != null
      const classPart = hasColor ? ` className="style-${name}"` : ''
      return `{{nodeId "${name}" ${name}${shapePart}${classPart}}}`
    }
  )
}).join('\n')
```

**6. Add `styles` to the push call at the end of the for loop:**

```typescript
templates.push({
  id: file.replace(/\.mmd$/, ''),
  title: data.title as string,
  sources: data.sources as string[],
  styles,                          // ← add
  body: body.trim(),
  compiled,
})
```

Note on safeLabel: also escape `{` and `}` characters in the label since Mermaid uses them for diamond syntax. The updated regex in nodeId helper above already does this.
  </action>
  <verify>npx tsc --noEmit 2>&1 | head -30</verify>
  <done>TypeScript compiles without errors; MermaidTemplate has styles field; nodeId helper accepts shape and className hash options</done>
</task>

<task type="auto">
  <name>Task 2: Inject classDef lines at render time in [templateId].get.ts</name>
  <files>server/routes/api/mermaid/[templateId].get.ts</files>
  <action>
After `diagramString = template.compiled(context)` succeeds (inside the try block), prepend `classDef` lines for any style entry that declares color properties.

**Add a helper function near the top of the file (after imports):**

```typescript
function buildClassDefs(styles: Record<string, { shape?: string; fill?: string; stroke?: string; 'stroke-width'?: number }>): string {
  const lines: string[] = []
  for (const [attrName, entry] of Object.entries(styles)) {
    const hasColor = entry.fill || entry.stroke || entry['stroke-width'] != null
    if (!hasColor) continue
    const parts: string[] = []
    if (entry.fill) parts.push(`fill:${entry.fill}`)
    if (entry.stroke) parts.push(`stroke:${entry.stroke}`)
    if (entry['stroke-width'] != null) parts.push(`stroke-width:${entry['stroke-width']}px`)
    lines.push(`classDef style-${attrName} ${parts.join(',')}`)
  }
  return lines.join('\n')
}
```

**After `diagramString = template.compiled(context)` and before `return { ... }`:**

```typescript
const classDefBlock = buildClassDefs(template.styles)
if (classDefBlock) {
  diagramString = classDefBlock + '\n' + diagramString
}
```

The `template.styles` field is now available from the updated MermaidTemplate interface. No other changes needed to this file.
  </action>
  <verify>npx tsc --noEmit 2>&1 | head -30</verify>
  <done>TypeScript compiles; classDef lines are prepended when styles with color properties exist</done>
</task>

<task type="auto">
  <name>Task 3: Replicate styles-aware rewriter and classDef injection in preview.post.ts</name>
  <files>server/routes/api/mermaid/preview.post.ts</files>
  <action>
The preview endpoint has its own copy of the rewriter and does not use the precompiled template — it compiles on-the-fly from raw content. Apply the same changes as Task 1 and Task 2 but inline.

**1. Add the same SHAPE_BRACKETS constant and buildClassDefs helper at the top of the file (after imports, before the HB_KEYWORDS Set):**

```typescript
const SHAPE_BRACKETS: Record<string, [string, string]> = {
  rectangle:   ['["', '"]'],
  rounded:     ['("',  '")'],
  circle:      ['(("', '"))'],
  cylindrical: ['[("', '")]'],
  diamond:     ['{"',  '"}'],
  stadium:     ['(["', '"])'],
}

function buildClassDefs(styles: Record<string, any>): string {
  const lines: string[] = []
  for (const [attrName, entry] of Object.entries(styles)) {
    if (!entry || typeof entry !== 'object') continue
    const hasColor = entry.fill || entry.stroke || entry['stroke-width'] != null
    if (!hasColor) continue
    const parts: string[] = []
    if (entry.fill) parts.push(`fill:${entry.fill}`)
    if (entry.stroke) parts.push(`stroke:${entry.stroke}`)
    if (entry['stroke-width'] != null) parts.push(`stroke-width:${entry['stroke-width']}px`)
    lines.push(`classDef style-${attrName} ${parts.join(',')}`)
  }
  return lines.join('\n')
}
```

**2. After `const { data, content: bodyText } = matter(rawContent)`, extract styles:**

```typescript
const styles: Record<string, any> = (typeof data.styles === 'object' && data.styles !== null)
  ? data.styles
  : {}
```

**3. Replace the existing rewriter near the bottom of the handler:**

Current code:
```typescript
const rewrittenBody = bodyText.replace(
  /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g,
  (match, name) => HB_KEYWORDS.has(name) ? match : `{{nodeId "${name}" ${name}}}`
)
```

Replace with the same line-aware rewriter from Task 1:
```typescript
const rewrittenBody = bodyText.split('\n').map(line => {
  const trimmed = line.trimStart()
  if (trimmed.startsWith('classDef ') || trimmed.startsWith('subgraph ')) {
    return line
  }
  return line.replace(
    /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g,
    (match, name) => {
      if (HB_KEYWORDS.has(name)) return match
      const style = styles[name]
      if (!style) return `{{nodeId "${name}" ${name}}}`
      const shapePart = style.shape ? ` shape="${style.shape}"` : ''
      const hasColor = style.fill || style.stroke || style['stroke-width'] != null
      const classPart = hasColor ? ` className="style-${name}"` : ''
      return `{{nodeId "${name}" ${name}${shapePart}${classPart}}}`
    }
  )
}).join('\n')
```

**4. After `diagramString = Handlebars.compile(rewrittenBody)(context)` succeeds, prepend classDef block:**

```typescript
const classDefBlock = buildClassDefs(styles)
if (classDefBlock) {
  diagramString = classDefBlock + '\n' + diagramString
}
```

**5. Verify the return statement still uses the now-modified `diagramString`** — it does (`return { diagramString }`), so no change needed there.
  </action>
  <verify>npx tsc --noEmit 2>&1 | head -30</verify>
  <done>TypeScript compiles; preview endpoint applies the same shape and classDef logic as the template route</done>
</task>

</tasks>

<verification>
After all three tasks complete:

1. TypeScript compilation: `npx tsc --noEmit` — zero errors
2. Manual smoke test with a template like:
   ```yaml
   ---
   title: "Test"
   sources:
     - MySource
   styles:
     parent:
       shape: rounded
       fill: "#4e79a7"
       stroke: "#2d5a8e"
     title:
       shape: rectangle
   ---
   flowchart TD
   {{#each MySource}}
     {{title}} --> {{parent}}
   {{/each}}
   ```
   Expected output should contain:
   - `classDef style-parent fill:#4e79a7,stroke:#2d5a8e` (prepended)
   - No `classDef style-title` (title has no color)
   - `nXXXXXX("label"):::style-parent` for parent nodes (rounded + class suffix)
   - `nXXXXXX["label"]` for title nodes (rectangle, no suffix)
3. Template with no `styles` key: verify output is identical to current behavior (rectangle brackets, no classDef lines)
4. Line starting with `classDef` in template body: verify `{{field}}` on that line is NOT rewritten to `{{nodeId ...}}`
</verification>

<success_criteria>
- Frontmatter `styles` map drives both shape syntax and classDef color injection automatically
- No template body changes required to use styles
- Missing/absent `styles` key is a no-op (backwards compatible)
- TypeScript compiles cleanly
- Both the precompiled template route and the live preview endpoint apply styles consistently
</success_criteria>

<output>
After completion, create `.planning/quick/260614-jef-frontmatter-driven-node-styling-for-merm/260614-jef-SUMMARY.md`
</output>
