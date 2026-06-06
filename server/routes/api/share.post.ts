import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const token = Math.random().toString(36).slice(2, 10)
  const sharesDir = process.env.DATA_DIR
    ? join(process.env.DATA_DIR, 'shares')
    : join('/app/data/shares')
  await mkdir(sharesDir, { recursive: true })
  await writeFile(join(sharesDir, `${token}.json`), JSON.stringify(body))
  return { token }
})
