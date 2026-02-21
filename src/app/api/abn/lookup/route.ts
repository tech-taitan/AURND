import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit, rateLimitConfigs } from '@/lib/rate-limit'
import { lookupAbn } from '@/services/abn-lookup.service'

// GET /api/abn/lookup?abn=XXXXXXXXXXX
export async function GET(request: NextRequest) {
  const rateLimitResult = checkRateLimit(request, rateLimitConfigs.api)
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const abn = request.nextUrl.searchParams.get('abn')
  if (!abn) {
    return NextResponse.json({ error: 'ABN is required' }, { status: 400 })
  }

  try {
    const data = await lookupAbn(abn)
    return NextResponse.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to lookup ABN'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
