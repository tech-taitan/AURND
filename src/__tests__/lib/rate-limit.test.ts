import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextResponse } from 'next/server'
import { checkRateLimit, resetRateLimiters, withRateLimit } from '@/lib/rate-limit'
import { createNextRequest } from '../fixtures/requests'

const config = { interval: 1000, limit: 2 }

describe('Rate limiting', () => {
  beforeEach(() => {
    resetRateLimiters()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-01T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    resetRateLimiters()
  })

  it('allows requests within the limit', () => {
    const request = createNextRequest({
      headers: { 'x-forwarded-for': '203.0.113.10' },
    })

    const first = checkRateLimit(request, config)
    expect(first.success).toBe(true)
    expect(first.remaining).toBe(1)

    const second = checkRateLimit(request, config)
    expect(second.success).toBe(true)
    expect(second.remaining).toBe(0)
  })

  it('blocks requests over the limit and resets after interval', () => {
    const request = createNextRequest({
      headers: { 'x-forwarded-for': '203.0.113.20' },
    })

    checkRateLimit(request, config)
    checkRateLimit(request, config)
    const blocked = checkRateLimit(request, config)

    expect(blocked.success).toBe(false)
    expect(blocked.remaining).toBe(0)

    vi.advanceTimersByTime(1100)

    const afterReset = checkRateLimit(request, config)
    expect(afterReset.success).toBe(true)
    expect(afterReset.remaining).toBe(1)
  })

  it('adds rate limit headers via withRateLimit', async () => {
    const request = createNextRequest({
      headers: { 'x-forwarded-for': '203.0.113.30' },
    })

    const handler = withRateLimit(async () => {
      return NextResponse.json({ ok: true })
    }, config)

    const response = await handler(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('X-RateLimit-Limit')).toBe('2')
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('1')
    expect(response.headers.get('X-RateLimit-Reset')).toBe('1')
  })

  it('returns 429 when rate limited', async () => {
    const request = createNextRequest({
      headers: { 'x-forwarded-for': '203.0.113.40' },
    })

    checkRateLimit(request, config)
    checkRateLimit(request, config)

    const handler = withRateLimit(async () => {
      return NextResponse.json({ ok: true })
    }, config)

    const response = await handler(request)

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('1')
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
  })
})
