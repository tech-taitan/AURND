# Level 3: Observability & Monitoring Deep Checks

## Overview
This document provides comprehensive detection patterns and best practices for implementing enterprise-grade observability, enabling effective debugging, performance monitoring, and operational awareness.

---

## 1. Structured Logging Analysis

### Detection Commands
```bash
# Check for logging implementation
echo "=== Logging Implementation ==="
grep -rn "logger\.\|createLogger\|winston\|pino\|bunyan" --include="*.ts" --include="*.tsx"

# Find console.log usage (should be replaced with proper logging)
echo -e "\n=== Console.log Usage (Anti-pattern in Production) ==="
grep -rn "console\.log\|console\.info\|console\.debug" --include="*.ts" --include="*.tsx" | grep -v "test\|spec"

# Check for log levels
echo -e "\n=== Log Levels Used ==="
grep -rn "\.error\|\.warn\|\.info\|\.debug\|\.trace" --include="*.ts" | grep "logger\|log" | head -20

# Find logging in error handlers
echo -e "\n=== Error Logging ==="
grep -B2 -A2 "catch\s*(" --include="*.ts" --include="*.tsx" | grep -A2 -B2 "logger\|console"

# Check for contextual logging
echo -e "\n=== Contextual Logging (with metadata) ==="
grep -rn "logger\.\w\+({" --include="*.ts" --include="*.tsx"
```

### Structured Logging Implementation

```typescript
// ✅ Enterprise logging utility (utils/logger.ts)
import { createClient } from '@supabase/supabase-js';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogContext {
  userId?: string;
  requestId?: string;
  component?: string;
  action?: string;
  duration?: number;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  environment: string;
}

class Logger {
  private environment: string;

  constructor() {
    this.environment = import.meta.env.MODE || 'development';
  }

  private formatLog(level: LogLevel, message: string, context: LogContext = {}): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        ...context,
        environment: this.environment,
      },
      environment: this.environment,
    };
  }

  private output(entry: LogEntry): void {
    // In production, send to logging service
    if (this.environment === 'production') {
      // Send to external logging service (e.g., DataDog, Splunk)
      this.sendToLoggingService(entry);
    }
    
    // Always output structured JSON in non-development
    if (this.environment !== 'development') {
      console.log(JSON.stringify(entry));
    } else {
      console[entry.level](entry.message, entry.context);
    }
  }

  private async sendToLoggingService(entry: LogEntry): Promise<void> {
    // Implementation for external logging service
  }

  debug(message: string, context?: LogContext): void {
    if (this.environment === 'development') {
      this.output(this.formatLog(LogLevel.DEBUG, message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    this.output(this.formatLog(LogLevel.INFO, message, context));
  }

  warn(message: string, context?: LogContext): void {
    this.output(this.formatLog(LogLevel.WARN, message, context));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.output(this.formatLog(LogLevel.ERROR, message, {
      ...context,
      errorName: error?.name,
      errorMessage: error?.message,
      errorStack: error?.stack,
    }));
  }
}

export const logger = new Logger();
```

### Logging Best Practices

| Level | Use Case | Example |
|-------|----------|---------|
| DEBUG | Development debugging | `logger.debug('Query params', { params })` |
| INFO | Normal operations | `logger.info('User logged in', { userId })` |
| WARN | Recoverable issues | `logger.warn('Rate limit approaching', { remaining })` |
| ERROR | Failures requiring attention | `logger.error('Payment failed', error, { orderId })` |

### Severity Matrix - Logging

| Issue | Severity | Impact |
|-------|----------|--------|
| No logging implementation | P0-Critical | Blind to production issues |
| console.log in production | P2-Medium | Unstructured, hard to search |
| Missing error context | P1-High | Difficult incident response |
| No log levels | P2-Medium | Noise, hard to filter |
| Sensitive data in logs | P0-Critical | Compliance violation |

---

## 2. Error Tracking Integration

### Detection Commands
```bash
# Check for Sentry integration
echo "=== Sentry Setup ==="
grep -rn "Sentry\|@sentry/react\|@sentry/node" --include="*.ts" --include="*.tsx" package.json

# Find Sentry initialization
echo -e "\n=== Sentry Initialization ==="
grep -rn "Sentry.init\|initSentry" --include="*.ts" --include="*.tsx"

# Check for error capture calls
echo -e "\n=== Error Capture Usage ==="
grep -rn "captureException\|captureMessage\|setUser\|setTag" --include="*.ts" --include="*.tsx"

# Find error boundary integration
echo -e "\n=== Sentry Error Boundary ==="
grep -rn "Sentry.ErrorBoundary\|withSentry\|withErrorBoundary" --include="*.tsx"

# Check for transaction/span usage
echo -e "\n=== Performance Monitoring ==="
grep -rn "startTransaction\|startSpan\|setMeasurement" --include="*.ts" --include="*.tsx"
```

### Sentry Integration Best Practices

```typescript
// ✅ Sentry initialization (services/sentry.ts)
import * as Sentry from '@sentry/react';

export function initSentry(): void {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_APP_VERSION,
      
      // Performance monitoring
      tracesSampleRate: 0.1, // 10% of transactions
      
      // Session replay (optional)
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      
      // Filter sensitive data
      beforeSend(event) {
        // Scrub sensitive data
        if (event.request?.headers) {
          delete event.request.headers['Authorization'];
        }
        return event;
      },
      
      // Ignore certain errors
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'Network request failed',
      ],
      
      integrations: [
        new Sentry.BrowserTracing({
          tracePropagationTargets: ['localhost', /^https:\/\/api\.yourdomain\.com/],
        }),
        new Sentry.Replay(),
      ],
    });
  }
}

// ✅ Error capture with context
export function captureError(error: Error, context?: Record<string, unknown>): void {
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureException(error);
  });
}

// ✅ User context
export function setUserContext(user: { id: string; email: string }): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
  });
}
```

### Error Tracking Checklist

| Feature | Required | Purpose |
|---------|----------|---------|
| DSN configuration | ✅ Yes | Connect to Sentry project |
| Environment tagging | ✅ Yes | Filter by dev/staging/prod |
| Release tracking | ✅ Yes | Track errors by version |
| User context | ⚠️ Recommended | Identify affected users |
| Source maps | ✅ Yes | Readable stack traces |
| Performance tracing | ⚠️ Recommended | Identify slow operations |

---

## 3. Performance Metrics & Web Vitals

### Detection Commands
```bash
# Check for Web Vitals implementation
echo "=== Web Vitals ==="
grep -rn "web-vitals\|reportWebVitals\|getCLS\|getFID\|getLCP" --include="*.ts" --include="*.tsx"

# Find performance measurement
echo -e "\n=== Performance API Usage ==="
grep -rn "performance\.mark\|performance\.measure\|PerformanceObserver" --include="*.ts" --include="*.tsx"

# Check for analytics integration
echo -e "\n=== Analytics Integration ==="
grep -rn "gtag\|analytics\|ga\(\|mixpanel\|amplitude" --include="*.ts" --include="*.tsx"

# Find custom timing metrics
echo -e "\n=== Custom Metrics ==="
grep -rn "Date\.now\|performance\.now" --include="*.ts" --include="*.tsx" | head -20
```

### Web Vitals Implementation

```typescript
// ✅ Web Vitals reporting (utils/webVitals.ts)
import { getCLS, getFID, getFCP, getLCP, getTTFB, Metric } from 'web-vitals';

type ReportHandler = (metric: Metric) => void;

const reportMetric: ReportHandler = (metric) => {
  // Send to analytics
  if (typeof window.gtag === 'function') {
    window.gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      non_interaction: true,
    });
  }

  // Send to custom backend
  navigator.sendBeacon('/api/metrics', JSON.stringify({
    name: metric.name,
    value: metric.value,
    id: metric.id,
    timestamp: Date.now(),
  }));
};

export function reportWebVitals(): void {
  getCLS(reportMetric);   // Cumulative Layout Shift
  getFID(reportMetric);   // First Input Delay
  getFCP(reportMetric);   // First Contentful Paint
  getLCP(reportMetric);   // Largest Contentful Paint
  getTTFB(reportMetric);  // Time to First Byte
}

// ✅ Custom performance measurement
export function measureOperation<T>(
  name: string,
  operation: () => T | Promise<T>
): T | Promise<T> {
  const start = performance.now();
  
  const result = operation();
  
  if (result instanceof Promise) {
    return result.finally(() => {
      const duration = performance.now() - start;
      reportCustomMetric(name, duration);
    });
  }
  
  const duration = performance.now() - start;
  reportCustomMetric(name, duration);
  return result;
}

function reportCustomMetric(name: string, duration: number): void {
  performance.mark(`${name}-end`);
  console.debug(`[Perf] ${name}: ${duration.toFixed(2)}ms`);
  
  // Send to monitoring service
  if (import.meta.env.PROD) {
    navigator.sendBeacon('/api/metrics', JSON.stringify({
      name,
      value: duration,
      type: 'custom',
      timestamp: Date.now(),
    }));
  }
}
```

### Web Vitals Thresholds

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | ≤2.5s | ≤4.0s | >4.0s |
| FID | ≤100ms | ≤300ms | >300ms |
| CLS | ≤0.1 | ≤0.25 | >0.25 |
| FCP | ≤1.8s | ≤3.0s | >3.0s |
| TTFB | ≤800ms | ≤1800ms | >1800ms |

---

## 4. Distributed Tracing

### Detection Commands
```bash
# Check for tracing headers
echo "=== Tracing Headers ==="
grep -rn "x-request-id\|x-correlation-id\|traceparent\|trace-id" --include="*.ts" -i

# Find request context propagation
echo -e "\n=== Context Propagation ==="
grep -rn "requestId\|correlationId\|traceId" --include="*.ts" --include="*.tsx"

# Check for OpenTelemetry
echo -e "\n=== OpenTelemetry ==="
grep -rn "@opentelemetry\|opentelemetry" --include="*.ts" package.json
```

### Request Tracing Implementation

```typescript
// ✅ Request ID middleware (for API routes)
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export function withRequestId(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const requestId = req.headers.get('x-request-id') || uuidv4();
    
    // Add to logging context
    const response = await handler(req);
    
    // Add to response headers
    response.headers.set('x-request-id', requestId);
    
    return response;
  };
}

// ✅ Client-side request tracking
export async function fetchWithTracing(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const requestId = crypto.randomUUID();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'x-request-id': requestId,
    },
  });
  
  // Log request/response
  logger.info('API Request', {
    requestId,
    url,
    method: options.method || 'GET',
    status: response.status,
  });
  
  return response;
}
```

---

## 5. Health Checks & Readiness Probes

### Detection Commands
```bash
# Check for health endpoints
echo "=== Health Check Endpoints ==="
grep -rn "health\|ready\|live\|status" api/ pages/api/ --include="*.ts" 2>/dev/null

# Find health check implementations
echo -e "\n=== Health Check Logic ==="
grep -rn "healthCheck\|isHealthy\|checkDatabase" --include="*.ts"

# Check for uptime monitoring
echo -e "\n=== Uptime/Status Monitoring ==="
grep -rn "uptime\|statuspage\|pingdom" --include="*.ts" --include="*.tsx" -i
```

### Health Check Implementation

```typescript
// ✅ Health check endpoint (api/health.ts)
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/services/supabaseService';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    database: CheckResult;
    cache?: CheckResult;
    external?: CheckResult;
  };
}

interface CheckResult {
  status: 'pass' | 'fail';
  latency?: number;
  message?: string;
}

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const { error } = await supabase.from('_health').select('id').limit(1);
    if (error) throw error;
    return {
      status: 'pass',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'fail',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthStatus>
): Promise<void> {
  const dbCheck = await checkDatabase();
  
  const status: HealthStatus = {
    status: dbCheck.status === 'pass' ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
    checks: {
      database: dbCheck,
    },
  };
  
  res.status(status.status === 'healthy' ? 200 : 503).json(status);
}
```

### Health Check Types

| Type | Purpose | Response Time | Failure Action |
|------|---------|---------------|----------------|
| Liveness | Is the app running? | <100ms | Restart container |
| Readiness | Can it handle requests? | <500ms | Remove from load balancer |
| Startup | Is initialization complete? | <30s | Wait and retry |
| Deep health | All dependencies OK? | <5s | Alert, investigate |

---

## 6. Alerting Configuration

### Alerting Strategy Matrix

| Metric | Warning Threshold | Critical Threshold | Response |
|--------|-------------------|-------------------|----------|
| Error rate | >1% | >5% | Investigate immediately |
| Response time (p95) | >2s | >5s | Scale/optimize |
| Memory usage | >80% | >95% | Scale/investigate leak |
| CPU usage | >70% | >90% | Scale resources |
| Disk usage | >80% | >95% | Clean up/expand |
| Health check failures | 1 failure | 3 consecutive | Page on-call |

### Alert Configuration Example

```typescript
// ✅ Alert definitions (for monitoring service)
const alerts = {
  errorRate: {
    name: 'High Error Rate',
    condition: 'error_rate > 0.05', // 5%
    window: '5m',
    severity: 'critical',
    channels: ['pagerduty', 'slack'],
  },
  slowResponses: {
    name: 'Slow API Responses',
    condition: 'p95_latency > 2000', // 2s
    window: '10m',
    severity: 'warning',
    channels: ['slack'],
  },
  healthCheckFailed: {
    name: 'Health Check Failed',
    condition: 'health_check_status != "healthy"',
    window: '1m',
    severity: 'critical',
    channels: ['pagerduty', 'slack'],
  },
};
```

---

## Enterprise Readiness Checklist

### Observability Scorecard

| Criterion | Weight | Status |
|-----------|--------|--------|
| Structured logging implemented | 15% | ☐ |
| No console.log in production code | 10% | ☐ |
| Error tracking (Sentry) configured | 15% | ☐ |
| Source maps uploaded for errors | 10% | ☐ |
| Web Vitals monitoring | 10% | ☐ |
| Health check endpoint exists | 15% | ☐ |
| Request ID tracing | 10% | ☐ |
| Alerting rules defined | 10% | ☐ |
| User context in error reports | 5% | ☐ |

**Minimum Score for Deployment: 80%**
