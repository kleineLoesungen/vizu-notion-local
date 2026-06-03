import type { EnrichedPage } from '@/server/utils/relations'
import type { ColumnMappings } from '@/server/utils/config'
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'

// Metroviz raw input format (matches DataModel.validateAndNormalize() input)
export interface MetrovizStation {
  id: string
  label: string
  date: string       // YYYY-MM-DD or YYYY-Qn
  type: 'start' | 'milestone' | 'terminus' | 'existing' | 'normal'
}

export interface MetrovizLine {
  id: string
  label: string
  color: string
  zone: string       // zone id reference
  stations: MetrovizStation[]
}

export interface MetrovizZone {
  id: string
  label: string
  color: string
  collapsed: boolean
}

export interface MetrovizInputData {
  meta: { title: string; organization: string }
  timeline: { start: string; end: string }
  zones: MetrovizZone[]
  lines: MetrovizLine[]
  events: []
}

// 12-color deterministic palette for lines
// Chosen for visual distinction on white backgrounds
const LINE_PALETTE = [
  '#E63946', '#457B9D', '#2A9D8F', '#E9C46A',
  '#F4A261', '#264653', '#6D6875', '#B5838D',
  '#52796F', '#354F52', '#1D3557', '#A8DADC',
]

/**
 * Generate a deterministic color for a given line id.
 * Same id always maps to same color (hash-based index into palette).
 * Per RESEARCH.md open question 2: deterministic colors prevent re-render flicker.
 */
function colorForLine(lineId: string): string {
  let hash = 0
  for (let i = 0; i < lineId.length; i++) {
    hash = (hash << 5) - hash + lineId.charCodeAt(i)
    hash |= 0
  }
  return LINE_PALETTE[Math.abs(hash) % LINE_PALETTE.length]
}

/**
 * Extract the plain text value from a Notion title property.
 */
function extractTitle(page: EnrichedPage | PageObjectResponse, titlePropName: string): string {
  const prop = page.properties[titlePropName]
  if (!prop) return 'Untitled'
  if (prop.type === 'title') {
    return (prop as any).title?.[0]?.plain_text || 'Untitled'
  }
  if (prop.type === 'rich_text') {
    return (prop as any).rich_text?.[0]?.plain_text || 'Untitled'
  }
  return 'Untitled'
}

/**
 * Extract date string from a Notion date, formula, or rich_text property.
 * Returns YYYY-MM-DD string or null if not available.
 */
function extractDate(page: EnrichedPage, datePropName: string): string | null {
  const prop = page.properties[datePropName]
  if (!prop) return null

  // Notion date property: { type: 'date', date: { start: '2026-01-15', ... } }
  if (prop.type === 'date') {
    return (prop as any).date?.start || null
  }
  // Formula property returning a date: { type: 'formula', formula: { type: 'date', date: { start: '...' } } }
  if (prop.type === 'formula') {
    const formula = (prop as any).formula
    if (formula?.type === 'date') return formula.date?.start || null
    if (formula?.type === 'string') return formula.string || null
  }
  // Rich text fallback (some users store dates as text)
  if (prop.type === 'rich_text') {
    return (prop as any).rich_text?.[0]?.plain_text || null
  }
  return null
}

/**
 * Extract the parent label for grouping into lines.
 * Looks in resolvedRelations first (for relation-typed parent), then falls back to select/title.
 * Per D-11: pages with same parent share a line.
 * Returns a stable string key used as the line id.
 */
function extractParentKey(
  page: EnrichedPage,
  parentPropName: string | undefined,
  titlePropName: string
): { key: string; label: string } {
  if (!parentPropName) {
    // D-11: no parent role → each page is its own line
    return { key: page.id, label: extractTitle(page, titlePropName) }
  }

  // Check resolvedRelations first (relation-type parent)
  if (page.resolvedRelations[parentPropName]?.length) {
    const parentPage = page.resolvedRelations[parentPropName][0]
    const parentTitle = extractTitle(parentPage as EnrichedPage, titlePropName)
    return { key: parentPage.id, label: parentTitle }
  }

  // Fallback: check property directly
  const prop = page.properties[parentPropName]
  if (!prop) return { key: page.id, label: extractTitle(page, titlePropName) }

  if (prop.type === 'relation') {
    const rel = (prop as any).relation as Array<{ id: string }>
    if (rel?.length) return { key: rel[0].id, label: `Line ${rel[0].id.slice(0, 8)}` }
  }
  if (prop.type === 'select') {
    const name = (prop as any).select?.name || 'Default'
    return { key: name, label: name }
  }

  return { key: page.id, label: extractTitle(page, titlePropName) }
}

/**
 * Transform EnrichedPage[] into Metroviz raw input format.
 *
 * Decision references:
 * - D-09: date role → X-axis timeline position
 * - D-10: next role → sequential connections (not used in this transform; handled by Metroviz
 *         internally via station order within a line)
 * - D-11: parent role → groups stations into lines (optional)
 * - D-12: tag role → groups lines into zones (optional, defaults to "Timeline")
 * - D-13: station label = title role value only
 * - D-08: permissive — missing optional roles degrade gracefully
 */
export function useMetrovizData(
  pages: EnrichedPage[],
  columnMappings: ColumnMappings,
  sourceTitle: string = 'Roadmap'
): MetrovizInputData {
  // Resolve role names to Notion property names
  const titlePropName = columnMappings['title']
  const datePropName = columnMappings['date']
  const parentPropName = columnMappings['parent']
  const tagPropName = columnMappings['tag']

  // Collect data structures
  const zonesMap = new Map<string, MetrovizZone>()
  const linesMap = new Map<string, MetrovizLine>()

  for (const page of pages) {
    // D-12: tag → zone grouping; default to "Timeline" if no tag role
    let zoneKey = 'Timeline'
    let zoneLabel = 'Timeline'
    if (tagPropName) {
      const prop = page.properties[tagPropName]
      if (prop?.type === 'select') {
        const name = (prop as any).select?.name
        if (name) { zoneKey = name; zoneLabel = name }
      } else if (prop?.type === 'multi_select') {
        const first = (prop as any).multi_select?.[0]?.name
        if (first) { zoneKey = first; zoneLabel = first }
      } else if (prop?.type === 'rich_text') {
        const text = (prop as any).rich_text?.[0]?.plain_text
        if (text) { zoneKey = text; zoneLabel = text }
      }
    }

    if (!zonesMap.has(zoneKey)) {
      zonesMap.set(zoneKey, {
        id: zoneKey,
        label: zoneLabel,
        color: '#f3f4f6',
        collapsed: false,
      })
    }

    // D-11: parent → line grouping
    const { key: lineKey, label: lineLabel } = extractParentKey(page, parentPropName, titlePropName)

    if (!linesMap.has(lineKey)) {
      linesMap.set(lineKey, {
        id: lineKey,
        label: lineLabel,
        color: colorForLine(lineKey),
        zone: zoneKey,
        stations: [],
      })
    }

    // D-09: date → X-axis position
    const dateStr = datePropName ? extractDate(page, datePropName) : null

    // D-13: station label = title role only
    const stationLabel = titlePropName ? extractTitle(page, titlePropName) : page.id.slice(0, 8)

    linesMap.get(lineKey)!.stations.push({
      id: page.id,
      label: stationLabel,
      date: dateStr || '2026-Q1',   // D-08: fallback if date missing
      type: 'milestone',
    })
  }

  // Sort stations by date within each line (ascending)
  for (const line of linesMap.values()) {
    line.stations.sort((a, b) => a.date.localeCompare(b.date))
  }

  // Compute timeline bounds from all station dates
  const allDates = Array.from(linesMap.values())
    .flatMap(l => l.stations.map(s => s.date))
    .filter(Boolean)
    .sort()

  const timelineStart = allDates[0] || '2026-Q1'
  const timelineEnd = allDates[allDates.length - 1] || '2026-Q4'

  // D-08: empty pages → return default structure with single zone
  if (pages.length === 0) {
    return {
      meta: { title: sourceTitle, organization: '' },
      timeline: { start: '2026-Q1', end: '2026-Q4' },
      zones: [{ id: 'Timeline', label: 'Timeline', color: '#f3f4f6', collapsed: false }],
      lines: [],
      events: [],
    }
  }

  return {
    meta: { title: sourceTitle, organization: '' },
    timeline: { start: timelineStart, end: timelineEnd },
    zones: Array.from(zonesMap.values()),
    lines: Array.from(linesMap.values()),
    events: [],
  }
}
