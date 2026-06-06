import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const sharesFile = () => join(process.env.DATA_DIR ?? process.cwd(), 'data', 'shares.json')

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const token = Math.random().toString(36).slice(2, 10)
  const file = sharesFile()
  await mkdir(join(file, '..'), { recursive: true })
  let shares: Record<string, unknown> = {}
  try {
    shares = JSON.parse(await readFile(file, 'utf-8'))
  } catch {}
  shares[token] = body
  await writeFile(file, JSON.stringify(shares))
  return { token }
})
