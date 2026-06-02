import { loadConfig } from '../utils/config'

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
    await loadConfig('/app/config/sources.json')
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
