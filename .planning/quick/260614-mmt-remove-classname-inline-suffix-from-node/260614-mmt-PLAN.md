---
phase: quick-260614-mmt
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - server/utils/templates.ts
autonomous: true
requirements: []
must_haves:
  truths:
    - "Mermaid diagrams render without lexical errors when styled nodes appear as edge targets"
    - "Node styling (classDef colors) is still applied via the post-render `class nodeId cls_X` block"
  artifacts:
    - path: "server/utils/templates.ts"
      provides: "nodeId helper without :::className inline suffix"
      contains: "_classAccum.set(id, className)"
  key_links:
    - from: "server/utils/templates.ts nodeId helper"
      to: "route files post-render class block"
      via: "_classAccum map populated during template execution"
      pattern: "_classAccum\\.set\\(id, className\\)"
---

<objective>
Remove the `:::className` inline suffix from the `nodeId` Handlebars helper return value in `server/utils/templates.ts`.

Purpose: Mermaid's lexer only allows `:::className` on standalone node definitions, not on node references inside edge definitions (e.g., `nXXX --> nYYY:::cls_parent` is invalid). The `_classAccum` accumulator already drives post-render `class nodeId cls_X` statements in the route files, which is the correct mechanism and works regardless of where a node appears.

Output: Single-line change to line 83 of `server/utils/templates.ts` — the return in the `if (className)` branch no longer appends `:::${className}`. Accumulator call on line 82 is unchanged.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@server/utils/templates.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove :::className suffix from nodeId helper return</name>
  <files>server/utils/templates.ts</files>
  <action>
    In `server/utils/templates.ts`, locate the `nodeId` helper's `if (className)` branch (currently lines 81-84).

    Change line 83 from:
    ```typescript
    return new Handlebars.SafeString(`${id}${open}${safeLabel}${close}:::${className}`)
    ```

    To:
    ```typescript
    return new Handlebars.SafeString(`${id}${open}${safeLabel}${close}`)
    ```

    The `_classAccum.set(id, className)` call on line 82 MUST remain — it populates the accumulator that drives the post-render `class nodeId cls_X` block in the route files, which is the correct and only mechanism needed for node class assignment.

    Also update the comment block above the helper (lines 70-73) to remove the reference to "appends :::className suffix" — replace with: "className present: accumulates node for post-render `class` assignment; uses bracket syntax from shape (or default rectangle)."

    No other files need changing.
  </action>
  <verify>
    <automated>grep -n ":::${className}" /Users/sebastianwiller/Documents/github/vizu-notion-local/server/utils/templates.ts; echo "exit:$?" && grep -n "_classAccum.set" /Users/sebastianwiller/Documents/github/vizu-notion-local/server/utils/templates.ts</automated>
  </verify>
  <done>
    - Line 83 returns `${id}${open}${safeLabel}${close}` with no `:::` suffix
    - `_classAccum.set(id, className)` still present on the preceding line
    - `grep` for `:::${className}` returns no matches in the helper return statement
    - TypeScript compiles without errors: `npx tsc --noEmit` passes (or no new errors introduced)
  </done>
</task>

</tasks>

<verification>
Confirm the fix does not break styling:
1. `_classAccum` is still populated when `className` is provided — post-render `class` statements will still be emitted by route files.
2. No remaining `:::` suffix on node references that appear as edge targets.
3. Run `npx tsc --noEmit` from repo root to confirm no TypeScript errors.
</verification>

<success_criteria>
- `server/utils/templates.ts` nodeId helper `if (className)` branch returns node string WITHOUT `:::className`
- `_classAccum.set(id, className)` line is untouched
- Mermaid diagrams with styled nodes used as edge targets no longer produce lexical errors
- Node colors/styles still render correctly via the `class nodeId cls_X` post-render block
</success_criteria>

<output>
After completion, create `.planning/quick/260614-mmt-remove-classname-inline-suffix-from-node/260614-mmt-SUMMARY.md` following the summary template.
</output>
