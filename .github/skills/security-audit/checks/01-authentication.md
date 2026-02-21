# Authentication & Session Management - Deep Checks

> Level 3 deep checks for security audit category 1.

## 1.1.a Credential Storage Verification

```bash
# Detect plaintext password storage
grep -rn "password.*=.*['\"]" --include="*.ts" --include="*.js"
grep -rn "\.password\s*==\s*" --include="*.ts" --include="*.js"
# Verify bcrypt cost factor (should be >= 12)
grep -rn "bcrypt\|argon2" --include="*.ts" -A 3
```

**Severity Classification:**
| Finding | Severity |
|---------|----------|
| Plaintext password comparison or storage | P0 |
| Bcrypt cost factor < 10 | P1 |
| Using MD5/SHA1 for passwords (without salt/iteration) | P2 |

---

## 1.2.a Session Token Security

| Attack Vector | Detection Pattern | Severity |
|---------------|-------------------|----------|
| Predictable tokens | `Math.random()`, `Date.now()` in token generation | P0 |
| Missing HttpOnly | `httpOnly: false` or cookie without flag | P1 |
| Long session lifetime | Expiry > 24h without refresh mechanism | P2 |
| Session fixation | No token rotation after login | P1 |

---

## 1.3.a JWT Vulnerability Checks

```javascript
// VULNERABLE: alg:none bypass - verify library rejects this
jwt.verify(token, secret, { algorithms: ['HS256'] }) // ✓ Secure
jwt.verify(token, secret) // ✗ May accept alg:none

// VULNERABLE: Weak secret detection
grep -rn "jwt.*secret.*['\"]" --include="*.ts" | grep -v "process.env"
```

**Severity Classification:**
| Finding | Severity |
|---------|----------|
| JWT secret < 32 characters or hardcoded | P0 |
| No algorithm restriction in verify() | P0 |
| Missing expiry claim validation | P1 |
| No refresh token rotation | P2 |

---

## 1.4.a Password Policy Verification

```typescript
// Secure implementation reference
const passwordSchema = z.string()
  .min(12, "Minimum 12 characters")
  .regex(/[A-Z]/, "Requires uppercase")
  .regex(/[a-z]/, "Requires lowercase")
  .regex(/[0-9]/, "Requires number")
  .regex(/[^A-Za-z0-9]/, "Requires special character");

// Check for haveibeenpwned integration
grep -rn "pwnedpasswords\|hibp\|haveibeenpwned" --include="*.ts"
```

---

## 1.5.a MFA Implementation Audit

- [ ] TOTP secret stored encrypted (not plaintext)
- [ ] Backup codes are single-use and hashed
- [ ] Rate limiting on MFA verification (max 5 attempts)
- [ ] MFA bypass not possible via password reset
- [ ] Recovery codes invalidated after MFA re-enrollment

---

## 1.6.a Account Recovery Attack Vectors

| Attack | Check | Remediation |
|--------|-------|-------------|
| User enumeration | Different response for valid/invalid email | Generic "If account exists..." message |
| Token brute force | Reset token < 32 bytes | Use `crypto.randomBytes(32)` |
| Token reuse | Token valid after use | Invalidate on first use |
| Timing attack | Response time differs | Constant-time comparison |

---

## Supabase-Specific Checks

```typescript
// Verify Supabase Auth configuration
// Check: supabase/config.toml or Dashboard settings
```

**Configuration Checklist:**
- [ ] Email confirmation required: `auth.email.enable_confirmations = true`
- [ ] Password minimum length: `auth.password_min_length >= 12`
- [ ] JWT expiry reasonable: `auth.jwt_expiry <= 3600`
- [ ] Refresh token rotation enabled

---

## Next.js-Specific Authentication Checks

### Next.js 13+ App Router API Routes

```bash
# Find all API route handlers
find . -path "*/app/api/**/route.ts" -o -path "*/app/api/**/route.js"

# Check for missing authentication in route handlers
grep -rn "export async function GET\|export async function POST\|export async function PUT\|export async function DELETE" --include="route.ts" -A 5 | grep -L "getServerSession\|auth()"

# Find routes without authentication checks
for file in $(find . -path "*/app/api/**/route.ts"); do
  if ! grep -q "getServerSession\|auth()" "$file"; then
    echo "Missing auth: $file"
  fi
done
```

### Authentication Patterns

| Pattern | Security | Notes |
|---------|----------|-------|
| `getServerSession(authOptions)` at start | ✓ Secure | NextAuth.js recommended pattern |
| `auth()` from `@auth/core` | ✓ Secure | Auth.js v5+ pattern |
| No session check in route | ✗ Vulnerable | Unauthenticated access allowed |
| Session check after business logic | ✗ Vulnerable | Logic executed before auth |

```typescript
// VULNERABLE: No authentication check
// File: app/api/applications/route.ts
export async function GET(request: NextRequest) {
  const data = await applicationService.listAll();  // ✗ No auth check
  return NextResponse.json({ data });
}

// VULNERABLE: Authentication check too late
export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await processData(body);  // ✗ Processing before auth

  const session = await getServerSession(authOptions);  // Too late
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(result);
}

// SECURE: Authentication check at the start
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Now safe to proceed with authenticated logic
  const data = await applicationService.listForUser(session.user.id);
  return NextResponse.json({ data });
}

// SECURE: With organization verification
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organisationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const client = await clientService.findById(id);

  // Verify ownership
  if (client.organisationId !== session.user.organisationId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Process update
  const body = await request.json();
  const result = await clientService.update(id, body);
  return NextResponse.json(result);
}
```

### Next.js Auth Detection Commands

```bash
# Find authOptions export location
grep -rn "export.*authOptions" --include="*.ts"

# Check if all protected routes use the same authOptions
grep -rn "getServerSession" --include="route.ts" | grep -v "authOptions"

# Find middleware authentication
cat middleware.ts 2>/dev/null | grep -E "auth\(|NextAuth|getToken"
```

### Next.js Auth Severity Matrix

| Issue | Severity | Impact |
|-------|----------|--------|
| API route without authentication | P0-Critical | Unauthenticated data access |
| Missing organization verification | P0-Critical | Cross-tenant data leakage |
| Auth check after processing | P1-High | Partial execution before auth |
| Inconsistent authOptions import | P2-Medium | Configuration drift |

---

## Secure Implementation Examples

### Password Hashing
```typescript
import bcrypt from 'bcrypt';

const COST_FACTOR = 12; // Minimum recommended

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST_FACTOR);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

### Secure Session Token
```typescript
import crypto from 'crypto';

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex'); // 256 bits of entropy
}
```

### JWT with Algorithm Restriction
```typescript
import jwt from 'jsonwebtoken';

const TOKEN_OPTIONS = {
  algorithm: 'HS256' as const,
  expiresIn: '1h',
};

function verifyToken(token: string, secret: string) {
  return jwt.verify(token, secret, { 
    algorithms: ['HS256'], // Explicitly restrict algorithms
  });
}
```
