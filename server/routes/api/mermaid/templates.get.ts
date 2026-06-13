import { getTemplates } from '../../../utils/templates'

export default defineEventHandler(() => {
  return getTemplates().map((t) => ({
    id: t.id,
    title: t.title,
    sources: t.sources,
    body: t.body,  // raw template body (frontmatter stripped) — used by the MMD editor
  }))
})
