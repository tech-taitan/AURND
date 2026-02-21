import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { comparisonService } from '@/services/comparison.service'
import { getApplicationOrgId } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/applications/[id]/comparison
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const data = await comparisonService.compare(id)
    return NextResponse.json({ data })
  } catch (error) {
    logger.error('Error generating comparison:', error)
    return NextResponse.json({ error: 'Failed to generate comparison' }, { status: 500 })
  }
}
