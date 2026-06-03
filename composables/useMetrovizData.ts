import type { EnrichedPage } from '@/server/utils/relations'
import type { ColumnMappings } from '@/server/utils/config'
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'

// Metroviz raw input format (matches DataModel.validateAndNormalize() input)
export interface MetrovizStation {
  id: string
  label: string
  date: string       // YYYY-MM-DD or YYYY-Qn
  type: 'start' | 'milestone' | 'terminus' | 'existing' | 'normal' | 'transfer'
  transferTo?: string   // id of linked transfer station on another line
  transferFrom?: string // id of linked transfer station on another line
  flipLabel?: boolean   // if true, renderer flips label above↔below the station
  noSlope?: boolean     // if true, layout engine keeps station at baseY (no transfer y-bend)
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
const LINE_PALETTE = [
  '#E63946', '#457B9D', '#2A9D8F', '#E9C46A',
  '#F4A261', '#264653', '#6D6875', '#B5838D',
  '#52796F', '#354F52', '#1D3557', '#A8DADC',
]

function colorForLine(lineId: string): string {
  let hash = 0
  for (let i = 0; i < lineId.length; i++) {
    hash = (hash << 5) - hash + lineId.charCodeAt(i)
    hash |= 0
  }
  return LINE_PALETTE[Math.abs(hash) % LINE_PALETTE.length]
}

function extractTitle(page: EnrichedPage | PageObjectResponse, titlePropName: string): string {
  const prop = page.properties[titlePropName]
  if (!prop) return 'Untitled'
  if (prop.type === 'title') return (prop as any).title?.[0]?.plain_text || 'Untitled'
  if (prop.type === 'rich_text') return (prop as any).rich_text?.[0]?.plain_text || 'Untitled'
  return 'Untitled'
}

// Find the title of any Notion page by scanning for the property with type === 'title'.
// Used for related pages (e.g. parent) where the title property name may differ from the child's.
function extractAnyTitle(page: EnrichedPage | PageObjectResponse): string {
  for (const prop of Object.values(page.properties)) {
    if (prop.type === 'title') {
      return (prop as any).title?.[0]?.plain_text || 'Untitled'
    }
  }
  return 'Untitled'
}

function extractDate(page: EnrichedPage, datePropName: string): string | null {
  const prop = page.properties[datePropName]
  if (!prop) return null
  if (prop.type === 'date') return (prop as any).date?.start || null
  if (prop.type === 'formula') {
    const f = (prop as any).formula
    if (f?.type === 'date') return f.date?.start || null
    if (f?.type === 'string') return f.string || null
  }
  if (prop.type === 'rich_text') return (prop as any).rich_text?.[0]?.plain_text || null
  return null
}

function extractParentKey(
  page: EnrichedPage,
  parentPropName: string | undefined,
  titlePropName: string
): { key: string; label: string } {
  if (!parentPropName) return { key: page.id, label: extractTitle(page, titlePropName) }

  if (page.resolvedRelations[parentPropName]?.length) {
    const parentPage = page.resolvedRelations[parentPropName][0]
    return { key: parentPage.id, label: extractAnyTitle(parentPage) }
  }

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
 * When a `next` role is present, decompose the sequence graph into metro lines.
 *
 * Rules:
 * - Linear chain (1 next): continues on the same line
 * - Hub node (2+ nexts): current line TERMINATES there; every next branch gets its own new line
 *   Each branch starts with a transfer stub at the hub's date, chained together so the
 *   renderer draws all interchange connectors (hub ↔ stub1 ↔ stub2 ↔ stub3...)
 */
function buildLinesFromNextGraph(
  pages: EnrichedPage[],
  nextPropName: string,
  titlePropName: string,
  datePropName: string | undefined,
  getZone: (page: EnrichedPage) => string
): MetrovizLine[] {
  const pageMap = new Map<string, EnrichedPage>()
  const nextMap = new Map<string, string[]>()
  const pageIds = new Set(pages.map(p => p.id))

  for (const page of pages) {
    pageMap.set(page.id, page)
    const prop = page.properties[nextPropName]
    if (prop?.type === 'relation') {
      const rels = (prop as any).relation as Array<{ id: string }>
      nextMap.set(page.id, rels.filter(r => pageIds.has(r.id)).map(r => r.id))
    } else {
      nextMap.set(page.id, [])
    }
  }

  // In-degree from next edges to find root nodes
  const inDegree = new Map<string, number>()
  for (const id of pageIds) inDegree.set(id, 0)
  for (const nexts of nextMap.values()) {
    for (const nid of nexts) inDegree.set(nid, (inDegree.get(nid) ?? 0) + 1)
  }

  const lines: MetrovizLine[] = []
  let lineCounter = 0
  const assigned = new Set<string>()
  const stationRegistry = new Map<string, MetrovizStation>()

  function getTransferTail(stationId: string): MetrovizStation {
    let s = stationRegistry.get(stationId)!
    let guard = 0
    while (s.transferTo && guard++ < 50) s = stationRegistry.get(s.transferTo)!
    return s
  }

  function walkPath(startId: string, hubStationId?: string) {
    const lineId = `line-${lineCounter++}`
    const firstPage = pageMap.get(startId)!
    const zoneKey = getZone(firstPage)
    const line: MetrovizLine = {
      id: lineId,
      label: extractTitle(firstPage, titlePropName),
      color: colorForLine(lineId),
      zone: zoneKey,
      stations: [],
    }
    lines.push(line)

    if (hubStationId) {
      const hub = stationRegistry.get(hubStationId)!
      const tail = getTransferTail(hubStationId)
      const stubId = `stub-${lineId}`
      const stub: MetrovizStation = {
        id: stubId,
        label: '',
        date: hub.date,
        type: 'transfer',
        transferFrom: tail.id,
        noSlope: true,   // stay at baseY so segment to next real station is horizontal
      }
      tail.transferTo = stubId
      line.stations.push(stub)
      stationRegistry.set(stubId, stub)
    }

    let lastStation: MetrovizStation | null = null
    let currentId = startId

    while (true) {
      if (assigned.has(currentId)) {
        // Convergence: another path already claimed this station.
        // Add a convergence stub on THIS line at the TARGET's date so the connector is vertical.
        const targetStation = stationRegistry.get(currentId)
        if (targetStation) {
          const convId = `conv-${lineId}-${currentId}`
          const convStub: MetrovizStation = {
            id: convId,
            label: '',
            date: targetStation.date,
            type: 'transfer',
            transferTo: currentId,
            noSlope: true,
          }
          line.stations.push(convStub)
          stationRegistry.set(convId, convStub)
          targetStation.type = 'transfer'
          if (!targetStation.transferFrom) targetStation.transferFrom = convId
        }
        break
      }
      assigned.add(currentId)

      const page = pageMap.get(currentId)!
      const nexts = nextMap.get(currentId) ?? []
      const dateStr = datePropName ? extractDate(page, datePropName) : null
      const isHub = nexts.length > 1

      const station: MetrovizStation = {
        id: currentId,
        label: extractTitle(page, titlePropName),
        date: dateStr || '2026-Q1',
        type: isHub ? 'transfer' : nexts.length === 0 ? 'terminus' : 'milestone',
      }
      line.stations.push(station)
      stationRegistry.set(currentId, station)
      lastStation = station

      if (nexts.length === 0) break
      if (nexts.length === 1) { currentId = nexts[0]; continue }

      for (const branchId of nexts) {
        walkPath(branchId, currentId)
      }
      break
    }
  }

  const roots = pages.filter(p => (inDegree.get(p.id) ?? 0) === 0)
  for (const root of roots) {
    if (!assigned.has(root.id)) walkPath(root.id)
  }
  for (const page of pages) {
    if (!assigned.has(page.id)) walkPath(page.id)
  }

  // Gap adjustment: bump same-date stations within each line (excl. conv stubs which must
  // stay in sync with their cross-line target).
  for (const line of lines) {
    const toAdjust = line.stations
      .filter(s => !s.id.startsWith('conv-'))
      .sort((a, b) => a.date.localeCompare(b.date))
    for (let i = 1; i < toAdjust.length; i++) {
      if (toAdjust[i].date <= toAdjust[i - 1].date) {
        toAdjust[i].date = incrementDateByOneDay(toAdjust[i - 1].date)
      }
    }
  }
  // Re-sync convergence stubs to their target's (possibly adjusted) date
  for (const line of lines) {
    for (const s of line.stations) {
      if (s.id.startsWith('conv-') && s.transferTo) {
        const target = stationRegistry.get(s.transferTo)
        if (target) s.date = target.date
      }
    }
  }

  return lines
}

function incrementDateByOneDay(dateStr: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(dateStr + 'T12:00:00Z')
    d.setUTCDate(d.getUTCDate() + 1)
    return d.toISOString().split('T')[0]
  }
  return dateStr
}

// Gap adjustment for parent-based lines (no conv stubs to exclude, just sort and bump).
function applyDateGapsSimple(lines: MetrovizLine[]): void {
  for (const line of lines) {
    line.stations.sort((a, b) => a.date.localeCompare(b.date))
    for (let i = 1; i < line.stations.length; i++) {
      if (line.stations[i].date <= line.stations[i - 1].date) {
        line.stations[i].date = incrementDateByOneDay(line.stations[i - 1].date)
      }
    }
  }
}

// Alternate flipLabel for labeled stations sharing the same date across lines.
// The renderer's flipLabel places the label above vs. below the station line,
// separating overlapping labels at the same x-position.
function applyFlipLabels(lines: MetrovizLine[]): void {
  const byDate = new Map<string, MetrovizStation[]>()
  for (const line of lines) {
    for (const s of line.stations) {
      if (!s.label) continue
      const bucket = byDate.get(s.date)
      if (bucket) bucket.push(s)
      else byDate.set(s.date, [s])
    }
  }
  for (const group of byDate.values()) {
    if (group.length < 2) continue
    group.forEach((s, i) => { if (i % 2 === 1) s.flipLabel = true })
  }
}

/**
 * Merge multiple MetrovizInputData objects into one.
 * Zones are deduplicated by id. Lines and timeline are combined.
 */
export function mergeMetrovizData(datasets: MetrovizInputData[]): MetrovizInputData {
  if (datasets.length === 0) {
    return {
      meta: { title: '', organization: '' },
      timeline: { start: '2026-Q1', end: '2026-Q4' },
      zones: [{ id: 'Timeline', label: 'Timeline', color: '#f3f4f6', collapsed: false }],
      lines: [],
      events: [],
    }
  }
  if (datasets.length === 1) return datasets[0]

  const zonesMap = new Map<string, MetrovizZone>()
  for (const d of datasets) {
    for (const z of d.zones) {
      if (!zonesMap.has(z.id)) zonesMap.set(z.id, z)
    }
  }

  const allDates = datasets.flatMap(d => [d.timeline.start, d.timeline.end]).filter(Boolean).sort()

  return {
    meta: { title: datasets.map(d => d.meta.title).join(' + '), organization: '' },
    timeline: { start: allDates[0] || '2026-Q1', end: allDates[allDates.length - 1] || '2026-Q4' },
    zones: [...zonesMap.values()],
    lines: datasets.flatMap(d => d.lines),
    events: [],
  }
}

/**
 * Transform EnrichedPage[] into Metroviz raw input format.
 *
 * When `next` role is present: builds lines from the sequence graph — chains become
 * lines, branch points become transfer stations (A → B and A → C = two lines meeting at A).
 *
 * When `next` is absent: falls back to parent-based grouping (D-11).
 */
export function useMetrovizData(
  pages: EnrichedPage[],
  columnMappings: ColumnMappings,
  sourceTitle: string = 'Roadmap'
): MetrovizInputData {
  if (pages.length === 0) {
    return {
      meta: { title: sourceTitle, organization: '' },
      timeline: { start: '2026-Q1', end: '2026-Q4' },
      zones: [{ id: 'Timeline', label: 'Timeline', color: '#f3f4f6', collapsed: false }],
      lines: [],
      events: [],
    }
  }

  const titlePropName = columnMappings['title']
  const datePropName = columnMappings['date']
  const parentPropName = columnMappings['parent']
  const tagPropName = columnMappings['tag']
  const nextPropName = columnMappings['next']

  const zonesMap = new Map<string, MetrovizZone>()

  function getZone(page: EnrichedPage): string {
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

    // Fall back to parent role for zone grouping when no tag is configured.
    // Milestones belonging to the same parent project appear in the same zone.
    if (zoneKey === 'Timeline' && parentPropName) {
      const { key, label } = extractParentKey(page, parentPropName, titlePropName)
      zoneKey = key
      zoneLabel = label
    }

    if (!zonesMap.has(zoneKey)) {
      zonesMap.set(zoneKey, { id: zoneKey, label: zoneLabel, color: '#f3f4f6', collapsed: false })
    }
    return zoneKey
  }

  // Populate zones from all pages
  for (const page of pages) getZone(page)

  let linesList: MetrovizLine[]

  if (nextPropName) {
    linesList = buildLinesFromNextGraph(pages, nextPropName, titlePropName, datePropName, getZone)
    // flipLabel is applied below after the else block
  } else {
    // D-11: parent-based grouping
    const linesMap = new Map<string, MetrovizLine>()
    for (const page of pages) {
      const zoneKey = getZone(page)
      const { key: lineKey, label: lineLabel } = extractParentKey(page, parentPropName, titlePropName)
      if (!linesMap.has(lineKey)) {
        linesMap.set(lineKey, { id: lineKey, label: lineLabel, color: colorForLine(lineKey), zone: zoneKey, stations: [] })
      }
      const dateStr = datePropName ? extractDate(page, datePropName) : null
      linesMap.get(lineKey)!.stations.push({
        id: page.id,
        label: titlePropName ? extractTitle(page, titlePropName) : page.id.slice(0, 8),
        date: dateStr || '2026-Q1',
        type: 'milestone',
      })
    }
    linesList = Array.from(linesMap.values())
    applyDateGapsSimple(linesList)  // gap adjustment for parent-based path
  }

  // Apply cross-line label separation for both paths
  applyFlipLabels(linesList)

  const allDates = linesList.flatMap(l => l.stations.map(s => s.date)).filter(Boolean).sort()

  return {
    meta: { title: sourceTitle, organization: '' },
    timeline: { start: allDates[0] || '2026-Q1', end: allDates[allDates.length - 1] || '2026-Q4' },
    zones: Array.from(zonesMap.values()),
    lines: linesList,
    events: [],
  }
}
