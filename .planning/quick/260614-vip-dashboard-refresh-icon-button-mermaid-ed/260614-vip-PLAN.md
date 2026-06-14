---
phase: quick-260614-vip
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/SourceCard.vue
  - pages/mermaid-editor.vue
autonomous: true
requirements: [VIP-01, VIP-02]

must_haves:
  truths:
    - "SourceCard shows a circular-arrow icon button at absolute top-right corner instead of a text Refresh in the button row"
    - "The icon button spins while isRefreshing is true"
    - "Mermaid editor has a Download SVG button next to Fit to content that saves the current preview as an SVG file"
  artifacts:
    - path: "components/SourceCard.vue"
      provides: "Absolute-positioned icon refresh button, relative outer div"
    - path: "pages/mermaid-editor.vue"
      provides: "Download SVG button using useExport composable"
  key_links:
    - from: "pages/mermaid-editor.vue"
      to: "composables/useExport.ts"
      via: "import { useExport } from '@/composables/useExport'"
      pattern: "downloadSVG\\('mmd-editor-preview'"
---

<objective>
Two focused UI changes: (1) replace the text Refresh button in SourceCard with an absolute-positioned icon-only circular-arrow button, and (2) add a Download SVG button in the Mermaid editor preview panel.

Purpose: Cleaner dashboard card layout (icon doesn't crowd the button row) and ability to export Mermaid previews as SVG files.
Output: Updated SourceCard.vue and mermaid-editor.vue.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace text Refresh button with absolute icon button in SourceCard</name>
  <files>components/SourceCard.vue</files>
  <action>
    1. Add `relative` to the outer card div: change
       `class="p-4 rounded border border-gray-200 bg-white hover:shadow-md transition-shadow"`
       to
       `class="relative p-4 rounded border border-gray-200 bg-white hover:shadow-md transition-shadow"`

    2. Remove the existing `<!-- Refresh button -->` `<button>` block entirely from the flex row (lines 51–58 in current file).

    3. Add a new icon-only circular-arrow button as the first child of the outer div (before the source name `<p>`):

    ```html
    <!-- Refresh icon button (absolute top-right) -->
    <button
      class="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      :class="{ 'animate-spin': isRefreshing }"
      :disabled="isRefreshing"
      :title="isRefreshing ? 'Refreshing…' : 'Refresh'"
      @click="emit('refresh')"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    </button>
    ```

    The `animate-spin` Tailwind class handles the spinning state — no custom CSS needed.
    Keep all other template content unchanged.
  </action>
  <verify>
    <automated>grep -n "absolute top-2 right-2" /Users/sebastianwiller/Documents/github/vizu-notion-local/components/SourceCard.vue && grep -n "animate-spin" /Users/sebastianwiller/Documents/github/vizu-notion-local/components/SourceCard.vue && ! grep -n "Refresh\b" /Users/sebastianwiller/Documents/github/vizu-notion-local/components/SourceCard.vue | grep -v "Refreshing\|isRefreshing\|refresh\|title"</automated>
  </verify>
  <done>SourceCard outer div has `relative`, icon button is `absolute top-2 right-2`, `animate-spin` fires when isRefreshing is true, text "Refresh" label is gone from the flex row.</done>
</task>

<task type="auto">
  <name>Task 2: Add Download SVG button to Mermaid editor preview panel</name>
  <files>pages/mermaid-editor.vue</files>
  <action>
    1. In the `<script setup>` section, add the import for useExport at the top of the imports block:
       ```ts
       import { useExport } from '@/composables/useExport'
       ```
       And destructure it (add after the existing `ref`, `computed`, `onMounted`, `onBeforeUnmount` import line):
       ```ts
       const { downloadSVG } = useExport()
       ```

    2. In the template, locate the "Fit to content" button (after the preview div, around line 94–98):
       ```html
       <button
         class="text-xs text-gray-500 hover:text-gray-900 mt-1"
         @click="fitToContent"
       >
         Fit to content
       </button>
       ```

       Replace it with a flex wrapper containing both buttons side by side:
       ```html
       <div class="flex items-center gap-3 mt-1">
         <button
           class="text-xs text-gray-500 hover:text-gray-900"
           @click="fitToContent"
         >
           Fit to content
         </button>
         <button
           class="text-xs text-gray-500 hover:text-gray-900"
           @click="downloadSVG('mmd-editor-preview', 'mermaid-preview')"
         >
           Download SVG
         </button>
       </div>
       ```

    The container ID `'mmd-editor-preview'` matches the existing `id="mmd-editor-preview"` div. The file prefix `'mermaid-preview'` produces filenames like `mermaid-preview-2026-06-14T....svg`.
  </action>
  <verify>
    <automated>grep -n "downloadSVG" /Users/sebastianwiller/Documents/github/vizu-notion-local/pages/mermaid-editor.vue && grep -n "useExport" /Users/sebastianwiller/Documents/github/vizu-notion-local/pages/mermaid-editor.vue && grep -n "Download SVG" /Users/sebastianwiller/Documents/github/vizu-notion-local/pages/mermaid-editor.vue</automated>
  </verify>
  <done>useExport is imported and destructured, Download SVG button appears next to Fit to content, calls downloadSVG('mmd-editor-preview', 'mermaid-preview').</done>
</task>

</tasks>

<verification>
- `components/SourceCard.vue`: outer div has `relative`, icon-only circular-arrow button at `absolute top-2 right-2`, `animate-spin` on isRefreshing, text "Refresh" removed from flex row.
- `pages/mermaid-editor.vue`: `useExport` imported, `downloadSVG` destructured, Download SVG button next to Fit to content using identical text-xs text-gray-500 hover:text-gray-900 styling.
</verification>

<success_criteria>
- Dashboard source cards show icon-only refresh button in the top-right corner of the card
- Icon spins (Tailwind animate-spin) while refreshing
- Mermaid editor preview panel has "Download SVG" button alongside "Fit to content"
- Clicking Download SVG saves current SVG preview to disk
</success_criteria>

<output>
After completion, create `.planning/quick/260614-vip-dashboard-refresh-icon-button-mermaid-ed/260614-vip-SUMMARY.md`
</output>
