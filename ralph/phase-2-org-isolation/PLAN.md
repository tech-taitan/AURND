# Phase 2: Organisation Isolation & IDOR Prevention

All authenticated routes currently allow cross-organisation data access. A user from Org A can access Org B's data by passing arbitrary IDs. This phase enforces organisationId verification everywhere.

## Task 2.1: Create organisation verification utility

**Risk:** CRITICAL
**File to create:** `src/lib/auth-utils.ts`

Create a shared helper function that API routes can use to verify a resource belongs to the user's organisation. This centralizes the pattern seen in `src/app/api/clients/[id]/route.ts`.

**Actions:**
- Create `verifyResourceOrg(session, resourceOrgId)` helper that returns a 404 response if org doesn't match
- Create `getClientOrgId(clientId)` helper that looks up a client's organisationId
- Create `getResourceOrgId(entityType, entityId)` generic helper that resolves organisationId for any resource by traversing relations (activity -> project -> client -> org, etc.)

## Task 2.2: Add org verification to list endpoints

**Risk:** CRITICAL
**Files:**
- `src/app/api/applications/route.ts` — GET accepts any clientId, no org check
- `src/app/api/expenditures/route.ts` — GET accepts any applicationId/clientId, no org check
- `src/app/api/time-allocations/route.ts` — GET accepts any staffMemberId/activityId, no org check
- `src/app/api/projects/route.ts` — GET with clientId has no org check
- `src/app/api/staff/route.ts` — GET with clientId has no org check

**Actions per file:**
- Require `session.user.organisationId` (not just `session.user`)
- Before querying by clientId: verify `client.organisationId === session.user.organisationId`
- Before querying by applicationId: verify through `application -> client -> organisationId`
- Before querying by staffMemberId/activityId: verify through relation chain to organisationId

## Task 2.3: Add org verification to detail/mutation endpoints

**Risk:** CRITICAL
**Files:**
- `src/app/api/applications/[id]/route.ts` — GET, PUT, DELETE
- `src/app/api/activities/[id]/route.ts` — GET, PUT, DELETE
- `src/app/api/time-allocations/[id]/route.ts` — GET, PUT, DELETE
- `src/app/api/projects/[id]/route.ts` — GET, PUT, DELETE (has auth but no org check)
- `src/app/api/projects/[id]/activities/route.ts` — GET, POST
- `src/app/api/expenditures/[id]/route.ts` — GET, PUT, DELETE (has auth but no org check)
- `src/app/api/staff/[id]/route.ts` — GET, PUT, DELETE (has auth but no org check)

**Pattern to follow** (from `src/app/api/clients/[id]/route.ts`):
```typescript
const session = await getServerSession(authOptions)
if (!session?.user?.organisationId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
// ... fetch resource ...
// verify resource.client.organisationId === session.user.organisationId
// return 404 if mismatch (don't reveal existence)
```

## Task 2.4: Add org verification to application sub-routes

**Risk:** HIGH
**Files:**
- `src/app/api/applications/[id]/compliance/route.ts` — has auth but no org check
- `src/app/api/applications/[id]/submission/route.ts` — has auth but no org check
- `src/app/api/applications/[id]/comparison/route.ts`
- `src/app/api/applications/[id]/outcome/route.ts`
- `src/app/api/applications/[id]/draft/route.ts`
- `src/app/api/applications/[id]/calculate/route.ts`
- `src/app/api/applications/[id]/documents/activity-description/route.ts`
- `src/app/api/applications/[id]/documents/full-pack/route.ts`

**Actions per file:**
- Require `session.user.organisationId`
- Before processing: fetch the application, verify `application.client.organisationId === session.user.organisationId`
- Return 404 if mismatch

## Task 2.5: Fix dashboard audit log org leak

**Risk:** HIGH
**File:** `src/services/dashboard.service.ts` (line ~135-150)

The `getRecentActivity()` method fetches audit logs by date only, without filtering by organisationId. Users see logs from ALL organisations.

**Actions:**
- Add userId-based filtering to the audit log query
- Filter audit logs by userId matching users in the same organisation
- Or add organisationId to AuditLog creation in base.service.ts and filter by it

## Task 2.6: Add org verification to server actions

**Risk:** HIGH
**Files:**
- `src/actions/projects.ts` — `getProject()` has no auth check
- `src/actions/activities.ts` — `getActivity()` has no auth check
- `src/actions/expenditures.ts` — `getExpenditure()` has no auth check
- `src/actions/staff.ts` — `getStaff()` has no auth check
- `src/actions/time-allocations.ts` — read actions have no auth check
- `src/actions/applications.ts` — `createApplication()` doesn't verify clientId ownership

**Actions per file:**
- Add `await requireOrganisation()` to all read/write actions
- Verify resource ownership before returning data
- Follow pattern from `src/actions/clients.ts`

## Verification

After completing Phase 2:
- No endpoint should return data from a different organisation
- All list endpoints verify the parent entity belongs to user's org
- All detail endpoints verify the resource's org chain
- Dashboard audit logs are org-scoped
- Server actions verify org ownership
