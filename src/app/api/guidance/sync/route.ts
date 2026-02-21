import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { guidanceService, GuidanceSyncPayload } from '@/services/guidance.service'
import { logger } from '@/lib/logger'

// POST /api/guidance/sync
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = (await request.json()) as GuidanceSyncPayload
    const result = await guidanceService.sync(payload)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: { synced: result.data } })
  } catch (error) {
    logger.error('Error syncing guidance:', error)
    return NextResponse.json({ error: 'Failed to sync guidance' }, { status: 500 })
  }
}
