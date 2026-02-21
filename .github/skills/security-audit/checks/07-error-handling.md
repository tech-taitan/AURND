# Error Handling & Information Disclosure - Deep Checks

> Level 3 deep checks for security audit category 7.

## 7.1.a Error Message Audit

```bash
# Find error messages that may leak information
grep -rn "res\.status.*\.json.*error\|throw new Error" --include="*.ts" -A 2
# Find catches that expose raw errors
grep -rn "catch.*{" --include="*.ts" -A 5 | grep "res\..*error\|res\..*err\.message\|res\..*e\.message"
```

| Error Type | Unsafe Response | Safe Response | Severity |
|------------|----------------|---------------|----------|
| Auth failure | "User not found" / "Wrong password" | "Invalid credentials" | P1 |
| Database error | SQL error message | "Database error occurred" | P0 |
| Validation | Field-by-field errors (OK) | Keep if not sensitive | P3 |
| Internal error | Stack trace + file paths | "Internal server error" | P0 |
| Rate limit | "Too many requests from IP x.x.x.x" | "Too many requests" | P2 |

```typescript
// VULNERABLE: Exposing internal errors
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message, stack: err.stack }); // ✗
});

// SECURE: Generic errors with logging
app.use((err, req, res, next) => {
  const requestId = crypto.randomUUID();
  
  // Log full error for debugging (server-side only)
  logger.error('Unhandled error', {
    requestId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    userId: req.user?.id,
  });
  
  // Return generic error to client
  res.status(500).json({
    error: 'An internal error occurred',
    requestId, // Allow users to reference in support
  });
});
```

---

## 7.2.a Stack Trace Prevention

```bash
# Check for production stack trace exposure
grep -rn "err\.stack\|error\.stack\|e\.stack" --include="*.ts" | grep -v "logger\|console\.error\|log"
# Check NODE_ENV handling
grep -rn "NODE_ENV" --include="*.ts"
```

### React Error Boundary Verification

```typescript
// Required: Error boundary in React apps
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error tracking (Sentry, etc.)
    Sentry.captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Show fallback UI - no technical details
      return <ErrorPage message="Something went wrong" />;
    }
    return this.props.children;
  }
}
```

---

## 7.3.a Debug Endpoint Detection

```bash
# Find debug/test endpoints
grep -rn "/debug\|/test\|/internal\|/__" --include="*.ts"
# Find console.log statements (should be removed in production)
grep -rn "console\.log\|console\.debug\|console\.trace" --include="*.ts" --include="*.tsx" | wc -l
```

| Pattern | Risk | Action |
|---------|------|--------|
| `/api/debug/*` | P0 | Remove or auth-protect |
| `/api/__health` | P3 | OK if no sensitive data |
| `console.log(user)` | P2 | Remove logging of sensitive data |
| `DEBUG=true` in production | P1 | Ensure feature flags are off |

---

## 7.4.a Version Disclosure Check

```bash
# Check for version headers in responses
curl -I https://yoursite.com | grep -i "x-powered-by\|server:\|x-aspnet-version"
# Find version exposure in code
grep -rn "X-Powered-By\|x-powered-by" --include="*.ts"
```

```typescript
// SECURE: Remove version headers
app.disable('x-powered-by');

// Or in Vercel/Next.js - vercel.json
{
  "headers": [{
    "source": "/(.*)",
    "headers": [{ "key": "X-Powered-By", "value": "" }]
  }]
}
```

---

## Secure Implementation Examples

### Centralized Error Handler
```typescript
import crypto from 'crypto';

// Custom error classes
class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
  }
}

class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class ValidationError extends AppError {
  constructor(public errors: Record<string, string>) {
    super('Validation failed', 400, 'VALIDATION_ERROR');
  }
}

class UnauthorizedError extends AppError {
  constructor() {
    super('Invalid credentials', 401, 'UNAUTHORIZED');
  }
}

// Error handler middleware
function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  const requestId = crypto.randomUUID();
  
  // Log full details server-side
  logger.error({
    requestId,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    body: sanitizeForLogging(req.body),
  });
  
  // Report to error tracking
  if (!(err instanceof AppError) || !err.isOperational) {
    Sentry.captureException(err, {
      extra: { requestId, path: req.path },
    });
  }
  
  // Determine response
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(err instanceof ValidationError && { details: err.errors }),
      requestId,
    });
  }
  
  // Generic error for unexpected issues
  res.status(500).json({
    error: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
    requestId,
  });
}
```

### React Error Boundary
```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorId?: string;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = crypto.randomUUID();
    
    console.error('Error boundary caught:', error);
    
    Sentry.captureException(error, {
      extra: {
        errorId,
        componentStack: errorInfo.componentStack,
      },
    });
    
    this.setState({ errorId });
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-page">
          <h1>Something went wrong</h1>
          <p>We've been notified and are working on it.</p>
          {this.state.errorId && (
            <p className="error-id">Reference: {this.state.errorId}</p>
          )}
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

### Environment-Aware Error Responses
```typescript
const isDev = process.env.NODE_ENV === 'development';

function formatErrorResponse(err: Error, requestId: string) {
  const base = {
    error: err instanceof AppError ? err.message : 'Internal server error',
    requestId,
  };
  
  // Only include stack in development
  if (isDev) {
    return {
      ...base,
      stack: err.stack,
      details: err.message,
    };
  }
  
  return base;
}
```
