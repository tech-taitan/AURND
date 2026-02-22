type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  userId?: string
  organisationId?: string
  requestId?: string
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
  }
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

function getMinLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel
  if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
    return envLevel
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug'
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[getMinLogLevel()]
}

function formatLog(entry: LogEntry): string {
  if (process.env.NODE_ENV === 'production') {
    // Structured JSON logging for production
    return JSON.stringify(entry)
  }
  
  // Human-readable format for development
  const { timestamp, level, message, context, error } = entry
  let output = `[${timestamp}] ${level.toUpperCase()}: ${message}`
  
  if (context && Object.keys(context).length > 0) {
    output += ` ${JSON.stringify(context)}`
  }
  
  if (error) {
    output += `\n  Error: ${error.name}: ${error.message}`
    if (error.stack) {
      output += `\n  Stack: ${error.stack}`
    }
  }
  
  return output
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  }

  if (context) {
    // Remove sensitive data from context
    const sanitized = { ...context }
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'tfn', 'apiKey']
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]'
      }
    }
    entry.context = sanitized
  }

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      // Only include stack in non-production
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    }
  }

  return entry
}

function log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
  if (!shouldLog(level)) return

  const entry = createLogEntry(level, message, context, error)
  const formatted = formatLog(entry)

  switch (level) {
    case 'debug':
      console.debug(formatted)
      break
    case 'info':
      console.info(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    case 'error':
      console.error(formatted)
      break
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, error?: Error | unknown, context?: LogContext) => {
    const err = error instanceof Error ? error : new Error(String(error))
    log('error', message, context, err)
  },
}

export default logger
