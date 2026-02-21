import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger } from '@/lib/logger'

describe('Logger', () => {
  let capturedLogs: { level: string, args: unknown[] }[] = []
  
  beforeEach(() => {
    capturedLogs = []
    vi.spyOn(console, 'debug').mockImplementation((...args) => {
      capturedLogs.push({ level: 'debug', args })
    })
    vi.spyOn(console, 'info').mockImplementation((...args) => {
      capturedLogs.push({ level: 'info', args })
    })
    vi.spyOn(console, 'warn').mockImplementation((...args) => {
      capturedLogs.push({ level: 'warn', args })
    })
    vi.spyOn(console, 'error').mockImplementation((...args) => {
      capturedLogs.push({ level: 'error', args })
    })
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should log debug messages', () => {
    logger.debug('Test debug message')
    expect(console.debug).toHaveBeenCalled()
  })

  it('should log info messages', () => {
    logger.info('Test info message')
    expect(console.info).toHaveBeenCalled()
  })

  it('should log warn messages', () => {
    logger.warn('Test warn message')
    expect(console.warn).toHaveBeenCalled()
  })

  it('should log error messages', () => {
    logger.error('Test error message', new Error('Test error'))
    expect(console.error).toHaveBeenCalled()
  })

  it('should include context in log messages', () => {
    logger.info('Test with context', { userId: 'test-user', action: 'test' })
    expect(console.info).toHaveBeenCalled()
    const logOutput = capturedLogs.find(l => l.level === 'info')?.args[0] as string
    expect(logOutput).toContain('test-user')
  })

  it('should redact sensitive data', () => {
    logger.info('Test with sensitive data', { 
      userId: 'test-user',
      password: 'should-be-redacted',
      apiKey: 'should-be-redacted'
    })
    
    // Get the captured log output
    const logOutput = capturedLogs.find(l => l.level === 'info')?.args[0] as string
    expect(logOutput).toContain('[REDACTED]')
    expect(logOutput).not.toContain('should-be-redacted')
    expect(logOutput).toContain('test-user') // non-sensitive data should remain
  })
})
