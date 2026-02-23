import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest } from 'next/server'

const handler = NextAuth(authOptions)

// Wrap handler to gracefully handle database connection failures
// (e.g., when deployed without DATABASE_URL configured)
function withErrorHandling(fn: (req: NextRequest, ctx: { params: Promise<{ nextauth: string[] }> }) => Promise<Response>) {
  return async (req: NextRequest, ctx: { params: Promise<{ nextauth: string[] }> }) => {
    try {
      return await fn(req, ctx)
    } catch (error) {
      const url = new URL(req.url)
      const path = url.pathname

      // For session checks, return empty session instead of 500
      if (path.endsWith('/session')) {
        return Response.json({})
      }

      // For other auth endpoints, return a descriptive error
      console.error('[auth] Handler error:', error)
      return Response.json(
        { error: 'Authentication service unavailable. Please check server configuration.' },
        { status: 503 }
      )
    }
  }
}

export const GET = withErrorHandling(handler as unknown as (req: NextRequest, ctx: { params: Promise<{ nextauth: string[] }> }) => Promise<Response>)
export const POST = withErrorHandling(handler as unknown as (req: NextRequest, ctx: { params: Promise<{ nextauth: string[] }> }) => Promise<Response>)
