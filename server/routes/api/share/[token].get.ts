import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const sharesFile = () => join(process.env.DATA_DIR ?? process.cwd(), 'data', 'shares.json')

export default defineEventHandler(async (event) => {
  const { token } = event.context.params as { token: string }
  try {
    const shares = JSON.parse(await readFile(sharesFile(), 'utf-8'))
    if (!shares[token]) throw createError({ statusCode: 404, statusMessage: 'Share not found' })
    return shares[token]
  } catch (err: any) {
    if (err.statusCode === 404) throw err
    if (err.code === 'ENOENT') throw createError({ statusCode: 404, statusMessage: 'Share not found' })
    throw err
  }
})
