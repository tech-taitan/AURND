import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit, rateLimitConfigs } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { getApplicationDrafterService } from '@/services/ai/application-drafter.service'
import { getApplicationOrgId } from '@/lib/auth-utils'

type RouteParams = { params: Promise<{ id: string }> }

// POST /api/applications/[id]/draft
export async function POST(request: NextRequest, { params }: RouteParams) {
  const rateLimitResult = checkRateLimit(request, rateLimitConfigs.api)
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const organisationId = session.user.organisationId
  if (!organisationId) {
    return NextResponse.json({ error: 'No organisation associated with user' }, { status: 403 })
  }

  if (!process.env.GOOGLE_AI_API_KEY) {
    return NextResponse.json(
      { error: 'AI features are not configured. Please add GOOGLE_AI_API_KEY to your environment.' },
      { status: 503 }
    )
  }

  try {
    const { id: applicationId } = await params

    const appOrgId = await getApplicationOrgId(applicationId)
    if (!appOrgId || appOrgId !== organisationId) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    logger.info('Starting application draft', {
      applicationId,
      userId: session.user.id,
    })

    const drafter = getApplicationDrafterService()

    const timeoutMs = 60000
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Application draft timed out')), timeoutMs)
    )

    const draft = await Promise.race([
      drafter.draft(applicationId, organisationId),
      timeoutPromise,
    ])

    logger.info('Application draft completed', {
      applicationId,
      userId: session.user.id,
    })

    return NextResponse.json({ data: draft })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to draft application'

    if (message.includes('timed out')) {
      return NextResponse.json(
        { error: 'Application draft timed out. Please try again.' },
        { status: 504 }
      )
    }

    if (message.includes('not found') || message.includes('access denied')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    logger.error('Application draft failed', error, { userId: session.user.id })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
