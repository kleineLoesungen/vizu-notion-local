import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export default defineEventHandler(async (event) => {
  const { token } = event.context.params as { token: string }
  const sharesDir = process.env.DATA_DIR
    ? join(process.env.DATA_DIR, 'shares')
    : join('/app/data/shares')
  try {
    const raw = await readFile(join(sharesDir, `${token}.json`), 'utf-8')
    return JSON.parse(raw)
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Share not found' })
    }
    throw err
  }
})
