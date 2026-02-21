import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { complianceService } from '@/services/compliance.service'
import { getApplicationOrgId } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

type RouteParams = { params: Promise<{ id: string }> }

// POST /api/applications/[id]/compliance
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const data = await complianceService.run(id)
    return NextResponse.json({ data })
  } catch (error) {
    logger.error('Error running compliance checks:', error)
    return NextResponse.json({ error: 'Failed to run compliance checks' }, { status: 500 })
  }
}
