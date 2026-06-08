import { getTemplates } from '../../../utils/templates'

export default defineEventHandler(() => {
  return getTemplates().map((t) => ({
    id: t.id,
    title: t.title,
    sources: t.sources,
  }))
})
