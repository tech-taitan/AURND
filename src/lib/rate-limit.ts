import { NextRequest, NextResponse } from 'next/server'
import { LRUCache } from 'lru-cache'

type RateLimitConfig = {
  interval: number // Time window in milliseconds
  limit: number // Max requests per interval
}

const rateLimiters = new Map<string, LRUCache<string, number[]>>()

export function resetRateLimiters() {
  rateLimiters.clear()
}

function getRateLimiter(name: string, config: RateLimitConfig): LRUCache<string, number[]> {
  if (!rateLimiters.has(name)) {
    rateLimiters.set(
      name,
      new LRUCache<string, number[]>({
        max: 10000, // Max number of unique IPs/keys to track
        ttl: config.interval,
      })
    )
  }
  return rateLimiters.get(name)!
}

function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  
  return cfConnectingIp || realIp || forwarded?.split(',')[0] || 'unknown'
}

export type RateLimitResult = {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig = { interval: 60000, limit: 100 }
): RateLimitResult {
  const key = getClientIdentifier(request)
  const now = Date.now()
  const windowStart = now - config.interval

  const limiter = getRateLimiter('default', config)
  const timestamps = limiter.get(key) || []
  
  // Filter to only timestamps within current window
  const validTimestamps = timestamps.filter(ts => ts > windowStart)
  
  if (validTimestamps.length >= config.limit) {
    const oldestInWindow = Math.min(...validTimestamps)
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: Math.ceil((oldestInWindow + config.interval - now) / 1000),
    }
  }

  // Add current timestamp
  validTimestamps.push(now)
  limiter.set(key, validTimestamps)

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - validTimestamps.length,
    reset: Math.ceil(config.interval / 1000),
  }
}

export function withRateLimit(
  handler: (request: NextRequest, ...args: unknown[]) => Promise<NextResponse>,
  config?: RateLimitConfig
) {
  return async (request: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
    const result = checkRateLimit(request, config)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.reset.toString(),
            'Retry-After': result.reset.toString(),
          },
        }
      )
    }

    const response = await handler(request, ...args)

    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Limit', result.limit.toString())
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
    response.headers.set('X-RateLimit-Reset', result.reset.toString())

    return response
  }
}

// Pre-configured rate limiters for different use cases
export const rateLimitConfigs = {
  // Standard API endpoints
  api: { interval: 60000, limit: 100 },
  // Authentication endpoints (stricter)
  auth: { interval: 300000, limit: 10 },
  // File upload (stricter)
  upload: { interval: 60000, limit: 20 },
  // Heavy operations like OCR
  heavy: { interval: 60000, limit: 10 },
}
