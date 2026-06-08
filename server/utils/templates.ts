import matter from 'gray-matter'
import Handlebars from 'handlebars'
import fs from 'node:fs'
import path from 'node:path'
import { getConfig } from './config'

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
      compiled = Handlebars.compile(body)
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
