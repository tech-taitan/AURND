import { NextRequest, NextResponse } from 'next/server'
import { staffService } from '@/services/staff.service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit, rateLimitConfigs } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { getClientOrgId } from '@/lib/auth-utils'

// GET /api/staff?clientId=... - List staff by client
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

    const staff = await staffService.listByClient(clientId)
    return NextResponse.json({ data: staff })
  } catch (error) {
    logger.error('Error fetching staff', error, { userId: session.user.id })
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
  }
}

// POST /api/staff - Create staff member
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

    const result = await staffService.create(clientId, data, session.user.id)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data }, { status: 201 })
  } catch (error) {
    logger.error('Error creating staff', error, { userId: session.user.id })
    return NextResponse.json({ error: 'Failed to create staff' }, { status: 500 })
  }
}
