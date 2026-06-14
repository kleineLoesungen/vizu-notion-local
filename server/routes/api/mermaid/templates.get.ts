import { getTemplates } from '../../../utils/templates'

export default defineEventHandler(() => {
  return getTemplates().map((t) => ({
    id: t.id,
    title: t.title,
    sources: t.sources,
    styles: t.styles,  // included so the MMD editor can reconstruct the full .mmd file
    body: t.body,
  }))
})
