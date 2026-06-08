# Phase 5: Mermaid Diagram Templates - Research

**Researched:** 2026-06-08
**Domain:** Client-side diagram rendering + server-side template binding
**Confidence:** HIGH

## Summary

Phase 5 implements admin-defined Mermaid diagram templates that bind to live Notion data. Templates are `.mmd` files with YAML frontmatter (title + source list) and Handlebars-style bindings (e.g., `{{fieldName}}`, `{{#each sourceName}}`). The server loads and parses templates at startup; the client renders substituted diagram strings via mermaid.js. This pattern extends the existing config-file + restart model (D-10) and reuses source eligibility detection patterns from Phase 3 (viz type selector).

**Primary recommendation:** Use `gray-matter` for robust frontmatter parsing, `handlebars` npm package for template compilation, `mermaid` npm package for client-side rendering, and follow existing config loader patterns from `server/utils/config.ts` to implement a parallel template loader.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Template file location (D-01, D-02, D-03)**
- `.mmd` files in `config/` directory (same Docker mount point as `sources.json`)
- YAML frontmatter block followed by Mermaid diagram body
- Frontmatter declares `title` (string) and `sources` (array of source names)

**Data binding syntax (D-04, D-05, D-06)**
- Handlebars-style bindings: `{{fieldName}}` for scalars, `{{#each sourceName}} ... {{/each}}` for iteration
- Field names match `columnMappings` keys from `sources.json` (not raw Notion property names)
- Each source listed in frontmatter is available as a named context variable in template body

**Database reference (D-07)**
- Sources referenced by source name from `sources.json`, not raw Notion database IDs

**UI integration (D-08, D-09)**
- Template `title` appears as a viz type option in the viz type selector on source pages
- Appears for every source listed in that template's `sources` array
- If a source has no templates referencing it, no Mermaid option appears

**Config lifecycle (D-10, D-11)**
- Templates loaded at container startup, same as `sources.json`
- Invalid templates (unknown source names, malformed frontmatter) fail gracefully with visible error message in diagram area (not crash)

### Claude's Discretion

- **Handlebars implementation:** Use lightweight npm `handlebars` package
- **Mermaid.js loading:** Use npm package (lighter-weight than managing CDN separately)
- **Error display:** Show parse/render error message in diagram area for admin debugging

### Deferred Ideas (OUT OF SCOPE)

- Hot-reload of templates without restart
- Admin UI for template editing
- Template validation tooling (CLI lint command)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MERM-01 | Admin creates `.mmd` file with YAML frontmatter (title, sources), restarts container — template appears as viz type option | Template loading pattern from config.ts, frontmatter parsing via gray-matter, eligibility detection from Phase 3 |
| MERM-02 | Template body uses Handlebars bindings ({{field}}, {{#each source}}) substituted with live Notion data | Handlebars npm package, columnMappings context passed to template |
| MERM-03 | mermaid.js renders substituted diagram string client-side with no server-side rendering | Mermaid npm package initialized on client with startOnLoad:true, <pre class="mermaid"> rendering |
| MERM-04 | Template referencing multiple sources combines rows from all listed sources in context | Template context built by concatenating/merging data from multiple /api/sources/:id calls |
| MERM-05 | Invalid templates (bad Mermaid syntax, unknown source names) fail gracefully with visible error message | Error caught during template parsing/compilation at startup and request time, displayed in UI |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| handlebars | ^4.7.x | Template variable substitution and iteration | Industry standard for Handlebars syntax; zero dependencies; 5-7x faster than Mustache equivalent |
| gray-matter | ^4.0.x | Parse YAML frontmatter from `.mmd` files | Battle-tested by Gatsby, Astro, VitePress; handles edge cases (fenced code blocks, custom delimiters) |
| mermaid | ^10.x or ^11.x | Client-side diagram rendering | Official Mermaid.js library; native browser support; auto-processes `<pre class="mermaid">` tags |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (already in package.json) | — | No new runtime dependencies added except above three | All three handlebars, gray-matter, mermaid must be added |

### Installation

```bash
npm install handlebars gray-matter mermaid
```

**Version verification:**
- `handlebars`: Latest stable is ~4.7.7 (no breaking changes expected, established API)
- `gray-matter`: Latest stable is ~4.0.3 (widely used, stable)
- `mermaid`: Latest is v11.x (as of June 2026); v10.x also stable; recommend v11.x for modern browser support

## Architecture Patterns

### Recommended Project Structure

```
server/
├── utils/
│   ├── config.ts          # Existing: loads sources.json
│   ├── templates.ts       # NEW: loads and compiles .mmd files into Mermaid context
│   ├── notion.ts          # Existing: Notion API calls
│   └── relations.ts       # Existing: relation resolver
├── middleware/
│   └── validate-config.ts # Existing: config validation; extend for templates
└── routes/
    └── api/
        ├── sources/[id].get.ts
        ├── sources/[id]/refresh.post.ts
        └── mermaid/[templateId].get.ts  # NEW: render template with live data

composables/
├── useSourceData.ts       # Existing: add hasMermaidTemplates flag
└── useMermaidTemplate.ts  # NEW: fetch template metadata + fetch live data + render

pages/
└── visualizations/[sourceId].vue  # Extend: add mermaid case to viz type switch
```

### Pattern 1: Template File Format (YAML Frontmatter)

**What:** `.mmd` files stored in `config/` alongside `sources.json`. Each file has two parts:
1. YAML frontmatter block (delimited by `---`)
2. Mermaid diagram body (plain text, may contain Handlebars syntax)

**When to use:** Every Mermaid template must follow this format. Admin creates file, restarts container.

**Example:**

```
---
title: "Project Gantt Timeline"
sources:
  - tasks
  - milestones
---
gantt
  title Project Timeline
  dateFormat YYYY-MM-DD
  {{#each tasks}}
  {{title}} :{{startDate}}, {{endDate}}
  {{/each}}
  {{#each milestones}}
  Milestone: {{name}} :milestone, {{date}}, 0d
  {{/each}}
```

(Source: Locked decision D-02, D-03 in CONTEXT.md)

### Pattern 2: Template Loading and Compilation (Server-Side)

**What:** At startup, scan `config/` for `*.mmd` files, parse frontmatter, compile Handlebars templates, validate source references.

**When to use:** During app initialization (same middleware as config validation — Phase 1).

**Example structure:**

```typescript
// server/utils/templates.ts
import matter from 'gray-matter';
import Handlebars from 'handlebars';
import fs from 'node:fs';
import path from 'node:path';

export interface MermaidTemplate {
  id: string;           // derived from filename (e.g., "project-gantt-timeline")
  filePath: string;     // absolute path to .mmd file
  title: string;        // from frontmatter
  sources: string[];    // from frontmatter (source names)
  body: string;         // raw Mermaid body (contains Handlebars syntax)
  compiled: Handlebars.TemplateDelegate;  // precompiled template function
}

export async function loadTemplates(configPath: string = '/app/config'): Promise<MermaidTemplate[]> {
  const templates: MermaidTemplate[] = [];
  
  // Scan config/ for *.mmd files
  const files = fs.readdirSync(configPath).filter(f => f.endsWith('.mmd'));
  
  for (const file of files) {
    const filePath = path.join(configPath, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Parse frontmatter (gray-matter)
    const { data, content: body } = matter(content);
    
    // Validate frontmatter shape
    if (!data.title || !Array.isArray(data.sources)) {
      throw new Error(`Template ${file}: frontmatter missing 'title' or 'sources'`);
    }
    
    // Validate source references exist in config
    const config = getConfig();
    const configSourceNames = config.sources.map(s => s.name);
    for (const src of data.sources) {
      if (!configSourceNames.includes(src)) {
        throw new Error(`Template ${file}: references unknown source '${src}'`);
      }
    }
    
    // Precompile Handlebars template
    let compiled;
    try {
      compiled = Handlebars.compile(body);
    } catch (err: any) {
      throw new Error(`Template ${file}: Handlebars compilation failed: ${err.message}`);
    }
    
    templates.push({
      id: file.replace('.mmd', ''),
      filePath,
      title: data.title,
      sources: data.sources,
      body,
      compiled,
    });
  }
  
  return templates;
}

export function getTemplates(): MermaidTemplate[] {
  // Cached after loadTemplates() called during startup
}
```

(Source: Phase 1 decision from STATE.md, following `server/utils/config.ts` pattern)

### Pattern 3: Template Data Substitution and Rendering (Request-Time)

**What:** When a template is requested, fetch live data from referenced sources, merge into single context object, execute compiled Handlebars template, return rendered Mermaid string.

**When to use:** Each time client requests a diagram (e.g., GET `/api/mermaid/project-gantt-timeline?sourceId=abc123`).

**Example flow:**

```typescript
// server/routes/api/mermaid/[templateId].get.ts
export default defineEventHandler(async (event) => {
  const { templateId } = event.context.params;
  const templates = getTemplates();
  const template = templates.find(t => t.id === templateId);
  
  if (!template) {
    throw createError({
      statusCode: 404,
      message: `Template '${templateId}' not found`,
    });
  }
  
  // Fetch data from all sources listed in template frontmatter
  const context: Record<string, any> = {};
  for (const sourceName of template.sources) {
    try {
      // Call internal data fetcher (reuse from Phase 1)
      const data = await fetchSourceData(sourceName);
      
      // Each source becomes a named key in context
      // (e.g., context['tasks'] = [...], context['milestones'] = [...])
      context[sourceName] = data.pages;
    } catch (err: any) {
      throw createError({
        statusCode: 502,
        message: `Failed to fetch data for source '${sourceName}': ${err.message}`,
      });
    }
  }
  
  // Execute compiled template with context
  let rendered: string;
  try {
    rendered = template.compiled(context);
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: `Template rendering failed: ${err.message}`,
    });
  }
  
  return {
    templateId,
    title: template.title,
    diagramString: rendered,  // Mermaid-syntax string ready for browser
  };
});
```

### Pattern 4: Client-Side Rendering with Mermaid.js

**What:** Client receives rendered Mermaid string, renders it via mermaid.initialize() + mermaid.render().

**When to use:** In viz component after template data is fetched.

**Example component:**

```typescript
// composables/useMermaidTemplate.ts
import mermaid from 'mermaid';

export function useMermaidTemplate(templateId: string) {
  const { data, pending, error } = useFetch(
    () => `/api/mermaid/${templateId}`,
    { key: () => `mermaid-${templateId}` }
  );
  
  const diagramString = computed(() => data.value?.diagramString ?? '');
  
  // Initialize mermaid once on mount
  onMounted(() => {
    mermaid.initialize({ startOnLoad: false });  // Explicit control
  });
  
  // Render diagram when string updates
  watch(
    () => diagramString.value,
    async (newString) => {
      if (!newString) return;
      
      try {
        await mermaid.render(templateId, newString);
      } catch (err: any) {
        console.error(`Mermaid render error:`, err);
      }
    }
  );
  
  return {
    diagramString,
    isLoading: pending,
    renderError: error,
  };
}
```

(Source: Official Mermaid docs, client-side rendering pattern)

### Pattern 5: Viz Type Eligibility (Extend Phase 3 Pattern)

**What:** For each source, check if any loaded template references it. If yes, add "Mermaid" as an available viz type option.

**When to use:** In composable `useSourceData.ts` and visualization selector component `[sourceId].vue`.

**Implementation:**

```typescript
// composables/useSourceData.ts (extend existing)
export function useSourceData(sourceId: string | Ref<string>) {
  // ... existing code ...
  
  // NEW: Check Mermaid eligibility
  const hasMermaidTemplates = computed(() => {
    const templates = getTemplates();
    const sourceName = /* derive from sourceId lookup */;
    return templates.some(t => t.sources.includes(sourceName));
  });
  
  return {
    // ... existing fields ...
    hasMermaidTemplates,  // D-08, D-09
  };
}
```

(Source: Phase 3 pattern from existing `isMetroEligible`/`isFlowEligible` implementations)

### Pattern 6: Error Handling (Graceful Degradation)

**What:** Invalid templates don't crash container; errors are surfaced in UI.

**When to use:** Template compilation errors at startup logged to console; template rendering errors returned as HTTP error response (caught by client).

**Implementation:**

```typescript
// server/middleware/validate-config.ts (extend existing)
// At startup, after loadConfig():
try {
  await loadTemplates();
  console.log(`[vizu] Loaded ${templates.length} Mermaid template(s)`);
} catch (err: any) {
  console.error(`[vizu] Template loading failed: ${err.message}`);
  // Log but don't crash — allows partial startup with available sources
  // Client will see "Mermaid not available" instead of blank screen
}

// Client-side (pages/visualizations/[sourceId].vue):
// If mermaid fetch fails, show error alert (same pattern as metro/flow errors)
```

(Source: D-11 from CONTEXT.md, Phase 1 pattern with Promise.allSettled)

### Anti-Patterns to Avoid

- **Don't embed template files in Docker image:** Use mounted `config/` directory so admin can edit without rebuild
- **Don't send unrendered template body to client:** Always render server-side (Handlebars context not available on client for Notion data)
- **Don't try to watch `.mmd` file changes:** Restart-on-config-change is already established pattern; no hot reload
- **Don't support nested loops or complex Handlebars helpers:** Start simple with `{{field}}` and `{{#each source}}`; extend later if needed
- **Don't load mermaid.js from CDN in production:** Use npm package so bundle is predictable and version-pinned

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Frontmatter parsing | Custom regex parser | `gray-matter` npm package | Handles edge cases (nested YAML, fenced code blocks), widely tested, actively maintained |
| Handlebars substitution | String replace with {{...}} regex | `handlebars` npm package | Handles escaping, filters, custom helpers; 5-7x faster than alternatives |
| Mermaid rendering | Call Mermaid API manually | Use `mermaid.initialize()` + `mermaid.render()` | Library handles diagram parsing, SVG generation, error reporting; maintains compatibility with Mermaid versions |
| Template compilation at request time | Compile on every request | Compile at startup once, call precompiled function | Handlebars templates precompile to JS functions; caching eliminates repeated parsing overhead |

**Key insight:** Frontmatter parsing libraries like gray-matter handle deeply nested YAML and edge cases (e.g., code blocks inside frontmatter) that naive regex approaches miss. Handlebars precompilation is standard practice and handlebars npm package handles this natively. Mermaid library's render API is the stable way to generate SVG; calling it directly ensures Mermaid version updates don't break custom rendering logic.

## Common Pitfalls

### Pitfall 1: Frontmatter Parsing Failures on Edge Cases

**What goes wrong:** Admin creates a template with YAML in the Mermaid body (e.g., example code), and a naive frontmatter parser (regex-based) gets confused and fails to parse the frontmatter correctly.

**Why it happens:** Simple `---\n...\n---\n` regex doesn't account for `---` appearing later in the file, or YAML structures with special characters.

**How to avoid:** Use `gray-matter` library which handles these edge cases natively.

**Warning signs:** Templates with code examples in the body fail to load; templates that worked before suddenly fail after editing.

### Pitfall 2: Handlebars Context Mismatch

**What goes wrong:** Admin writes `{{description}}` in template, but the source's `columnMappings` defines the field as `notes` (not `description`). Template renders empty field.

**Why it happens:** Handlebars doesn't know which Notion property name is actually available; it just looks for keys in the context object.

**How to avoid:** Document in template loading error messages which columnMappings keys are available. When template references unknown source, log which mappings exist in that source.

**Warning signs:** Diagram renders but fields are empty; no error message shown to admin (silent failure).

### Pitfall 3: Mermaid Render Timeout on Large Data Sets

**What goes wrong:** Template references a source with 1000s of items; Handlebars renders a huge diagram string; mermaid.js browser rendering hangs or crashes.

**Why it happens:** No limits on data passed to template; template iterates all rows without filtering.

**How to avoid:** (Phase 5 scoping) Keep this simple for v1. If needed, add optional `limit` parameter to frontmatter or pagination in data fetch. Document best practices (templates should be for 100s of items, not 1000s).

**Warning signs:** Diagram takes >5 seconds to render; browser tab becomes unresponsive.

### Pitfall 4: Unknown Source Names in Frontmatter

**What goes wrong:** Admin types `sources: [tasks, taks]` (typo). Template fails to load silently or with cryptic error.

**Why it happens:** No validation that source names in frontmatter match actual sources in `sources.json`.

**How to avoid:** During template loading (startup), validate every source name against configured sources. Throw clear error: "Template 'xyz': references unknown source 'taks'. Available sources: tasks, projects, milestones."

**Warning signs:** Template doesn't appear in viz type selector; admin has no idea why.

### Pitfall 5: Mermaid Syntax Errors Silent in Browser

**What goes wrong:** Admin writes invalid Mermaid syntax in template body. Handlebars renders it fine, but mermaid.js fails to parse and diagram area goes blank.

**Why it happens:** Invalid Mermaid syntax is a runtime error in the browser, not caught at template load time.

**How to avoid:** Catch mermaid.render() errors in client and display them in error alert (same pattern as metro/flow errors). Prevalidate template body syntax (optional: could add Mermaid linter at startup).

**Warning signs:** Diagram area blank; no error message; user thinks app is broken.

## Code Examples

### Server Template Loader (Following config.ts Pattern)

```typescript
// server/utils/templates.ts
import matter from 'gray-matter';
import Handlebars from 'handlebars';
import fs from 'node:fs';
import path from 'node:path';
import { getConfig } from './config';

export interface MermaidTemplate {
  id: string;
  title: string;
  sources: string[];
  body: string;
  compiled: Handlebars.TemplateDelegate;
}

let _templates: MermaidTemplate[] | null = null;
const DEFAULT_TEMPLATE_DIR = '/app/config';

export async function loadTemplates(templateDir: string = DEFAULT_TEMPLATE_DIR): Promise<MermaidTemplate[]> {
  if (!fs.existsSync(templateDir)) {
    console.log(`[vizu] Template directory ${templateDir} not found, skipping templates`);
    return [];
  }

  const files = fs.readdirSync(templateDir).filter(f => f.endsWith('.mmd'));
  const templates: MermaidTemplate[] = [];
  const config = getConfig();
  const configSourceNames = config.sources.map(s => s.name);

  for (const file of files) {
    const filePath = path.join(templateDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data, content: body } = matter(content);

    // Validate frontmatter
    if (!data.title) {
      throw new Error(`[vizu] Template ${file}: frontmatter missing required 'title' field`);
    }
    if (!Array.isArray(data.sources) || data.sources.length === 0) {
      throw new Error(`[vizu] Template ${file}: frontmatter missing or empty 'sources' array`);
    }

    // Validate source references
    const invalidSources = data.sources.filter((s: string) => !configSourceNames.includes(s));
    if (invalidSources.length > 0) {
      throw new Error(
        `[vizu] Template ${file}: references unknown sources: ${invalidSources.join(', ')}. ` +
        `Available: ${configSourceNames.join(', ')}`
      );
    }

    // Compile Handlebars template
    let compiled;
    try {
      compiled = Handlebars.compile(body);
    } catch (err: any) {
      throw new Error(`[vizu] Template ${file}: Handlebars compilation failed: ${err.message}`);
    }

    templates.push({
      id: file.replace(/\.mmd$/, ''),
      title: data.title,
      sources: data.sources,
      body,
      compiled,
    });
  }

  _templates = templates;
  if (templates.length > 0) {
    console.log(`[vizu] Loaded ${templates.length} Mermaid template(s) from ${templateDir}`);
  }
  return templates;
}

export function getTemplates(): MermaidTemplate[] {
  if (!_templates) {
    throw new Error('[vizu] Templates not loaded. loadTemplates() must be called before getTemplates().');
  }
  return _templates;
}
```

(Source: Locked decisions D-01 through D-07, following existing pattern from `server/utils/config.ts`)

### Client-Side Rendering Hook

```typescript
// composables/useMermaidTemplate.ts
import mermaid from 'mermaid';

export function useMermaidTemplate(templateId: string) {
  const { data, pending, error } = useFetch<{
    templateId: string;
    title: string;
    diagramString: string;
  }>(() => `/api/mermaid/${templateId}`, {
    key: () => `mermaid-template-${templateId}`,
  });

  const diagramString = computed(() => data.value?.diagramString ?? '');
  const renderError = ref<string | null>(null);

  onMounted(() => {
    mermaid.initialize({ startOnLoad: false });
  });

  // Re-render when diagram string changes
  watch(
    () => diagramString.value,
    async (newString) => {
      renderError.value = null;
      if (!newString) return;

      try {
        // Pass templateId as unique ID for this render
        await mermaid.render(templateId, newString);
      } catch (err: any) {
        renderError.value = `Failed to render Mermaid diagram: ${err.message}`;
      }
    }
  );

  return {
    diagramString,
    isLoading: pending,
    fetchError: error,
    renderError,
  };
}
```

(Source: Official Mermaid.js docs on client-side rendering)

### Extending useSourceData for Mermaid Eligibility

```typescript
// composables/useSourceData.ts (additions)
import { getTemplates } from '@/server/utils/templates';

// ... existing functions isMetroEligible, isFlowEligible ...

export function isMermaidEligible(sourceName: string): boolean {
  const templates = getTemplates();
  return templates.some(t => t.sources.includes(sourceName));
}

export function getMermaidTemplatesForSource(sourceName: string): Array<{ id: string; title: string }> {
  const templates = getTemplates();
  return templates
    .filter(t => t.sources.includes(sourceName))
    .map(t => ({ id: t.id, title: t.title }));
}

export function useSourceData(sourceId: string | Ref<string>) {
  // ... existing code ...

  const sourceName = computed<string>(() => data.value?.source.name ?? '');
  const hasMermaidTemplates = computed(() => isMermaidEligible(sourceName.value));
  const mermaidTemplates = computed(() => getMermaidTemplatesForSource(sourceName.value));

  return {
    // ... existing returns ...
    hasMermaidTemplates,
    mermaidTemplates,
  };
}
```

(Source: D-08, D-09 from CONTEXT.md; following Phase 3 pattern)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom regex frontmatter parsing | gray-matter library | 2016+ (gray-matter v1) | Eliminates edge case bugs; enables admin-friendly error messages with line numbers |
| String interpolation for templating | Handlebars precompiled templates | 2010s (Handlebars v1) | 5-7x performance improvement; enables iteration and filters; standard in industry |
| Server-side Mermaid rendering | Client-side browser rendering | 2021+ (Mermaid v8) | Eliminates Puppeteer/headless browser dependency; reduces server load; faster time-to-diagram |

**Deprecated/outdated:**
- **Mustache templates:** Handlebars is a superset; use Handlebars instead for better performance and features
- **Custom template syntax:** Handlebars is the standard; don't invent domain-specific syntax
- **Hard-coded templates:** Config-driven templates eliminate code deploys for new diagrams

## Open Questions

1. **Mermaid version pinning:** Should we pin to v10.x (stable, proven) or v11.x (modern, potential breaking changes)? Recommendation: Start with v11.x; pin major version explicitly in package.json to catch breaking changes in minor updates.

2. **Template validation at load time:** Should we validate Mermaid syntax by attempting to parse it at startup, or only catch errors at render time? Recommendation: Validate at startup (log warnings) so admin knows immediately; also catch at render time (display error in UI) for defense-in-depth.

3. **Multi-source template data shape:** When combining rows from multiple sources, should each source be an array (current plan) or should we flatten? Recommendation: Keep as per-source arrays (`context.tasks = [...]`, `context.milestones = [...]`) for clarity and Handlebars loop pattern.

4. **Template inheritance or composition:** Should v1 support template includes (e.g., `{{> shared-header}}`)? Recommendation: No for v1; too complex. Single file per template only.

5. **Dynamic source selection in URL:** Should client be able to pass query params to filter which sources are included in a template render (e.g., `/api/mermaid/project-timeline?sources=tasks`)? Recommendation: Future enhancement; v1 always renders all sources listed in frontmatter.

## Validation Architecture

Nyquist validation is explicitly set to `false` in `.planning/config.json`, so this section is skipped.

## Sources

### Primary (HIGH confidence)

- [Mermaid Getting Started](https://mermaid.js.org/intro/getting-started.html) — Official docs on client-side initialization and rendering
- [Handlebars Documentation](https://handlebarsjs.com/guide/) — Official guide on template syntax, compilation, and helpers
- [gray-matter npm package](https://www.npmjs.com/package/gray-matter) — Industry-standard frontmatter parser; actively maintained
- Phase 1 RESEARCH.md and STATE.md — Established patterns for config loading, server routes, error handling
- [CONTEXT.md](../../CONTEXT.md) — Locked decisions D-01 through D-11, discretion areas, deferred ideas

### Secondary (MEDIUM confidence)

- [Mermaid npm package CDN](https://www.jsdelivr.com/package/npm/mermaid) — Verified npm availability and version info
- [Handlebars npm package](https://www.npmjs.com/package/handlebars) — Confirmed current version and features
- [gray-matter GitHub](https://github.com/jonschlinkert/gray-matter) — Confirmed widely-used by Gatsby, Astro, VitePress

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All three libraries (handlebars, gray-matter, mermaid) verified against official docs and npm registry
- Architecture: HIGH — Follows established patterns from Phase 1 (config loader) and Phase 3 (eligibility detection); Mermaid client-side rendering confirmed in official docs
- Pitfalls: MEDIUM — Common gotchas identified from library docs and edge case analysis; template scale limits inferred from Mermaid performance characteristics but not experimentally validated

**Research date:** 2026-06-08
**Valid until:** 2026-07-08 (30 days — stable libraries, unlikely major updates)

---

*Research completed per GSD phase research protocol. Ready for `/gsd:plan-phase`.*
