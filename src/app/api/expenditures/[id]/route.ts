import { NextRequest, NextResponse } from 'next/server'
import { expenditureService } from '@/services/expenditure.service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit, rateLimitConfigs } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { getExpenditureOrgId } from '@/lib/auth-utils'
import { expenditureBaseSchema } from '@/schemas/expenditure.schema'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/expenditures/[id]
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
    const orgId = await getExpenditureOrgId(id)
    if (!orgId || orgId !== session.user.organisationId) {
      return NextResponse.json({ error: 'Expenditure not found' }, { status: 404 })
    }
    const expenditure = await expenditureService.findById(id)

    if (!expenditure) {
      return NextResponse.json({ error: 'Expenditure not found' }, { status: 404 })
    }

    return NextResponse.json({ data: expenditure })
  } catch (error) {
    logger.error('Error fetching expenditure', error, { userId: session.user.id })
    return NextResponse.json({ error: 'Failed to fetch expenditure' }, { status: 500 })
  }
}

// PUT /api/expenditures/[id]
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
    const orgId = await getExpenditureOrgId(id)
    if (!orgId || orgId !== session.user.organisationId) {
      return NextResponse.json({ error: 'Expenditure not found' }, { status: 404 })
    }
    const body = await request.json()
    const parsed = expenditureBaseSchema.partial().safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const result = await expenditureService.update(id, parsed.data, session.user.id)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    logger.error('Error updating expenditure', error, { userId: session.user.id })
    return NextResponse.json({ error: 'Failed to update expenditure' }, { status: 500 })
  }
}

// DELETE /api/expenditures/[id]
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
    const orgId = await getExpenditureOrgId(id)
    if (!orgId || orgId !== session.user.organisationId) {
      return NextResponse.json({ error: 'Expenditure not found' }, { status: 404 })
    }
    const result = await expenditureService.delete(id, session.user.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error deleting expenditure', error, { userId: session.user.id })
    return NextResponse.json({ error: 'Failed to delete expenditure' }, { status: 500 })
  }
}
