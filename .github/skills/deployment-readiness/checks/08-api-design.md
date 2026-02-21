# Level 3: API Design & Contracts Deep Checks

## Overview
This document provides comprehensive detection patterns and best practices for API design, versioning, documentation, and maintaining backward compatibility in enterprise applications.

---

## 1. API Versioning Analysis

### Detection Commands
```bash
# Check for API versioning in routes
echo "=== API Versioning ==="
grep -rn "v1\|v2\|version" api/ pages/api/ 2>/dev/null | head -20
ls -la api/ pages/api/ 2>/dev/null

# Find version headers
echo -e "\n=== Version Headers ==="
grep -rn "x-api-version\|accept-version\|api-version" --include="*.ts" -i

# Check for versioned types
echo -e "\n=== Versioned Types ==="
grep -rn "V1\|V2\|Version" --include="*.ts" types/ 2>/dev/null
```

### API Versioning Strategies

```typescript
// ✅ URL-based versioning (Recommended for Vercel)
// api/v1/users.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // V1 implementation
}

// api/v2/users.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // V2 implementation with breaking changes
}

// ✅ Header-based versioning
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const version = req.headers['x-api-version'] || '1';
  
  switch (version) {
    case '1':
      return handleV1(req, res);
    case '2':
      return handleV2(req, res);
    default:
      return res.status(400).json({ error: 'Unsupported API version' });
  }
}

// ✅ Vercel Edge Functions with versioning
// api/users/route.ts (App Router)
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const version = request.headers.get('x-api-version') ?? '1';
  
  // Set version in response for client awareness
  const response = NextResponse.json(data);
  response.headers.set('x-api-version', version);
  return response;
}
```

### Version Deprecation Pattern

```typescript
// ✅ Deprecation warning middleware
function withDeprecationWarning(
  handler: NextApiHandler,
  deprecationDate: string,
  migrationGuide: string
): NextApiHandler {
  return async (req, res) => {
    res.setHeader('Deprecation', `date="${deprecationDate}"`);
    res.setHeader('Link', `<${migrationGuide}>; rel="deprecation"`);
    res.setHeader('Sunset', deprecationDate);
    
    console.warn(`Deprecated API called: ${req.url}`);
    
    return handler(req, res);
  };
}

// Usage
export default withDeprecationWarning(
  handler,
  '2025-06-01',
  'https://docs.example.com/migration/v1-to-v2'
);
```

---

## 2. API Contract Documentation

### Detection Commands
```bash
# Check for OpenAPI/Swagger
echo "=== OpenAPI/Swagger ==="
grep -rn "openapi\|swagger" --include="*.json" --include="*.yaml" --include="*.yml" 2>/dev/null
ls -la openapi.* swagger.* api-docs.* 2>/dev/null

# Find JSDoc API documentation
echo -e "\n=== API JSDoc ==="
grep -rn "@api\|@apiParam\|@apiResponse" --include="*.ts" api/ 2>/dev/null | head -20

# Check for type exports
echo -e "\n=== API Types ==="
grep -rn "export.*Request\|export.*Response\|export.*Params" --include="*.ts" types/ api/ 2>/dev/null | head -20

# Find README/docs
echo -e "\n=== API Documentation ==="
ls -la docs/ API.md api/README.md 2>/dev/null
```

### API Documentation with TypeScript

```typescript
// ✅ Strongly typed API contracts (types/api.ts)
// Request types
export interface CreateUserRequest {
  email: string;
  name: string;
  role?: 'admin' | 'user';
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  avatarUrl?: string;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// Response types
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

// ✅ API handler with full typing
import { z } from 'zod';
import type { CreateUserRequest, UserResponse, ErrorResponse } from '@/types/api';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'user']).optional().default('user'),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST allowed' }
    });
  }

  const validation = createUserSchema.safeParse(req.body);
  
  if (!validation.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: validation.error.flatten().fieldErrors,
      }
    });
  }

  const user = await createUser(validation.data);
  return res.status(201).json(user);
}
```

### OpenAPI Specification

```yaml
# ✅ openapi.yaml
openapi: 3.0.3
info:
  title: TechTaitan API
  version: 1.0.0
  description: API for TechTaitan platform

servers:
  - url: https://api.techtaitan.com/v1
    description: Production
  - url: https://staging-api.techtaitan.com/v1
    description: Staging

paths:
  /users:
    get:
      summary: List users
      tags: [Users]
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
            maximum: 100
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedUsers'
    
    post:
      summary: Create user
      tags: [Users]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '400':
          $ref: '#/components/responses/ValidationError'

components:
  schemas:
    User:
      type: object
      required: [id, email, name, createdAt]
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        name:
          type: string
        createdAt:
          type: string
          format: date-time
    
    CreateUserRequest:
      type: object
      required: [email, name]
      properties:
        email:
          type: string
          format: email
        name:
          type: string
          minLength: 1
          maxLength: 100
        role:
          type: string
          enum: [admin, user]
          default: user

  responses:
    ValidationError:
      description: Validation error
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: object
                properties:
                  code:
                    type: string
                  message:
                    type: string
                  details:
                    type: object
```

---

## 3. Error Response Consistency

### Detection Commands
```bash
# Check error response patterns
echo "=== Error Response Patterns ==="
grep -rn "res\.status\|NextResponse.*status\|json.*error" --include="*.ts" api/ | head -30

# Find error handling middleware
echo -e "\n=== Error Handling ==="
grep -rn "catch\|errorHandler\|withErrorHandling" --include="*.ts" api/ | head -20

# Check for error types
echo -e "\n=== Error Types ==="
grep -rn "Error\|Exception" --include="*.ts" types/ | head -20
```

### Standardized Error Handling

```typescript
// ✅ Error types (types/errors.ts)
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(details: Record<string, string[]>) {
    super(400, 'VALIDATION_ERROR', 'Validation failed', details);
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Permission denied') {
    super(403, 'FORBIDDEN', message);
  }
}

// ✅ Error handler middleware
export function withErrorHandler(handler: NextApiHandler): NextApiHandler {
  return async (req, res) => {
    try {
      return await handler(req, res);
    } catch (error) {
      console.error('API Error:', error);

      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
          error: {
            code: error.code,
            message: error.message,
            ...(error.details && { details: error.details }),
          },
        });
      }

      // Log unexpected errors to Sentry
      Sentry.captureException(error);

      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    }
  };
}

// ✅ Usage
export default withErrorHandler(async (req, res) => {
  const user = await getUser(req.query.id as string);
  
  if (!user) {
    throw new NotFoundError('User');
  }
  
  return res.json(user);
});
```

### Error Response Format

| Status | Code | When to Use |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid input data |
| 400 | BAD_REQUEST | Malformed request |
| 401 | UNAUTHORIZED | Missing/invalid auth |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource doesn't exist |
| 409 | CONFLICT | Resource conflict |
| 422 | UNPROCESSABLE | Business logic error |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |
| 503 | SERVICE_UNAVAILABLE | Dependency down |

---

## 4. Rate Limiting

### Detection Commands
```bash
# Check for rate limiting
echo "=== Rate Limiting ==="
grep -rn "rate.*limit\|rateLimit\|throttle" --include="*.ts" 2>/dev/null

# Find rate limit headers
echo -e "\n=== Rate Limit Headers ==="
grep -rn "x-ratelimit\|retry-after" --include="*.ts" -i 2>/dev/null

# Check Vercel config for rate limiting
echo -e "\n=== Vercel Rate Limiting ==="
grep -rn "limit\|rate" vercel.json 2>/dev/null
```

### Rate Limiting Implementation

```typescript
// ✅ Simple in-memory rate limiter (for demo, use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number;  // Time window in ms
  maxRequests: number;  // Max requests per window
}

export function withRateLimit(
  handler: NextApiHandler,
  config: RateLimitConfig = { windowMs: 60000, maxRequests: 100 }
): NextApiHandler {
  return async (req, res) => {
    const identifier = getClientIdentifier(req);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    let record = rateLimitMap.get(identifier);

    // Reset if window expired
    if (!record || record.resetTime < now) {
      record = { count: 0, resetTime: now + config.windowMs };
    }

    record.count++;
    rateLimitMap.set(identifier, record);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', record.resetTime);

    if (record.count > config.maxRequests) {
      res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
      return res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests, please try again later',
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
        },
      });
    }

    return handler(req, res);
  };
}

function getClientIdentifier(req: NextApiRequest): string {
  // Use forwarded IP in production (behind proxy)
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

// ✅ Usage with different limits per endpoint
export default withRateLimit(handler, { windowMs: 60000, maxRequests: 10 }); // 10/min
```

---

## 5. Backward Compatibility

### Detection Commands
```bash
# Check for breaking changes indicators
echo "=== Potential Breaking Changes ==="
git log --oneline --grep="BREAKING\|breaking" 2>/dev/null | head -10

# Find schema changes
echo -e "\n=== Schema/Type Changes ==="
git diff HEAD~10 --name-only 2>/dev/null | grep -E "types|schema|api" | head -20

# Check for optional fields
echo -e "\n=== Optional Fields (good for compatibility) ==="
grep -rn "\?:" --include="*.ts" types/ api/ 2>/dev/null | head -20
```

### Backward Compatibility Patterns

```typescript
// ✅ Additive changes (non-breaking)
// Before
interface UserResponse {
  id: string;
  name: string;
}

// After - Adding optional field is safe
interface UserResponse {
  id: string;
  name: string;
  avatarUrl?: string;  // ✅ New optional field
}

// ✅ Response transformation for compatibility
function transformUserResponse(
  user: InternalUser,
  apiVersion: string
): UserResponseV1 | UserResponseV2 {
  const base = {
    id: user.id,
    name: user.name,
    email: user.email,
  };

  if (apiVersion === '2') {
    return {
      ...base,
      profile: {
        avatarUrl: user.avatarUrl,
        bio: user.bio,
      },
    };
  }

  // V1 compatibility - flatten profile
  return {
    ...base,
    avatarUrl: user.avatarUrl,
  };
}

// ✅ Handling deprecated fields
interface CreateUserRequestV1 {
  email: string;
  name: string;
  /** @deprecated Use `role` instead */
  isAdmin?: boolean;
  role?: 'admin' | 'user';
}

function normalizeCreateUserRequest(body: CreateUserRequestV1): NormalizedRequest {
  return {
    email: body.email,
    name: body.name,
    // Support deprecated field for backward compatibility
    role: body.role ?? (body.isAdmin ? 'admin' : 'user'),
  };
}
```

### Breaking Change Checklist

| Change Type | Breaking? | Migration Approach |
|-------------|-----------|-------------------|
| Add optional field | No | Direct deploy |
| Add required field | Yes | Add as optional first |
| Remove field | Yes | Deprecate → Remove later |
| Rename field | Yes | Support both temporarily |
| Change field type | Yes | New API version |
| Change response structure | Yes | New API version |
| Change authentication | Yes | Deprecation period |

---

## 6. Response Caching

### Detection Commands
```bash
# Check for cache headers
echo "=== Cache Headers ==="
grep -rn "Cache-Control\|ETag\|Last-Modified\|stale-while-revalidate" --include="*.ts" api/ 2>/dev/null

# Find caching configuration
echo -e "\n=== Caching Config ==="
grep -rn "revalidate\|cache" vercel.json next.config.* 2>/dev/null
```

### Response Caching Implementation

```typescript
// ✅ Cache headers for API responses
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // For static/rarely changing data
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  
  // For user-specific data
  // res.setHeader('Cache-Control', 'private, no-cache');
  
  // For completely dynamic data
  // res.setHeader('Cache-Control', 'no-store');

  const data = await getData();
  return res.json(data);
}

// ✅ ETag support for conditional requests
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const data = await getData();
  const etag = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  
  res.setHeader('ETag', `"${etag}"`);
  res.setHeader('Cache-Control', 'private, must-revalidate');

  // Check if client has current version
  if (req.headers['if-none-match'] === `"${etag}"`) {
    return res.status(304).end();
  }

  return res.json(data);
}

// ✅ Vercel edge caching (vercel.json)
{
  "headers": [
    {
      "source": "/api/public/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, s-maxage=300, stale-while-revalidate=600"
        }
      ]
    }
  ]
}
```

---

## Enterprise Readiness Checklist

### API Design Scorecard

| Criterion | Weight | Status |
|-----------|--------|--------|
| API versioning strategy | 15% | ☐ |
| TypeScript API contracts | 15% | ☐ |
| Consistent error responses | 15% | ☐ |
| API documentation exists | 10% | ☐ |
| Rate limiting implemented | 10% | ☐ |
| Backward compatibility considered | 10% | ☐ |
| Cache headers configured | 10% | ☐ |
| Input validation (Zod) | 10% | ☐ |
| Deprecation process defined | 5% | ☐ |

**Minimum Score for Deployment: 80%**
