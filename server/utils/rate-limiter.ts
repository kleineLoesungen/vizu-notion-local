import Bottleneck from 'bottleneck'

// Token bucket: 3 requests/second average with burst tolerance
// minTime: 333ms between requests (1000ms / 3 = 333ms)
// reservoir: burst capacity of 3 tokens, refilled every second
export const limiter = new Bottleneck({
  minTime: 333,
  maxConcurrent: 3,
  reservoir: 3,
  reservoirRefreshAmount: 3,
  reservoirRefreshInterval: 1000,
})

// Handle 429 Retry-After from Notion API
limiter.on('failed', async (error: any, _jobInfo: any) => {
  if (error?.status === 429) {
    const retryAfter = parseInt(error?.headers?.['retry-after'] || '1', 10)
    console.warn(`[vizu] Notion rate limit hit. Retrying after ${retryAfter}s`)
    return retryAfter * 1000  // Return ms to wait before retry
  }
  // Don't retry other errors
  return null
})

export function withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  return limiter.schedule(fn)
}
