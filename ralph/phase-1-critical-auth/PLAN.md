# Phase 1: Critical Authentication & Secrets (BLOCKERS)

These issues must be fixed before any public deployment. They represent unauthenticated access to sensitive data and exposed secrets.

## Task 1.1: Remove .env from repository and rotate secrets

**Risk:** CRITICAL
**File:** `.env`

The `.env` file contains real secrets (NEXTAUTH_SECRET, ENCRYPTION_KEY, GOOGLE_AI_API_KEY). Create `.env.example` with placeholder values and ensure `.env` is gitignored (already is, but the file exists on disk).

**Actions:**
- Create `.env.example` with placeholder values (no real secrets)
- Verify `.gitignore` covers `.env*`
- Warn user to rotate all secrets before deployment

## Task 1.2: Create auth middleware for API route protection

**Risk:** CRITICAL
**File to create:** `src/middleware.ts`

No centralized route protection exists. Each API route must manually check auth, causing gaps. Create a Next.js middleware that enforces authentication on all `/api/*` routes except public ones.

**Actions:**
- Create `src/middleware.ts` with session verification
- Protect all `/api/*` routes by default
- Whitelist: `/api/auth/*`, `/api/health`
- Return 401 for unauthenticated requests

## Task 1.3: Add authentication to all unprotected API routes

**Risk:** CRITICAL
**Files:**
- `src/app/api/applications/[id]/route.ts` — GET, PUT, DELETE have ZERO auth
- `src/app/api/activities/[id]/route.ts` — GET, PUT, DELETE have ZERO auth
- `src/app/api/time-allocations/[id]/route.ts` — GET, PUT, DELETE have ZERO auth
- `src/app/api/projects/[id]/activities/route.ts` — GET, POST have ZERO auth

**Actions per file:**
- Add `import { getServerSession } from 'next-auth'` and `import { authOptions } from '@/lib/auth'`
- Add `import { logger } from '@/lib/logger'`
- Add session check at top of each handler: `const session = await getServerSession(authOptions); if (!session?.user) return 401`
- Replace all `console.error` with `logger.error`

## Task 1.4: Add rate limiting to unprotected routes

**Risk:** HIGH
**Files:**
- `src/app/api/applications/[id]/route.ts`
- `src/app/api/activities/[id]/route.ts`
- `src/app/api/time-allocations/[id]/route.ts`
- `src/app/api/projects/[id]/activities/route.ts`
- `src/app/api/applications/route.ts`

**Actions per file:**
- Add `import { checkRateLimit, rateLimitConfigs } from '@/lib/rate-limit'`
- Add rate limit check at top of each handler before auth

## Task 1.5: Replace all console.error with structured logger

**Risk:** HIGH
**Files with console.error:**
- `src/app/api/activities/[id]/route.ts`
- `src/app/api/time-allocations/[id]/route.ts`
- `src/app/api/applications/[id]/route.ts`
- `src/app/api/projects/[id]/activities/route.ts`

**Actions:**
- Replace `console.error(...)` with `logger.error(...)` in all API routes
- Ensure logger import is present

## Verification

After completing Phase 1:
- No API route should be accessible without authentication (except /api/auth/*, /api/health)
- All routes should have rate limiting
- No `console.error` calls in API routes
- `.env.example` exists with safe placeholder values
