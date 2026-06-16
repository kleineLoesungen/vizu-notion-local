import matter from 'gray-matter'
import Handlebars from 'handlebars'
import fs from 'node:fs'
import path from 'node:path'
import { getConfig } from './config'

// FNV-1a 32-bit hash of the value string → 7-char base-36 Mermaid-safe node ID.
// Hashes only the value (not the attribute name) so that {{title}} and {{next}}
// referencing the same text produce the same node — enabling cross-field edges
// without duplicate nodes.
// Optional scope parameter (e.g. source name) scopes the hash so nodes from
// different databases with identical labels get distinct IDs. The null byte
// separator prevents "ab"+"c" colliding with "a"+"bc".
// Output: 'n' prefix + 6 base-36 chars (can't start with digit — Mermaid requirement).
function stableId(value: string, scope = ''): string {
  const input = scope ? `${scope}\x00${value}` : value
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return 'n' + h.toString(36).padStart(6, '0')
}

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
  cylindrical: ['[("', '")]'],
  diamond:     ['{"',  '"}'],
  stadium:     ['(["', '"])'],
}

// Accumulator: populated by nodeId helper during a render pass.
// Reset via resetClassAccumulator() before each render; read via getClassAssignments() after.
const _classAccum = new Map<string, string>() // nodeId → className

export function resetClassAccumulator(): void {
  _classAccum.clear()
}

export function getClassAssignments(): ReadonlyMap<string, string> {
  return _classAccum
}

// Builds the classDef block for a styles map. Only CSS color properties are emitted —
// shape is expressed via Mermaid bracket syntax in nodeId, not via classDef.
// (rx is an SVG attribute, not a CSS property; it causes Mermaid to drop the classDef.)
export function buildClassDefs(styles: StylesMap): string {
  const lines: string[] = []
  for (const [attrName, entry] of Object.entries(styles)) {
    if (!entry || typeof entry !== 'object') continue
    const parts: string[] = []
    if (entry.fill) parts.push(`fill:${entry.fill}`)
    if (entry.stroke) parts.push(`stroke:${entry.stroke}`)
    if (entry['stroke-width'] != null) parts.push(`stroke-width:${entry['stroke-width']}px`)
    if (parts.length === 0) continue
    lines.push(`classDef cls_${attrName} ${parts.join(',')}`)
  }
  return lines.join('\n')
}

// nodeId helper: called as {{nodeId "attrName" attrValue}} from rewritten template body.
// Accepts optional hash args: shape="..." and className="cls_fieldName"
// - className present: accumulates node for post-render `class` assignment; uses bracket
//   syntax from shape (or default rectangle).
// - className absent: bracket syntax only (shape-only visual, no class tracking).
// SafeString prevents Handlebars from HTML-escaping the brackets.
Handlebars.registerHelper('nodeId', function(_attrName: string, value: unknown, options?: Handlebars.HelperOptions) {
  const source = (options?.hash?.source as string) ?? ''
  const groupKey = (this as any)?._groupKey as string | undefined ?? ''
  const scope = groupKey ? `${source}\x00${groupKey}` : source
  const id = stableId(String(value ?? ''), scope)
  const safeLabel = String(value ?? '').replace(/["[\]{}()]/g, '')
  const className = options?.hash?.className as string | undefined
  const shape = (options?.hash?.shape as string) ?? 'rectangle'
  const [open, close] = SHAPE_BRACKETS[shape] ?? SHAPE_BRACKETS['rectangle']!

  if (className) {
    _classAccum.set(id, className)
    return new Handlebars.SafeString(`${id}${open}${safeLabel}${close}`)
  }

  return new Handlebars.SafeString(`${id}${open}${safeLabel}${close}`)
})

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
    const key = String(row[field] ?? '')
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(row)
  }
  return Array.from(map.entries()).map(([key, items]) => ({
    [field]: key,
    _groupKey: key,
    items,
  }))
})

// group-item block helper: called as {{#group-item}}...{{/group-item}} inside
// {{#each (group ...)}} block. `this` in the outer each is { [field]: key, items: rows[] }.
// group-item iterates over this.items and renders the block body once per item.
// The inner context is the individual row object, so {{title}} etc. work normally.
Handlebars.registerHelper('group-item', function(this: { items?: Record<string, string>[]; _groupKey?: string }, options: Handlebars.HelperOptions) {
  const items = this.items ?? []
  const groupKey = this._groupKey ?? ''
  return new Handlebars.SafeString(
    items.map((item) => options.fn({ ...item, _groupKey: groupKey })).join('')
  )
})

// Tableau 10 palette — 10 accessible, visually distinct colors.
// palette index helper: returns a hex color string by index, wrapping around if index >= 10.
// Called as {{palette @index}} inside {{#each (group ...)}} to auto-assign one color per group.
const PALETTE = [
  '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
  '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac',
]

Handlebars.registerHelper('palette', function(index: unknown) {
  const i = Math.abs(Number(index) || 0)
  return PALETTE[i % PALETTE.length]
})

// join-rows helper: called as (join-rows ArrayA "fieldA" ArrayB "fieldB" "prefix")
// For each row in ArrayA, finds all rows in ArrayB where rowB[fieldB] === rowA[fieldA].
// Returns merged rows: { ...rowA, prefix_key: val, ... } for each matched rowB.
// Left-join semantics: rows in A with no B match are included as-is (unmerged).
// Uses a Map index on ArrayB for O(n) lookup performance.
// Returns [] on invalid input (non-array or missing field args).
Handlebars.registerHelper('join-rows', function(
  arrayA: unknown,
  fieldA: string,
  arrayB: unknown,
  fieldB: string,
  prefix: string
) {
  if (!Array.isArray(arrayA) || !Array.isArray(arrayB) || !fieldA || !fieldB) return []

  // Build index: fieldB value → rows in B
  const index = new Map<string, Record<string, unknown>[]>()
  for (const rowB of arrayB as Record<string, unknown>[]) {
    const key = String(rowB[fieldB] ?? '')
    if (!index.has(key)) index.set(key, [])
    index.get(key)!.push(rowB)
  }

  const result: Record<string, unknown>[] = []
  const safePrefix = prefix ? String(prefix) : 'b'

  for (const rowA of arrayA as Record<string, unknown>[]) {
    const matchKey = String(rowA[fieldA] ?? '')
    const matches = index.get(matchKey)

    if (!matches || matches.length === 0) {
      // Left-join: include rowA as-is when no B match
      result.push({ ...rowA })
    } else {
      for (const rowB of matches) {
        // Merge rowA with rowB fields prefixed
        const merged: Record<string, unknown> = { ...rowA }
        for (const [k, v] of Object.entries(rowB)) {
          merged[`${safePrefix}_${k}`] = v
        }
        result.push(merged)
      }
    }
  }

  return result
})

// lookup-by helper: called as (lookup-by Array "field" value)
// Returns all rows from Array where row[field] === value (string comparison).
// Useful for nested #each blocks to iterate matching related rows.
// Returns [] on invalid input (non-array or missing field).
Handlebars.registerHelper('lookup-by', function(
  array: unknown,
  field: string,
  value: unknown
) {
  if (!Array.isArray(array) || !field) return []
  const target = String(value ?? '')
  return (array as Record<string, unknown>[]).filter(
    (row) => String(row[field] ?? '') === target
  )
})

// Rewrites bare {{attr}} references → {{nodeId "attr" attr ...}} before Handlebars
// compilation. The rewriter is block-aware: when inside a {{#each SourceName}} block
// it injects source="SourceName" into every nodeId call so that nodes from different
// sources with identical labels produce distinct Mermaid node IDs.
// Lines beginning with classDef or subgraph are left untouched — those contain
// literal Mermaid syntax, not Handlebars bindings.
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

export interface MermaidTemplate {
  id: string           // filename without .mmd extension (e.g., "project-timeline")
  title: string        // from frontmatter.title
  sources: string[]    // from frontmatter.sources (source names)
  styles: StylesMap    // from frontmatter.styles (empty object when not declared)
  body: string         // raw Mermaid diagram body (Handlebars syntax preserved)
  compiled: Handlebars.TemplateDelegate  // precompiled; call with context object
}

let _templates: MermaidTemplate[] | null = null

const DEFAULT_TEMPLATE_DIR = '/app/config'

export async function loadTemplates(templateDir: string = DEFAULT_TEMPLATE_DIR): Promise<MermaidTemplate[]> {
  if (!fs.existsSync(templateDir)) {
    console.log(`[vizu] Template directory not found at ${templateDir} — no Mermaid templates loaded`)
    _templates = []
    return []
  }

  const files = fs.readdirSync(templateDir).filter((f) => f.endsWith('.mmd'))
  if (files.length === 0) {
    _templates = []
    return []
  }

  const config = getConfig()
  const configSourceNames = config.sources.map((s) => s.name)
  const templates: MermaidTemplate[] = []

  for (const file of files) {
    const filePath = path.join(templateDir, file)
    const content = fs.readFileSync(filePath, 'utf-8')
    const { data, content: body } = matter(content)

    // Validate required frontmatter fields
    if (!data.title || typeof data.title !== 'string') {
      throw new Error(`[vizu] Template "${file}": frontmatter missing required 'title' field (must be a string)`)
    }
    if (!Array.isArray(data.sources) || data.sources.length === 0) {
      throw new Error(`[vizu] Template "${file}": frontmatter missing or empty 'sources' array — must list at least one source name`)
    }

    // Validate each source name against configured sources (D-07)
    const invalidSources = (data.sources as string[]).filter((s) => !configSourceNames.includes(s))
    if (invalidSources.length > 0) {
      throw new Error(
        `[vizu] Template "${file}": references unknown source(s): ${invalidSources.join(', ')}. ` +
        `Available sources: ${configSourceNames.join(', ')}`
      )
    }

    // Extract styles map from frontmatter (optional — empty object when absent)
    const styles: StylesMap = (typeof data.styles === 'object' && data.styles !== null)
      ? (data.styles as StylesMap)
      : {}

    // Precompile Handlebars template (D-04)
    let compiled: Handlebars.TemplateDelegate
    try {
      const rewrittenBody = rewriteTemplateBody(body, styles)
      compiled = Handlebars.compile(rewrittenBody)
    } catch (err: any) {
      throw new Error(`[vizu] Template "${file}": Handlebars compilation failed: ${err.message}`)
    }

    templates.push({
      id: file.replace(/\.mmd$/, ''),
      title: data.title as string,
      sources: data.sources as string[],
      styles,
      body: body.trim(),
      compiled,
    })
  }

  _templates = templates
  console.log(`[vizu] Loaded ${templates.length} Mermaid template(s) from ${templateDir}`)
  return templates
}

export function getTemplates(): MermaidTemplate[] {
  if (_templates === null) {
    // Return empty array before initialization (before validate-config runs)
    // rather than throwing — allows eligibility checks to return false safely
    return []
  }
  return _templates
}
