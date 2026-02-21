# Transport & Network Security - Deep Checks

> Level 3 deep checks for security audit category 8.

## 8.1.a HTTPS & HSTS Verification

```bash
# Check HSTS header
curl -I https://yoursite.com | grep -i strict-transport-security
# Expected: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

# Find HTTP URLs in code
grep -rn "http://" --include="*.ts" --include="*.tsx" | grep -v "localhost\|127\.0\.0\.1\|http://schemas"
```

| HSTS Setting | Recommended | Notes |
|--------------|-------------|-------|
| max-age | 31536000 (1 year) | Minimum 6 months for preload |
| includeSubDomains | Yes | Protect all subdomains |
| preload | Yes | Submit to hstspreload.org |

---

## 8.2.a Security Headers Checklist

```typescript
// Complete security headers configuration
const securityHeaders = {
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // Prevent MIME sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // XSS protection (legacy browsers)
  'X-XSS-Protection': '1; mode=block',
  
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions policy
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  
  // Content Security Policy (customize per app)
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",  // Audit 'unsafe-inline'
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.example.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
  ].join('; '),
};
```

### CSP Audit Table

| Directive | Secure | Risky | Notes |
|-----------|--------|-------|-------|
| default-src | 'self' | * | Fallback for all |
| script-src | 'self' | 'unsafe-inline' 'unsafe-eval' | Audit inline scripts |
| style-src | 'self' | 'unsafe-inline' | Common but risky |
| img-src | 'self' https: | * data: blob: | data: for base64 OK |
| connect-src | specific origins | * | API allowlist |
| frame-ancestors | 'none' | * | Clickjacking prevention |

```bash
# Check current CSP header
curl -I https://yoursite.com | grep -i content-security-policy
# CSP evaluation tool: https://csp-evaluator.withgoogle.com/
```

---

## 8.3.a Cookie Security Audit

```bash
# Find cookie settings
grep -rn "Set-Cookie\|cookie(\|cookies\.set\|res\.cookie" --include="*.ts" -A 3
# Check for missing security attributes
grep -rn "httpOnly:\s*false\|secure:\s*false\|sameSite:\s*'none'" --include="*.ts"
```

| Cookie Type | Secure | HttpOnly | SameSite | Max-Age |
|-------------|--------|----------|----------|----------|
| Session token | ✓ Required | ✓ Required | Strict | Short (1h) |
| Refresh token | ✓ Required | ✓ Required | Strict | Medium (7d) |
| CSRF token | ✓ Required | ✗ (JS needs access) | Strict | Session |
| Preferences | Optional | Optional | Lax | Long (1y) |
| Analytics | Optional | ✗ (JS needs access) | Lax | Long (1y) |

```typescript
// SECURE: Cookie configuration
res.cookie('session', token, {
  httpOnly: true,     // No JavaScript access
  secure: true,       // HTTPS only
  sameSite: 'strict', // No cross-site sending
  maxAge: 3600000,    // 1 hour
  path: '/',
  domain: '.example.com', // Scope to domain
});
```

---

## 8.4.a WebSocket Security

```bash
# Find WebSocket implementations
grep -rn "new WebSocket\|ws://\|wss://\|socket\.io" --include="*.ts"
# Check for origin validation
grep -rn "verifyClient\|origin\|upgrade" --include="*.ts" | grep -i "socket\|ws"
```

```typescript
// SECURE: WebSocket with origin validation
const wss = new WebSocketServer({
  server,
  verifyClient: ({ origin, req }) => {
    const allowedOrigins = ['https://app.example.com'];
    if (!allowedOrigins.includes(origin)) {
      return false; // Reject connection
    }
    // Also validate authentication token from query/headers
    const token = new URL(req.url, 'ws://localhost').searchParams.get('token');
    return validateToken(token);
  },
});

// Message validation
ws.on('message', (data) => {
  const message = MessageSchema.safeParse(JSON.parse(data));
  if (!message.success) {
    ws.close(1008, 'Invalid message format');
    return;
  }
  // Process validated message
});
```

---

## Secure Implementation Examples

### Security Headers Middleware
```typescript
function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // HSTS
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'", // Required for many CSS-in-JS
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "upgrade-insecure-requests",
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);
  
  next();
}
```

### Vercel Configuration
```json
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'"
        }
      ]
    }
  ]
}
```

### Secure Cookie Helper
```typescript
interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  path?: string;
  domain?: string;
}

const COOKIE_DEFAULTS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
};

function setSecureCookie(
  res: Response,
  name: string,
  value: string,
  options: CookieOptions = {}
) {
  const opts = { ...COOKIE_DEFAULTS, ...options };
  
  // Validate SameSite=None requires Secure
  if (opts.sameSite === 'none' && !opts.secure) {
    throw new Error('SameSite=None requires Secure flag');
  }
  
  res.cookie(name, value, opts);
}

// Usage
setSecureCookie(res, 'session', token, { maxAge: 3600000 });
setSecureCookie(res, 'refresh', refreshToken, { maxAge: 604800000 });
```
