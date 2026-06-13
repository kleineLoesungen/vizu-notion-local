---
phase: quick
plan: 260613-gen
type: execute
wave: 1
depends_on: []
files_modified:
  - pages/mermaid-editor.vue
  - pages/index.vue
autonomous: true
requirements: []

must_haves:
  truths:
    - "User can type raw Mermaid syntax and see the rendered diagram update in real time"
    - "Source names and their column mapping roles are visible on the page (fetched from /api/sources)"
    - "A link to the dashboard is present; a link from the dashboard reaches the editor"
  artifacts:
    - path: "pages/mermaid-editor.vue"
      provides: "Client-side MMD editor page"
    - path: "pages/index.vue"
      provides: "Link to editor added to dashboard"
  key_links:
    - from: "pages/mermaid-editor.vue"
      to: "mermaid.js (dynamic import)"
      via: "onMounted async import('mermaid')"
      pattern: "import\\('mermaid'\\)"
    - from: "pages/mermaid-editor.vue"
      to: "/api/sources"
      via: "useFetch('/api/sources')"
      pattern: "useFetch.*api/sources"
---

<objective>
Create a client-side Mermaid diagram editor at /mermaid-editor. The user pastes or types raw Mermaid syntax into a textarea; the diagram re-renders live in the same view. The page also shows a read-only reference panel listing each configured source and its column mapping roles (from /api/sources), so the admin knows what Handlebars variables are available when authoring templates. A link in the dashboard footer opens the editor; the editor links back to the dashboard.

Purpose: Eliminate the edit-restart-verify cycle when authoring .mmd template files. The editor is a scratch pad — no persistence, no file saving.
Output: pages/mermaid-editor.vue (new page) + link in pages/index.vue
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@pages/index.vue
@composables/useMermaidTemplate.ts

<interfaces>
<!-- Key patterns the executor needs. Extracted from the codebase. -->

From composables/useMermaidTemplate.ts:
- mermaid is loaded via dynamic import inside onMounted (SSR-safe pattern):
  ```ts
  onMounted(async () => {
    const mermaid = await import('mermaid')
    mermaidInstance = mermaid.default
    mermaidInstance.initialize({ startOnLoad: false })
  })
  ```
- Render call pattern:
  ```ts
  const renderId = `mermaid-svg-${Date.now()}`
  const { svg } = await mermaidInstance.render(renderId, diagramString)
  container.innerHTML = svg
  ```
- D3 zoom is attached after innerHTML injection by querying container.querySelector('svg')
- Container needs explicit height (e.g., height: 60vh) for fit-to-content math to work

From server/routes/api/sources.get.ts — response shape:
  ```ts
  {
    sources: Array<{
      id: string          // databaseId
      name: string
      databaseId: string
      columnMappings: Record<string, string>  // role → Notion column name, e.g. { title: 'Name', date: 'Due Date' }
      cachedAt: string | null
    }>
  }
  ```

From pages/index.vue — styling conventions:
- Page wrapper: `min-h-screen bg-white p-8`
- Section headings: `text-4xl font-semibold leading-tight text-gray-900`
- Sub-labels: `text-sm text-gray-500 mt-1`
- Buttons: `px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700`
- Error uses `<ErrorAlert>`, loading uses `<LoadingSpinner>`
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Build /mermaid-editor page with live Mermaid preview and source reference panel</name>
  <files>pages/mermaid-editor.vue</files>
  <action>
Create pages/mermaid-editor.vue as a new Nuxt page (route: /mermaid-editor). Layout: two-column on md+ screens (left: editor + controls, right: preview), single column on mobile.

**Left column — editor:**
- `<textarea>` bound to a `code` ref (v-model). Tailwind classes: `w-full h-64 font-mono text-sm border border-gray-300 rounded p-3 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500`. Placeholder: `graph TD\n  A[Start] --> B[End]`.
- "Render" button (`px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700`) that calls `renderDiagram()` manually. Also trigger on Ctrl+Enter via keydown listener on textarea.
- Error display: `<p v-if="renderError" class="text-sm text-red-600 mt-2">{{ renderError }}</p>`

**Right column — preview:**
- Container div: `id="mmd-editor-preview"`, `class="relative overflow-hidden rounded border border-gray-200 bg-white"`, `style="height: 60vh"`. This is where mermaid renders innerHTML.
- "Fit" button below preview (re-calls `fitToContent()`). `text-xs text-gray-500 hover:text-gray-900 mt-1`.

**Below the two-column area — Source Reference panel:**
- Heading: "Source field reference" (`text-sm font-semibold text-gray-700 mb-2 mt-6`).
- Fetch sources with `useFetch('/api/sources')`. Show `<LoadingSpinner>` while pending, `<ErrorAlert>` on error.
- For each source render a card (`bg-gray-50 border border-gray-200 rounded p-3 mb-2`):
  - Source name: `text-sm font-medium text-gray-900`
  - Each entry in `source.columnMappings`: render as `<span class="font-mono text-xs bg-white border border-gray-200 rounded px-1 py-0.5 mr-1">role → columnName</span>` (e.g. `title → Name`, `date → Due Date`).
  - No mappings: `<span class="text-xs text-gray-400">No column mappings configured</span>`.

**Link to GitHub README Mermaid section:**
Below source reference: `<a href="https://github.com/your-repo#mermaid-templates" target="_blank" rel="noopener" class="text-xs text-blue-600 hover:underline">Mermaid template docs (README)</a>`. Use the actual repo URL from package.json if available; otherwise use the literal string `#mermaid-templates` anchor as a placeholder comment.

**Back link:**
Top of page, before the heading: `<NuxtLink to="/" class="text-sm text-blue-600 hover:underline mb-4 inline-block">← Dashboard</NuxtLink>`.

**Page heading:**
`<h1 class="text-2xl font-semibold text-gray-900 mb-1">Mermaid Editor</h1>`
`<p class="text-sm text-gray-500 mb-6">Paste raw Mermaid syntax to preview. No saving — copy result to your .mmd file.</p>`

**Mermaid rendering logic (inline in `<script setup>`):**
- `const code = ref('graph TD\n  A[Start] --> B[End]')` — initial example.
- `const renderError = ref<string | null>(null)`.
- `let mermaidInstance: any = null`.
- `onMounted`: dynamic import mermaid, call `mermaidInstance.initialize({ startOnLoad: false })`, then call `renderDiagram()` once.
- `renderDiagram()`: async function. Clears `renderError`. Returns early if `!mermaidInstance || !code.value.trim()`. Calls `mermaidInstance.render(\`mmd-editor-svg-${Date.now()}\`, code.value)`, writes `svg` to `document.getElementById('mmd-editor-preview').innerHTML`. On catch: sets `renderError.value = err.message ?? 'Render error'`. No D3 zoom needed — keep it simple (editor is for authoring, not interaction).
- Ctrl+Enter handler: `onMounted` adds keydown listener on the textarea ref; `event.ctrlKey && event.key === 'Enter'` → call `renderDiagram()`. Remove in `onBeforeUnmount`.

Do NOT reuse useMermaidTemplate composable — it is designed around fetching from /api/mermaid/:id with Handlebars rendering. The editor is raw-input only and needs a much simpler direct mermaid.render() call.
  </action>
  <verify>
    <automated>ls /Users/sebastianwiller/Documents/github/vizu-notion-local/pages/mermaid-editor.vue && grep -c "mermaid-editor-preview" /Users/sebastianwiller/Documents/github/vizu-notion-local/pages/mermaid-editor.vue</automated>
  </verify>
  <done>File exists, contains the preview container ID, textarea, render button, and source reference section. No TypeScript errors from `nuxi typecheck` (run if time permits; non-blocking).</done>
</task>

<task type="auto">
  <name>Task 2: Add editor link to dashboard (index.vue)</name>
  <files>pages/index.vue</files>
  <action>
In pages/index.vue, add a small footer link to /mermaid-editor after the "Fetch All" button div (after the closing `</div>` of the `v-if="sources.length > 0"` block, still inside the outer page wrapper div).

Add:
```html
<!-- Mermaid editor utility link -->
<div class="mt-6 border-t border-gray-100 pt-4">
  <NuxtLink
    to="/mermaid-editor"
    class="text-sm text-gray-500 hover:text-gray-900 hover:underline"
  >
    Mermaid editor
  </NuxtLink>
  <span class="text-xs text-gray-400 ml-2">— live preview for .mmd authoring</span>
</div>
```

This should appear at the bottom of the page regardless of whether sources are loaded (move it outside the `v-if` source grid block if needed — place it as the last element inside the root `<div class="min-h-screen bg-white p-8">` wrapper).
  </action>
  <verify>
    <automated>grep -n "mermaid-editor" /Users/sebastianwiller/Documents/github/vizu-notion-local/pages/index.vue</automated>
  </verify>
  <done>Dashboard contains a NuxtLink to /mermaid-editor visible at the bottom of the page.</done>
</task>

</tasks>

<verification>
1. Visit http://localhost:3000/mermaid-editor — page loads, shows textarea pre-filled with example, diagram renders on load.
2. Edit textarea content, click Render (or Ctrl+Enter) — diagram updates without page reload.
3. Type invalid Mermaid syntax — red error message appears below the render button.
4. Source reference panel shows each configured source with its column mappings.
5. "← Dashboard" link navigates back to /.
6. From dashboard (/), "Mermaid editor" link at the bottom is visible and navigates to /mermaid-editor.
</verification>

<success_criteria>
- /mermaid-editor page exists and renders Mermaid diagrams client-side via direct mermaid.render() call
- Textarea input → Render button (or Ctrl+Enter) → diagram updates in preview container
- Source column mappings visible as reference (from /api/sources)
- Dashboard has a footer link to /mermaid-editor
- No SSR errors (mermaid import gated behind onMounted)
</success_criteria>

<output>
After completion, create `.planning/quick/260613-gen-client-side-mmd-editor-for-live-mermaid-/260613-gen-SUMMARY.md`
</output>
