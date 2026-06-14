import matter from 'gray-matter'
import Handlebars from 'handlebars'
import fs from 'node:fs'
import path from 'node:path'
import { getConfig } from './config'

// FNV-1a 32-bit hash of the value string → 7-char base-36 Mermaid-safe node ID.
// Hashes only the value (not the attribute name) so that {{title}} and {{next}}
// referencing the same text produce the same node — enabling cross-field edges
// without duplicate nodes.
// Output: 'n' prefix + 6 base-36 chars (can't start with digit — Mermaid requirement).
function stableId(value: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return 'n' + h.toString(36).padStart(6, '0')
}

// nodeId helper: called as {{nodeId "attrName" attrValue}} from rewritten template body.
// attrName is passed by the rewriter but not used in the hash — same value always
// produces the same node ID regardless of which field it comes from.
// Returns full Mermaid rectangle node definition: id["label"] (D-01, D-02, D-05)
// SafeString prevents Handlebars from HTML-escaping the square brackets.
Handlebars.registerHelper('nodeId', function(_attrName: string, value: unknown) {
  const id = stableId(String(value ?? ''))
  const safeLabel = String(value ?? '').replace(/["[\]]/g, '')
  return new Handlebars.SafeString(`${id}["${safeLabel}"]`)
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
    const key = row[field] ?? ''
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(row)
  }
  return Array.from(map.entries()).map(([key, items]) => ({
    [field]: key,
    items,
  }))
})

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

export interface MermaidTemplate {
  id: string           // filename without .mmd extension (e.g., "project-timeline")
  title: string        // from frontmatter.title
  sources: string[]    // from frontmatter.sources (source names)
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

    // Precompile Handlebars template (D-04)
    let compiled: Handlebars.TemplateDelegate
    try {
      // Rewrite bare {{attr}} bindings → {{nodeId "attr" attr}} before compilation (D-01, D-05)
      // Only rewrites simple variable references: {{word}} — not helpers, block helpers, or
      // Handlebars keywords. The blocklist guards else/this/log which match the word pattern.
      const HB_KEYWORDS = new Set(['else', 'this', 'log'])
      const rewrittenBody = body.replace(
        /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g,
        (match, name) => HB_KEYWORDS.has(name) ? match : `{{nodeId "${name}" ${name}}}`
      )
      compiled = Handlebars.compile(rewrittenBody)
    } catch (err: any) {
      throw new Error(`[vizu] Template "${file}": Handlebars compilation failed: ${err.message}`)
    }

    templates.push({
      id: file.replace(/\.mmd$/, ''),
      title: data.title as string,
      sources: data.sources as string[],
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
