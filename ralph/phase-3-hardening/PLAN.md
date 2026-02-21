# Phase 3: Security Hardening

These are HIGH and MEDIUM severity issues that strengthen the security posture. Less urgent than phases 1-2 but important for production readiness.

## Task 3.1: Fix encryption key derivation (hardcoded salt)

**Risk:** HIGH
**File:** `src/lib/encryption.ts` (line 14)

The scrypt KDF uses a hardcoded literal string `'salt'`, defeating the purpose of salting.

**Actions:**
- Change the key derivation to use ENCRYPTION_KEY directly as a base64-decoded 32-byte key (since the CLAUDE.md already instructs generating a 32-byte random key)
- Add validation that the decoded key is exactly 32 bytes
- Remove the scrypt call entirely since the env var is already a proper random key
- The random salt per-record (line 22) is correct and should stay

## Task 3.2: Reduce session duration

**Risk:** HIGH
**File:** `src/lib/auth.ts` (line 11)

30-day JWT sessions are too long for a financial application.

**Actions:**
- Change `maxAge: 30 * 24 * 60 * 60` to `maxAge: 24 * 60 * 60` (1 day)
- This is a single line change

## Task 3.3: Tighten Content Security Policy

**Risk:** HIGH
**File:** `next.config.ts` (lines 36-37)

CSP allows `'unsafe-eval'` and `'unsafe-inline'` which effectively disables XSS protection.

**Actions:**
- Remove `'unsafe-eval'` from script-src
- Keep `'unsafe-inline'` for now (Next.js requires it for inline styles unless using nonce-based approach)
- Updated CSP: `"script-src 'self' 'unsafe-inline'"` (remove unsafe-eval only, as Next.js dev mode needs inline)
- Add `'unsafe-eval'` only in development via environment check if needed

## Task 3.4: Add input validation to API routes

**Risk:** HIGH
**Files:** All API routes that accept request bodies

Zod schemas exist in `src/schemas/` but no API route validates request bodies against them.

**Actions:**
- In PUT/POST handlers, validate `body` against the appropriate Zod schema before passing to service
- `src/app/api/applications/[id]/route.ts` PUT — validate with application schema
- `src/app/api/activities/[id]/route.ts` PUT — validate with activity fields
- `src/app/api/time-allocations/[id]/route.ts` PUT — validate with time-allocation schema
- `src/app/api/projects/[id]/route.ts` PUT — validate with project schema
- `src/app/api/projects/[id]/activities/route.ts` POST — validate with activity schema
- `src/app/api/expenditures/[id]/route.ts` PUT — validate with expenditure schema
- `src/app/api/staff/[id]/route.ts` PUT — validate with staff schema
- Return 400 with validation error messages on failure

## Task 3.5: Add HSTS preload and additional security headers

**Risk:** LOW
**File:** `next.config.ts`

**Actions:**
- Add `preload` to HSTS: `'max-age=31536000; includeSubDomains; preload'`
- Add `Cross-Origin-Opener-Policy: same-origin`
- Add `Cross-Origin-Resource-Policy: same-origin`

## Task 3.6: Add password strength validation

**Risk:** MEDIUM
**File:** `src/schemas/` (create new or add to existing)

No password strength requirements exist anywhere.

**Actions:**
- Create a password validation function in `src/lib/auth.ts`
- Minimum 10 characters, require uppercase, lowercase, and number
- Apply to the registration/password-change flow if one exists
- Apply in `src/scripts/seed-admin.ts` for production guard

## Verification

After completing Phase 3:
- Encryption uses proper key derivation
- Sessions expire after 24 hours
- CSP blocks eval-based XSS
- All API mutations validate input against Zod schemas
- Security headers are comprehensive
- Password strength is enforced
