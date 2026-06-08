import { loadConfig } from '../utils/config'
import { loadTemplates } from '../utils/templates'

let _initialized = false
let _initError: Error | null = null

export default defineEventHandler(async (_event) => {
  if (_initError) {
    // Config failed at startup — every request returns 503
    throw createError({
      statusCode: 503,
      statusMessage: 'Service Unavailable',
      message: `Configuration error: ${_initError.message}`,
    })
  }

  if (_initialized) return

  try {
    const configPath =
      process.env.VIZU_CONFIG_PATH ??
      (process.env.NODE_ENV === 'production' ? '/app/config/sources.json' : 'config/sources.json')

    await loadConfig(configPath)

    // Derive template directory from config path (same directory, *.mmd files)
    const templateDir = configPath.includes('/') ? configPath.substring(0, configPath.lastIndexOf('/')) : 'config'

    // Template loading failures are non-fatal (D-11): log and continue with no templates
    try {
      await loadTemplates(templateDir)
    } catch (templateErr: any) {
      console.error(`[vizu] Mermaid template loading failed: ${templateErr.message}`)
      console.error('[vizu] Continuing without Mermaid templates. Fix the error above and restart.')
    }

    _initialized = true
  } catch (err) {
    _initError = err as Error
    console.error('[vizu] FATAL: Config validation failed at startup:')
    console.error(_initError.message)
    // Exit in production; in dev, return 503 for each request
    if (process.env.NODE_ENV === 'production') {
      process.exit(1)
    }
    throw createError({
      statusCode: 503,
      statusMessage: 'Service Unavailable',
      message: `Configuration error: ${_initError.message}`,
    })
  }
})
