import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { documentService } from '@/services/document.service'
import { getApplicationOrgId } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

type RouteParams = { params: Promise<{ id: string }> }

// POST /api/applications/[id]/documents/full-pack
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

    const body = await request.json().catch(() => null)
    const result = await documentService.generateFullPack(id, body?.draft)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data }, { status: 201 })
  } catch (error) {
    logger.error('Error generating full document pack:', error)
    return NextResponse.json(
      { error: 'Failed to generate document pack' },
      { status: 500 }
    )
  }
}
