import { NextRequest, NextResponse } from 'next/server'
import { projectService } from '@/services/project.service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit, rateLimitConfigs } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { getClientOrgId } from '@/lib/auth-utils'

// GET /api/projects - List all projects (with optional filtering)
export async function GET(request: NextRequest) {
  const rateLimitResult = checkRateLimit(request, rateLimitConfigs.api)
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (clientId) {
      const clientOrgId = await getClientOrgId(clientId)
      if (!clientOrgId || clientOrgId !== session.user.organisationId) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
      const projects = await projectService.listByClient(clientId)
      return NextResponse.json({ data: projects })
    }

    const result = await projectService.listAll(session.user.organisationId)
    return NextResponse.json(result)
  } catch (error) {
    logger.error('Error fetching projects', error, { userId: session.user.id })
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  const rateLimitResult = checkRateLimit(request, rateLimitConfigs.api)
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { clientId, ...data } = body

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      )
    }

    const clientOrgId = await getClientOrgId(clientId)
    if (!clientOrgId || clientOrgId !== session.user.organisationId) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const result = await projectService.create(clientId, data, session.user.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data }, { status: 201 })
  } catch (error) {
    logger.error('Error creating project', error, { userId: session.user.id })
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
