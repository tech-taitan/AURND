import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { expenditureService } from '@/services/expenditure.service'
import { logger } from '@/lib/logger'
import { getClientOrgId, getApplicationOrgId } from '@/lib/auth-utils'

// GET /api/expenditures?applicationId=...&clientId=...
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const applicationId = searchParams.get('applicationId')
    const clientId = searchParams.get('clientId')

    if (!applicationId && !clientId) {
      return NextResponse.json(
        { error: 'applicationId or clientId is required' },
        { status: 400 }
      )
    }

    if (applicationId) {
      const appOrgId = await getApplicationOrgId(applicationId)
      if (!appOrgId || appOrgId !== session.user.organisationId) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 })
      }
      const data = await expenditureService.listByApplication(applicationId)
      return NextResponse.json({ data })
    }

    if (clientId) {
      const clientOrgId = await getClientOrgId(clientId)
      if (!clientOrgId || clientOrgId !== session.user.organisationId) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
      const data = await expenditureService.listByClient(clientId)
      return NextResponse.json({ data })
    }

    return NextResponse.json({ data: [] })
  } catch (error) {
    logger.error('Error fetching expenditures:', error)
    return NextResponse.json({ error: 'Failed to fetch expenditures' }, { status: 500 })
  }
}

// POST /api/expenditures
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { applicationId, ...data } = body

    if (!applicationId) {
      return NextResponse.json(
        { error: 'applicationId is required' },
        { status: 400 }
      )
    }

    const appOrgId = await getApplicationOrgId(applicationId)
    if (!appOrgId || appOrgId !== session.user.organisationId) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const result = await expenditureService.create(applicationId, data)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data }, { status: 201 })
  } catch (error) {
    logger.error('Error creating expenditure:', error)
    return NextResponse.json({ error: 'Failed to create expenditure' }, { status: 500 })
  }
}
