import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit, rateLimitConfigs } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { getReviewOrchestratorService } from '@/services/ai/review-orchestrator.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface AiReviewRequestBody {
  activityId?: string
}

// POST /api/projects/[id]/ai-review - Generate AI review for a project/activity
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

  // Check if AI features are configured
  if (!process.env.GOOGLE_AI_API_KEY) {
    return NextResponse.json(
      { error: 'AI features are not configured. Please add GOOGLE_AI_API_KEY to your environment.' },
      { status: 503 }
    )
  }

  try {
    const { id: projectId } = await params
    const body: AiReviewRequestBody = await request.json().catch(() => ({}))

    logger.info('Starting AI review', {
      projectId,
      activityId: body.activityId,
      userId: session.user.id,
    })

    const orchestrator = getReviewOrchestratorService()

    // Set up timeout
    const timeoutMs = 30000 // 30 seconds
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI review timed out')), timeoutMs)
    )

    // Run review with timeout
    const result = await Promise.race([
      orchestrator.review({
        projectId,
        activityId: body.activityId,
        organisationId,
      }),
      timeoutPromise,
    ])

    logger.info('AI review completed', {
      projectId,
      activityId: body.activityId,
      userId: session.user.id,
      processingTimeMs: result.metadata.processingTimeMs,
      featuresProcessed: result.metadata.featuresProcessed,
    })

    return NextResponse.json({ data: result })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'AI review failed'

    // Check if it's a timeout
    if (errorMessage.includes('timed out')) {
      logger.warn('AI review timed out', {
        userId: session.user.id,
      })
      return NextResponse.json(
        { error: 'AI review timed out. Please try again.' },
        { status: 504 }
      )
    }

    // Check if it's a not found error
    if (errorMessage.includes('not found') || errorMessage.includes('access denied')) {
      return NextResponse.json({ error: errorMessage }, { status: 404 })
    }

    logger.error('AI review failed', error, { userId: session.user.id })
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
