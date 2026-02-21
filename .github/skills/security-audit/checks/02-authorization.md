# Authorization & Access Control - Deep Checks

> Level 3 deep checks for security audit category 2.

## 2.1.a Role Definition Audit

```typescript
// VULNERABLE: Role check by string comparison
if (user.role === 'admin') // ✗ Magic strings

// SECURE: Enum-based roles with TypeScript
enum Role { USER = 'user', ADMIN = 'admin', MODERATOR = 'mod' }
if (user.role === Role.ADMIN) // ✓ Type-safe
```

**Severity Classification:**
| Finding | Severity |
|---------|----------|
| Roles defined as magic strings without enum/const | P1 |
| No role hierarchy (admin should inherit user permissions) | P2 |
| Missing role validation on assignment | P2 |

---

## 2.2.a IDOR (Insecure Direct Object Reference) Detection

```bash
# Find endpoints accessing resources by ID without ownership check
grep -rn "params\.id\|params\.userId\|req\.params" --include="*.ts" -A 5 | grep -v "user\.id\|session\|auth"
```

| Vulnerable Pattern | Secure Pattern |
|-------------------|----------------|
| `getPost(params.id)` | `getPost(params.id, user.id)` |
| `DELETE /api/posts/:id` | Check `post.authorId === user.id` |
| `UPDATE /api/users/:id` | Check `id === session.user.id` |

### IDOR Test Cases

```
1. Access resource with another user's ID → Should return 403/404
2. Increment/decrement IDs sequentially → Should not leak data
3. Use UUID from different tenant → Should be blocked
4. Access soft-deleted resources → Should return 404
```

---

## 2.3.a API Authorization Patterns

```typescript
// VULNERABLE: No auth check
app.get('/api/admin/users', getUsers);

// SECURE: Middleware chain
app.get('/api/admin/users', 
  requireAuth,           // Verify session
  requireRole('admin'),  // Check role
  validateScope('users:read'), // Check API scope
  getUsers
);
```

**Severity Classification:**
| Finding | Severity |
|---------|----------|
| Admin endpoints without authentication | P0 |
| Missing role check on sensitive endpoints | P1 |
| No scope/permission granularity | P2 |

---

## 2.4.a Supabase RLS Verification

```sql
-- Verify RLS is enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check for permissive policies (dangerous)
SELECT * FROM pg_policies 
WHERE permissive = 'PERMISSIVE' AND qual IS NULL;
```

### RLS Policy Audit Checklist

| Table | SELECT | INSERT | UPDATE | DELETE | Notes |
|-------|--------|--------|--------|--------|-------|
| users | ✓ Own only | ✓ Self | ✓ Self | ✗ Disabled | Admin via service role |
| posts | ✓ Public | ✓ Auth | ✓ Owner | ✓ Owner | Check author_id |
| comments | ✓ Public | ✓ Auth | ✓ Owner | ✓ Owner+Admin | |

```typescript
// DANGEROUS: Bypassing RLS
const { data } = await supabase
  .from('users')
  .select('*')
  .single();  // ✗ No user filter, relies entirely on RLS

// DEFENSE IN DEPTH: Explicit filter + RLS
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('id', user.id)  // ✓ Explicit ownership check
  .single();
```

---

## 2.5.a Privilege Escalation Vectors

| Attack Vector | Detection | Severity |
|---------------|-----------|----------|
| Self role assignment | `UPDATE users SET role = 'admin'` without check | P0 |
| Mass assignment | `...req.body` includes role field | P0 |
| JWT role tampering | Role in JWT payload without server verification | P0 |
| Horizontal escalation | Access other users' data via predictable IDs | P1 |
| Vertical escalation | User can access admin functions | P0 |

```bash
# Find mass assignment vulnerabilities
grep -rn "\.update(\|\.create(" --include="*.ts" -A 3 | grep "req\.body\|body\)"
# Find unprotected role updates
grep -rn "role.*=.*req\|role.*body" --include="*.ts"
```

---

## Secure Implementation Examples

### Role-Based Access Control
```typescript
enum Role {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}

const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.USER]: 1,
  [Role.MODERATOR]: 2,
  [Role.ADMIN]: 3,
};

function hasPermission(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// Middleware
function requireRole(role: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !hasPermission(req.user.role as Role, role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
```

### IDOR Prevention
```typescript
async function getResource(resourceId: string, userId: string) {
  const resource = await db.resource.findFirst({
    where: {
      id: resourceId,
      ownerId: userId, // Always include ownership check
    },
  });
  
  if (!resource) {
    throw new NotFoundError(); // Same error for not found & unauthorized
  }
  
  return resource;
}
```

### Mass Assignment Prevention
```typescript
// VULNERABLE
await db.user.update({
  where: { id: userId },
  data: req.body, // ✗ Could include role, isAdmin, etc.
});

// SECURE: Allowlist fields
const allowedFields = ['name', 'email', 'avatar'];
const safeData = Object.fromEntries(
  Object.entries(req.body).filter(([key]) => allowedFields.includes(key))
);
await db.user.update({
  where: { id: userId },
  data: safeData,
});
```
