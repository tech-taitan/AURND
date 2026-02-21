# API Security - Deep Checks

> Level 3 deep checks for security audit category 4.

## 4.1.a Rate Limiting Verification

```bash
# Find rate limiting implementation
grep -rn "rateLimit\|rateLimiter\|throttle\|slowDown" --include="*.ts"
# Check for missing rate limiting on sensitive endpoints
grep -rn "login\|signin\|signup\|reset-password\|verify\|otp" --include="*.ts" -l

# CRITICAL: Check if rate limiting is applied BEFORE authentication
# This is a bypass vulnerability - attacker can rotate IPs to evade rate limits
grep -rn "rateLimit.*function\|checkRateLimit\|applyRateLimit" --include="*.ts" -A 10 | grep -B 5 "getServerSession\|auth\|session"
```

| Endpoint Type | Recommended Limit | Severity if Missing |
|---------------|-------------------|---------------------|
| Login/Auth | 5 req/min per IP | P0 |
| Password Reset | 3 req/hour per email | P0 |
| API (authenticated) | 100 req/min per user | P2 |
| API (public) | 20 req/min per IP | P1 |
| File Upload | 10 req/hour per user | P1 |
| Webhook endpoints | 60 req/min per source | P2 |

### Rate Limiting Order Vulnerability

| Issue | Severity | Detection |
|-------|----------|-----------|
| Rate limit applied before authentication | P1-High | IP-based rate limit can be bypassed by IP rotation |
| No user-based rate limiting after auth | P2-Medium | Allows abuse from authenticated accounts |

```typescript
// VULNERABLE: Rate limit BEFORE authentication
export async function POST(request: NextRequest) {
  const rateLimitResult = checkRateLimit(request, config);  // ✗ IP-based
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  const session = await getServerSession(authOptions);  // Auth happens AFTER
  // Attacker can rotate IPs to bypass rate limit
}

// SECURE: Authenticate FIRST, then rate limit by user ID
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit by authenticated user ID (more secure)
  const rateLimitResult = checkRateLimit(session.user.id, config);
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  // Process request
}

// SECURE: Rate limiting configuration
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 attempts
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,  // Prefer user ID over IP
  skip: (req) => req.ip === '127.0.0.1', // Skip in tests only
});

app.use('/api/auth/*', authLimiter);
```

---

## 4.2.a Request Validation Checklist

- [ ] Content-Type validation (reject unexpected types)
- [ ] Request body size limits configured
- [ ] File upload size and type restrictions
- [ ] JSON depth limits (prevent DoS via nested objects)
- [ ] Array length limits in request bodies

```typescript
// SECURE: Express body parser limits
app.use(express.json({ 
  limit: '1mb',
  strict: true, // Only accept arrays and objects
}));

app.use(express.urlencoded({ 
  limit: '1mb', 
  extended: false, // Use simple algorithm
  parameterLimit: 100,
}));
```

---

## 4.3.a Response Data Leakage Detection

```bash
# Find responses that might leak sensitive data
grep -rn "\.json(\|res\.send(" --include="*.ts" -A 3 | grep -i "password\|secret\|token\|key\|ssn\|credit"
# Find full user objects in responses
grep -rn "res\.json(user)\|\.json({ user })" --include="*.ts"
```

| Data Type | Should Return | Should NOT Return |
|-----------|---------------|-------------------|
| User | id, name, email, avatar | password, passwordHash, resetToken |
| Session | expiresAt | refreshToken, sessionSecret |
| Order | id, status, items | paymentMethodId, fullCardNumber |
| Error | message, code | stackTrace, sqlQuery, internalState |

```typescript
// SECURE: DTO/projection for responses
const userResponse = {
  id: user.id,
  name: user.name,
  email: user.email,
  // Explicitly omit: passwordHash, resetToken, etc.
};
res.json(userResponse);

// Or use a serialization library with @Exclude decorators
```

---

## 4.4.a CORS Misconfiguration Detection

```bash
# Find CORS configuration
grep -rn "cors(\|Access-Control-Allow-Origin" --include="*.ts" -A 5
```

| Configuration | Risk Level | Notes |
|---------------|------------|-------|
| `origin: '*'` | P0 in production | Allows any domain |
| `origin: true` | P1 | Reflects request origin (dangerous with credentials) |
| `credentials: true` + wildcard | P0 | Cannot combine, but misconfiguration possible |
| `origin: /.*\.example\.com/` | P2 | Regex can be bypassed (evil-example.com) |

```typescript
// VULNERABLE
cors({ origin: '*', credentials: true }); // ✗ Invalid and dangerous intent

// SECURE
cors({
  origin: ['https://app.example.com', 'https://admin.example.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // Cache preflight for 24h
});
```

---

## 4.5.a API Security Headers

```typescript
// Required security headers for API responses
{
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store', // For sensitive endpoints
  'X-Request-Id': requestId, // For tracing
}
```

### Vercel/Edge Function Specific

```json
// vercel.json - Security headers
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

---

## Secure Implementation Examples

### Complete Rate Limiter Setup
```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Different limiters for different endpoints
const limiters = {
  auth: rateLimit({
    store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
    windowMs: 60 * 1000,
    max: 5,
    keyGenerator: (req) => `auth:${req.ip}`,
  }),
  
  api: rateLimit({
    store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
    windowMs: 60 * 1000,
    max: 100,
    keyGenerator: (req) => `api:${req.user?.id || req.ip}`,
  }),
  
  upload: rateLimit({
    store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    keyGenerator: (req) => `upload:${req.user?.id}`,
  }),
};
```

### Safe Response Serialization
```typescript
// Define what fields are safe to return
const PUBLIC_USER_FIELDS = ['id', 'name', 'avatar', 'createdAt'] as const;
const PRIVATE_USER_FIELDS = [...PUBLIC_USER_FIELDS, 'email', 'preferences'] as const;

function serializeUser(user: User, includePrivate = false): Partial<User> {
  const fields = includePrivate ? PRIVATE_USER_FIELDS : PUBLIC_USER_FIELDS;
  return Object.fromEntries(
    fields.map(field => [field, user[field]])
  );
}
```
