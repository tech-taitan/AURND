import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { activityService } from '@/services/activity.service'
import { checkRateLimit, rateLimitConfigs } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { getProjectOrgId } from '@/lib/auth-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/projects/[id]/activities - List activities for a project
export async function GET(request: NextRequest, { params }: RouteParams) {
  const rateLimitResult = checkRateLimit(request, rateLimitConfigs.api)
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: projectId } = await params
    const orgId = await getProjectOrgId(projectId)
    if (!orgId || orgId !== session.user.organisationId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    const { searchParams } = new URL(request.url)
    const coreOnly = searchParams.get('coreOnly') === 'true'

    const activities = coreOnly
      ? await activityService.getCoreActivities(projectId)
      : await activityService.listByProject(projectId)

    return NextResponse.json({ data: activities })
  } catch (error) {
    logger.error('Error fetching activities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}

// POST /api/projects/[id]/activities - Create a new activity
export async function POST(request: NextRequest, { params }: RouteParams) {
  const rateLimitResult = checkRateLimit(request, rateLimitConfigs.api)
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: projectId } = await params
    const orgId = await getProjectOrgId(projectId)
    if (!orgId || orgId !== session.user.organisationId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    const body = await request.json()

    const result = await activityService.create(projectId, body)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data }, { status: 201 })
  } catch (error) {
    logger.error('Error creating activity:', error)
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    )
  }
}
