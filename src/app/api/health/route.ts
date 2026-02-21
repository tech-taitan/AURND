import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  version: string
  checks: {
    database: {
      status: 'ok' | 'error'
      latency?: number
      error?: string
    }
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<HealthStatus>> {
  const startTime = Date.now()
  const status: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    checks: {
      database: { status: 'ok' },
    },
  }

  // Check database connectivity
  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    status.checks.database.latency = Date.now() - dbStart
  } catch (error) {
    status.status = 'unhealthy'
    status.checks.database = {
      status: 'error',
      error: 'Database connection failed',
    }
    logger.error('Health check: Database connection failed', error)
  }

  const httpStatus = status.status === 'healthy' ? 200 : 503

  return NextResponse.json(status, { status: httpStatus })
}
