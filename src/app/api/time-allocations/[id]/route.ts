import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { timeAllocationService } from '@/services/time-allocation.service'
import { checkRateLimit, rateLimitConfigs } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { getTimeAllocationOrgId } from '@/lib/auth-utils'
import { timeAllocationBaseSchema } from '@/schemas/time-allocation.schema'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/time-allocations/[id]
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
    const { id } = await params
    const orgId = await getTimeAllocationOrgId(id)
    if (!orgId || orgId !== session.user.organisationId) {
      return NextResponse.json({ error: 'Time allocation not found' }, { status: 404 })
    }
    const allocation = await timeAllocationService.findById(id)

    if (!allocation) {
      return NextResponse.json({ error: 'Time allocation not found' }, { status: 404 })
    }

    return NextResponse.json({ data: allocation })
  } catch (error) {
    logger.error('Error fetching time allocation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch time allocation' },
      { status: 500 }
    )
  }
}

// PUT /api/time-allocations/[id]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const rateLimitResult = checkRateLimit(request, rateLimitConfigs.api)
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const orgId = await getTimeAllocationOrgId(id)
    if (!orgId || orgId !== session.user.organisationId) {
      return NextResponse.json({ error: 'Time allocation not found' }, { status: 404 })
    }
    const body = await request.json()
    const parsed = timeAllocationBaseSchema.partial().safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const result = await timeAllocationService.update(id, parsed.data)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    logger.error('Error updating time allocation:', error)
    return NextResponse.json(
      { error: 'Failed to update time allocation' },
      { status: 500 }
    )
  }
}

// DELETE /api/time-allocations/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const rateLimitResult = checkRateLimit(request, rateLimitConfigs.api)
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const orgId = await getTimeAllocationOrgId(id)
    if (!orgId || orgId !== session.user.organisationId) {
      return NextResponse.json({ error: 'Time allocation not found' }, { status: 404 })
    }
    const result = await timeAllocationService.delete(id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error deleting time allocation:', error)
    return NextResponse.json(
      { error: 'Failed to delete time allocation' },
      { status: 500 }
    )
  }
}
