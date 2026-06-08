---
phase: quick
plan: 260608-ueq
type: execute
wave: 1
depends_on: []
files_modified:
  - README.md
  - config/mermaid.example.mmd
autonomous: true
requirements: []
must_haves:
  truths:
    - "README.md Handlebars bindings table lists all available helpers with working examples"
    - "No documented helper that is not actually registered in templates.ts"
    - "mermaid.example.mmd does not demonstrate a broken helper call"
  artifacts:
    - path: "README.md"
      provides: "Complete Handlebars helper reference under Mermaid Templates section"
    - path: "config/mermaid.example.mmd"
      provides: "Example template that uses only available helpers"
  key_links:
    - from: "README.md Handlebars bindings table"
      to: "server/utils/templates.ts"
      via: "Only documents helpers Handlebars provides natively (no registerHelper calls exist)"
---

<objective>
Document all available Handlebars template helpers in README.md under the existing Mermaid Templates section, and fix the example template file that references a `math` helper which is not registered.

Purpose: Admins writing `.mmd` templates need accurate reference for what syntax works. The current README table is incomplete (missing `#unless`, `@first`) and the example file demonstrates `{{math @index '-' 1}}` which silently fails at render time.

Output: Updated README.md bindings table + fixed mermaid.example.mmd
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@README.md
@config/mermaid.example.mmd
@server/utils/templates.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Expand README.md Handlebars bindings table and fix math helper note</name>
  <files>README.md</files>
  <action>
    Find the "Handlebars bindings" table in the Mermaid Diagram Templates section (currently 4 rows: `{{fieldName}}`, `{{#each}}`, `{{this.fieldName}}`, `{{@index}}`).

    Replace the table with a complete version covering all standard Handlebars helpers that are actually available (server/utils/templates.ts registers NO custom helpers — only stock Handlebars built-ins apply):

    | Syntax | What it does |
    |--------|-------------|
    | `{{fieldName}}` | Inserts a scalar value from the top-level context; `fieldName` is a `columnMappings` key (e.g. `title`, `status`) or `id` (Notion page ID, always available) |
    | `{{#each sourceName}} … {{/each}}` | Iterates over all rows from the named source |
    | `{{this.fieldName}}` | Inside `#each`, accesses a field on the current row |
    | `{{@index}}` | Inside `#each`, the zero-based iteration index (useful for unique node IDs) |
    | `{{@first}}` | Inside `#each`, boolean `true` on the first iteration — useful with `#unless` to skip leading separators |
    | `{{#unless condition}} … {{/unless}}` | Renders the block only when `condition` is falsy — commonly used with `@first` to suppress the first separator or arrow |

    After the table, add a callout note explaining that no arithmetic helpers (`math`, `add`, etc.) are registered — admins needing arithmetic should pre-compute values in Notion formula columns and expose them via `columnMappings`:

    > **Note:** No arithmetic or comparison helpers are registered. If you need a computed value (e.g. an index starting at 1, or a formatted number), add a Notion formula column to your database, map it in `columnMappings`, and reference it with `{{this.fieldName}}`.

    The `page.id` field is always available as `{{this.id}}` inside `#each` blocks without needing a `columnMappings` entry — add this as a separate row after `{{@first}}`:

    | `{{this.id}}` | Inside `#each`, the Notion page ID — available without a `columnMappings` entry; useful for stable unique node IDs |

    Final table order: `{{fieldName}}`, `{{#each}}`, `{{this.fieldName}}`, `{{this.id}}`, `{{@index}}`, `{{@first}}`, `{{#unless}}`.
  </action>
  <verify>grep -n "unless\|@first\|this\.id\|arithmetic\|math" /Users/sebastianwiller/Documents/github/vizu-notion-local/README.md</verify>
  <done>README.md Handlebars table has 7 rows including `#unless`, `@first`, `this.id`; note about no arithmetic helpers is present</done>
</task>

<task type="auto">
  <name>Task 2: Fix mermaid.example.mmd — replace broken math helper with working pattern</name>
  <files>config/mermaid.example.mmd</files>
  <action>
    The current example uses `{{math @index '-' 1}}` which calls an unregistered helper and will produce empty output at render time.

    Replace the "link all rows in sequence" block with a working pattern that uses only `{{#unless @first}}` to skip the first row and produces a linear chain without arithmetic:

    Current broken block:
    ```
    {{#each my-source}}
    {{#unless @first}}node_{{math @index '-' 1}}["{{this.title}}"] --> {{/unless}}node_{{@index}}["{{this.title}}"]
    {{/each}}
    ```

    Replace with a pattern that generates edges by referencing each node by its Notion page ID (stable, no arithmetic needed):
    ```
    {{!-- Example: link all rows in sequence using page IDs as node handles --}}
    {{#each my-source}}
    node_{{this.id}}["{{this.title}}"]
    {{/each}}
    ```

    Also update the node rendering block above it to use `this.id` instead of `@index` for the node ID (more stable across re-renders):
    ```
    {{#each my-source}}
    node_{{this.id}}["{{this.title}}"]
    {{/each}}
    ```

    The combined example after the change should demonstrate: static node, `#each` iteration with `this.id` for stable node IDs, and `#unless @first` for a separator/arrow between nodes (without arithmetic). Final example body:

    ```
    flowchart TD
      %% Use {{fieldName}} to insert a single value from the current row.
      %% fieldName must match a key in that source's columnMappings (not the raw Notion property name).
      %%
      %% Use {{#each sourceName}} ... {{/each}} to iterate over all rows from a source.
      %% Inside the block, {{this.fieldName}} accesses a field on each row.
      %% {{this.id}} is always available as a stable unique identifier (no columnMappings entry needed).

      %% Example: static node
      Start([Start])

      %% Example: iterate over rows, using page ID as unique node handle
      {{#each my-source}}
      node_{{this.id}}["{{this.title}}"]
      {{/each}}

      %% Example: link rows in sequence — skip the first item with #unless @first
      {{#each my-source}}
      {{#unless @first}}Start --> node_{{this.id}}["{{this.title}}"]{{/unless}}
      {{/each}}
    ```

    Keep the existing frontmatter comment block and YAML frontmatter unchanged.
  </action>
  <verify>grep -n "math\|registerHelper" /Users/sebastianwiller/Documents/github/vizu-notion-local/config/mermaid.example.mmd; echo "exit: $?"</verify>
  <done>`math` helper reference is gone from mermaid.example.mmd; `#unless @first` and `this.id` patterns are present</done>
</task>

</tasks>

<verification>
After both tasks complete:
- grep -n "unless\|@first\|this\.id" /Users/sebastianwiller/Documents/github/vizu-notion-local/README.md — should show all three
- grep -n "math" /Users/sebastianwiller/Documents/github/vizu-notion-local/config/mermaid.example.mmd — should return nothing
- grep -n "math" /Users/sebastianwiller/Documents/github/vizu-notion-local/README.md — should only appear in the "Note" warning, not as a documented helper row
</verification>

<success_criteria>
- README.md Handlebars table documents exactly 7 helpers: `{{fieldName}}`, `{{#each}}`, `{{this.fieldName}}`, `{{this.id}}`, `{{@index}}`, `{{@first}}`, `{{#unless}}`
- A note clarifies that no arithmetic helpers exist and how to work around this
- mermaid.example.mmd demonstrates a working pattern using only registered/built-in helpers
- No helper documented or demonstrated that is not available in standard Handlebars 4.x
</success_criteria>

<output>
After completion, create `.planning/quick/260608-ueq-document-handlebars-template-helpers-in-/260608-ueq-SUMMARY.md`
</output>
