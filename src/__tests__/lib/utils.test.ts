import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  calculateDeadline,
  cn,
  daysUntilDeadline,
  formatCurrency,
  formatDate,
} from '@/lib/utils'
import { resetSystemTime, setSystemTime } from '../fixtures/time'

describe('Utils', () => {
  beforeEach(() => {
    setSystemTime('2026-02-01T12:00:00Z')
  })

  afterEach(() => {
    resetSystemTime()
  })

  it('formats currency in AUD', () => {
    const formatted = formatCurrency(12345.67)
    expect(formatted).toContain('$')
    expect(formatted).toContain('12,345')
  })

  it('formats dates using en-AU locale', () => {
    const formatted = formatDate(new Date('2026-02-01T12:00:00Z'))
    expect(formatted).toMatch(/Feb/)
    expect(formatted).toContain('2026')
  })

  it('calculates deadline 10 months ahead', () => {
    const deadline = calculateDeadline(new Date('2025-06-30T12:00:00Z'))
    expect(deadline.getMonth()).toBe(3)
    expect(deadline.getFullYear()).toBe(2026)
  })

  it('calculates days until deadline', () => {
    const deadline = new Date('2026-02-11T12:00:00Z')
    const days = daysUntilDeadline(deadline)
    expect(days).toBe(10)
  })

  it('merges class names', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
})
