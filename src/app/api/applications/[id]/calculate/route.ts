import { NextRequest, NextResponse } from 'next/server'
import { applicationService } from '@/services/application.service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getApplicationOrgId } from '@/lib/auth-utils'
import { checkRateLimit, rateLimitConfigs } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

type RouteParams = { params: Promise<{ id: string }> }

// POST /api/applications/[id]/calculate
export async function POST(request: NextRequest, { params }: RouteParams) {
  // Rate limiting
  const rateLimitResult = checkRateLimit(request, rateLimitConfigs.api)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': rateLimitResult.reset.toString() } }
    )
  }

  // Authentication
  const session = await getServerSession(authOptions)
  if (!session?.user?.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    const orgId = await getApplicationOrgId(id)
    if (!orgId || orgId !== session.user.organisationId) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const result = await applicationService.calculateAndUpdate(id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    logger.error('Error calculating application:', error)
    return NextResponse.json({ error: 'Failed to calculate application' }, { status: 500 })
  }
}
