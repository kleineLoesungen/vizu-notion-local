---
phase: quick-260608-vlm
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - pages/index.vue
  - pages/visualizations/[sourceId].vue
autonomous: true
requirements: []

must_haves:
  truths:
    - "Dashboard home page shows a Mermaid diagram templates section below source cards (when templates exist)"
    - "Each template card displays the template title and its associated source names"
    - "Clicking a template card navigates directly to the viz page with that template active"
    - "Templates section is hidden when no templates are configured"
  artifacts:
    - path: "pages/index.vue"
      provides: "Mermaid templates grid section on dashboard"
    - path: "pages/visualizations/[sourceId].vue"
      provides: "?template= URL param support to auto-activate a Mermaid template on mount"
  key_links:
    - from: "pages/index.vue"
      to: "/visualizations/:sourceId?template=:templateId"
      via: "navigateTo() with ?template= query param"
      pattern: "navigateTo.*template="
    - from: "pages/visualizations/[sourceId].vue"
      to: "selectMermaidTemplate()"
      via: "useRoute().query.template read in onMounted"
      pattern: "query\\.template"
---

<objective>
List Mermaid diagram templates on the dashboard home page alongside existing source cards, with direct deep-link navigation to the viz page with the template pre-activated.

Purpose: Users can discover and launch Mermaid diagram templates directly from the dashboard without first navigating to a source's viz page and manually clicking the template button.
Output: Dashboard "Diagram Templates" section + viz page ?template= URL param support.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

<!-- Key interfaces the executor needs — no codebase exploration required -->
<interfaces>
From server/routes/api/mermaid/templates.get.ts — response shape:
```typescript
// GET /api/mermaid/templates returns:
Array<{
  id: string        // template filename without .mmd (e.g. "project-timeline")
  title: string     // from frontmatter
  sources: string[] // source names (matching config source.name, NOT databaseId)
}>
```

From pages/index.vue — already available in component scope:
```typescript
const sources = computed(() => data.value?.sources ?? [])
// Each source: { id: string (databaseId), name: string, columnMappings: ... }
```

From pages/visualizations/[sourceId].vue — existing selectMermaidTemplate:
```typescript
const activeMermaidTemplateId = ref<string>('')
const activeVizType = ref<'metro' | 'flow' | 'mermaid'>('metro')

function selectMermaidTemplate(templateId: string) {
  activeMermaidTemplateId.value = templateId
  activeVizType.value = 'mermaid'
}

// onMounted already exists — add template query param handling there
// Note: 'mermaid' type is not restored from URL (no templateId stored) — user re-selects
// This task adds templateId support to close that gap
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add ?template= URL param support to viz page</name>
  <files>pages/visualizations/[sourceId].vue</files>
  <action>
In the existing `onMounted` block (around line 713), after the shared state restore logic, add template query param handling:

```typescript
// Phase 5 quick: Deep-link Mermaid template activation via ?template= query param
const templateQuery = useRoute().query.template
if (templateQuery && typeof templateQuery === 'string') {
  // Wait for mermaidTemplates to be available before activating
  const unwatch = watch(mermaidTemplates, (templates) => {
    if (!templates) return
    const match = templates.find((t) => t.id === templateQuery)
    if (match) {
      selectMermaidTemplate(match.id)
      unwatch()
    }
  }, { immediate: true })
}
```

`mermaidTemplates` is already available in scope (returned from `useSourceData`). `useRoute()` is auto-imported by Nuxt — no import needed. The `watch({ immediate: true })` pattern is used because `mermaidTemplates` may not be populated yet when `onMounted` fires (it depends on the `useFetch` for templates completing).

Do NOT modify the existing `// Note: 'mermaid' type is not restored from URL` comment — append below it.
  </action>
  <verify>
    Navigate to `/visualizations/:sourceId?template=:templateId` in browser — the Mermaid diagram should render immediately without clicking the template button manually.
  </verify>
  <done>Visiting the viz page with ?template=some-id auto-activates that Mermaid template and renders the diagram.</done>
</task>

<task type="auto">
  <name>Task 2: Add Mermaid Templates section to dashboard</name>
  <files>pages/index.vue</files>
  <action>
Two changes to `pages/index.vue`:

**Script section — add templates fetch:**

After the existing `const sources = computed(...)` line, add:

```typescript
// Mermaid templates for dashboard listing — lightweight metadata endpoint, no Notion calls
const { data: templatesData } = useFetch<Array<{ id: string; title: string; sources: string[] }>>(
  '/api/mermaid/templates',
  { key: 'mermaid-templates-dashboard' }
)

const templateCards = computed(() => {
  if (!templatesData.value?.length || !sources.value.length) return []
  return templatesData.value.map((tmpl) => {
    // Find the first source ID whose name matches any of the template's source names
    const firstSource = sources.value.find((s: any) => tmpl.sources.includes(s.name))
    return { ...tmpl, sourceId: firstSource?.id ?? null }
  }).filter((t) => t.sourceId !== null)
})

const navigateToTemplate = (sourceId: string, templateId: string) => {
  navigateTo(`/visualizations/${sourceId}?template=${templateId}`)
}
```

**Template section — add below the "Global Fetch All" button div:**

```html
<!-- Mermaid Diagram Templates section -->
<div v-if="templateCards.length > 0" class="mt-12">
  <h2 class="text-xl font-semibold text-gray-900 mb-1">Diagram Templates</h2>
  <p class="text-sm text-gray-500 mb-4">Pre-configured Mermaid diagrams — click to open</p>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <button
      v-for="tmpl in templateCards"
      :key="tmpl.id"
      class="text-left p-4 border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all bg-white"
      @click="navigateToTemplate(tmpl.sourceId!, tmpl.id)"
    >
      <p class="font-medium text-gray-900 text-sm">{{ tmpl.title }}</p>
      <p class="text-xs text-gray-400 mt-1">{{ tmpl.sources.join(', ') }}</p>
    </button>
  </div>
</div>
```

The section only renders when `templateCards.length > 0` — invisible when no templates are configured. Uses the same card visual language as the rest of the dashboard (border, rounded-lg, hover states).
  </action>
  <verify>
    1. With templates configured: dashboard shows "Diagram Templates" section below source cards with one card per template.
    2. Clicking a template card navigates to `/visualizations/:sourceId?template=:templateId` and the diagram renders.
    3. With no templates configured (or empty config dir): section is completely hidden.
  </verify>
  <done>Dashboard shows Mermaid template cards; clicking navigates to viz page with template pre-activated.</done>
</task>

</tasks>

<verification>
- `npm run build` (or `npx nuxt build`) passes with no TypeScript errors
- Dashboard renders without JS errors when no templates exist
- Dashboard renders template cards when templates exist
- Clicking a template card navigates to the viz page with the diagram auto-rendered
</verification>

<success_criteria>
Dashboard home page shows a "Diagram Templates" section (hidden when no templates configured) with one card per template. Clicking a card deep-links to the viz page with that template immediately active — no manual template button click required.
</success_criteria>

<output>
After completion, create `.planning/quick/260608-vlm-list-mermaid-diagram-templates-on-the-da/260608-vlm-SUMMARY.md`
</output>
