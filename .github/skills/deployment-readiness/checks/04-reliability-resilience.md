# Level 3: Reliability & Resilience Deep Checks

## Overview
This document provides comprehensive detection patterns and implementation guidance for building fault-tolerant applications that gracefully handle failures and recover automatically.

---

## 1. Error Boundary Analysis

### Detection Commands
```bash
# Check for Error Boundary components
echo "=== Error Boundary Implementation ==="
grep -rn "ErrorBoundary\|componentDidCatch\|getDerivedStateFromError" --include="*.tsx" --include="*.ts"

# Find Error Boundary usage in app
echo -e "\n=== Error Boundary Usage ==="
grep -rn "<ErrorBoundary\|ErrorBoundary>" --include="*.tsx"

# Check for Sentry Error Boundary
echo -e "\n=== Sentry Error Boundary ==="
grep -rn "Sentry\.ErrorBoundary\|withErrorBoundary" --include="*.tsx"

# Find components without error boundaries
echo -e "\n=== Pages/Routes ==="
ls -la pages/ 2>/dev/null || ls -la src/pages/ 2>/dev/null

# Check for fallback UI
echo -e "\n=== Fallback Components ==="
grep -rn "fallback=\|FallbackComponent\|errorElement" --include="*.tsx"
```

### Error Boundary Implementation

```typescript
// ✅ Comprehensive Error Boundary (components/ErrorBoundary.tsx)
import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: unknown[];
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to error tracking service
    Sentry.withScope((scope) => {
      scope.setExtra('componentStack', errorInfo.componentStack);
      Sentry.captureException(error);
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props): void {
    // Reset error state when resetKeys change
    if (
      this.state.hasError &&
      this.props.resetKeys?.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      )
    ) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary-fallback" role="alert">
          <h2>Something went wrong</h2>
          <p>We're sorry for the inconvenience. Please try again.</p>
          <button onClick={this.handleRetry}>
            Try Again
          </button>
          <details>
            <summary>Error Details</summary>
            <pre>{this.state.error?.message}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

// ✅ Usage Pattern
function App() {
  return (
    <ErrorBoundary
      fallback={<AppErrorFallback />}
      onError={(error) => console.error('App error:', error)}
    >
      <Suspense fallback={<LoadingSpinner />}>
        <Routes />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### Error Boundary Placement Strategy

| Boundary Level | Purpose | Recovery Action |
|----------------|---------|-----------------|
| App-level | Catch catastrophic failures | Show full-page error |
| Route-level | Isolate page failures | Navigate or retry |
| Feature-level | Contain feature failures | Show feature fallback |
| Component-level | Protect critical widgets | Show placeholder |

---

## 2. Retry Logic & Circuit Breakers

### Detection Commands
```bash
# Check for retry implementations
echo "=== Retry Logic ==="
grep -rn "retry\|maxRetries\|retryCount\|attempt" --include="*.ts" --include="*.tsx"

# Find exponential backoff
echo -e "\n=== Backoff Patterns ==="
grep -rn "backoff\|delay\|setTimeout.*retry\|exponential" --include="*.ts"

# Check for circuit breaker pattern
echo -e "\n=== Circuit Breaker ==="
grep -rn "circuit\|breaker\|halfOpen\|open.*state" --include="*.ts"

# Find fetch/API retry wrappers
echo -e "\n=== API Retry Wrappers ==="
grep -B5 -A10 "async.*fetch\|async.*request" --include="*.ts" | head -50
```

### Retry with Exponential Backoff

```typescript
// ✅ Retry utility (utils/retry.ts)
interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error;
  let delay = finalConfig.initialDelayMs;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      if (
        finalConfig.retryableErrors &&
        !finalConfig.retryableErrors(lastError)
      ) {
        throw lastError;
      }

      if (attempt === finalConfig.maxAttempts) {
        throw lastError;
      }

      // Call retry callback
      finalConfig.onRetry?.(attempt, lastError);

      // Wait before retry
      await sleep(delay);

      // Calculate next delay with jitter
      delay = Math.min(
        delay * finalConfig.backoffMultiplier + Math.random() * 1000,
        finalConfig.maxDelayMs
      );
    }
  }

  throw lastError!;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ✅ Usage
const data = await withRetry(
  () => fetch('/api/data').then((r) => r.json()),
  {
    maxAttempts: 3,
    onRetry: (attempt, error) => {
      logger.warn(`Retry attempt ${attempt}`, { error: error.message });
    },
    retryableErrors: (error) => {
      // Only retry network/server errors
      return error.message.includes('network') || 
             error.message.includes('5');
    },
  }
);
```

### Circuit Breaker Pattern

```typescript
// ✅ Circuit Breaker (utils/circuitBreaker.ts)
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing recovery
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenRequests: number;
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private halfOpenSuccesses: number = 0;

  constructor(
    private name: string,
    private config: CircuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeoutMs: 30000,
      halfOpenRequests: 3,
    }
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.config.resetTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenSuccesses = 0;
        logger.info(`Circuit ${this.name} entering HALF_OPEN state`);
      } else {
        throw new Error(`Circuit ${this.name} is OPEN`);
      }
    }

    try {
      const result = await operation();

      if (this.state === CircuitState.HALF_OPEN) {
        this.halfOpenSuccesses++;
        if (this.halfOpenSuccesses >= this.config.halfOpenRequests) {
          this.state = CircuitState.CLOSED;
          this.failures = 0;
          logger.info(`Circuit ${this.name} CLOSED after recovery`);
        }
      }

      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.config.failureThreshold) {
        this.state = CircuitState.OPEN;
        logger.error(`Circuit ${this.name} OPENED after ${this.failures} failures`);
      }

      throw error;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

// ✅ Usage
const apiCircuit = new CircuitBreaker('external-api', {
  failureThreshold: 5,
  resetTimeoutMs: 60000,
  halfOpenRequests: 3,
});

async function fetchExternalData() {
  return apiCircuit.execute(() =>
    fetch('https://external-api.com/data').then((r) => r.json())
  );
}
```

---

## 3. Graceful Degradation

### Detection Commands
```bash
# Check for Suspense/fallback patterns
echo "=== Suspense Boundaries ==="
grep -rn "<Suspense\|Suspense>\|fallback=" --include="*.tsx"

# Find offline support
echo -e "\n=== Offline Support ==="
grep -rn "offline\|navigator\.onLine\|serviceWorker" --include="*.ts" --include="*.tsx"

# Check for feature fallbacks
echo -e "\n=== Feature Fallbacks ==="
grep -rn "isSupported\|canUse\|fallback\|alternative" --include="*.ts" --include="*.tsx"

# Find loading states
echo -e "\n=== Loading States ==="
grep -rn "isLoading\|loading\|pending\|skeleton" --include="*.tsx" | head -20
```

### Graceful Degradation Patterns

```typescript
// ✅ Feature degradation with fallback
function AdvancedChart({ data }: Props) {
  const [chartError, setChartError] = useState(false);

  if (chartError) {
    // Fallback to simple table when chart fails
    return <DataTable data={data} />;
  }

  return (
    <ErrorBoundary onError={() => setChartError(true)}>
      <ComplexChartLibrary data={data} />
    </ErrorBoundary>
  );
}

// ✅ Progressive enhancement
function VideoPlayer({ src, poster }: Props) {
  const [canPlayVideo, setCanPlayVideo] = useState(true);

  if (!canPlayVideo) {
    return (
      <div className="video-fallback">
        <img src={poster} alt="Video thumbnail" />
        <a href={src} download>Download video</a>
      </div>
    );
  }

  return (
    <video
      src={src}
      poster={poster}
      onError={() => setCanPlayVideo(false)}
      controls
    />
  );
}

// ✅ Offline-aware component
function DataView() {
  const isOnline = useOnlineStatus();
  const { data, error } = useData();

  if (!isOnline && error) {
    return (
      <OfflineMessage>
        <p>You're offline. Showing cached data.</p>
        <CachedDataView />
      </OfflineMessage>
    );
  }

  return <LiveDataView data={data} />;
}

// ✅ Online status hook
function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

---

## 4. Timeout Handling

### Detection Commands
```bash
# Check for AbortController usage
echo "=== AbortController Usage ==="
grep -rn "AbortController\|abort\|signal" --include="*.ts" --include="*.tsx"

# Find timeout configurations
echo -e "\n=== Timeout Settings ==="
grep -rn "timeout\|timeoutMs\|deadline" --include="*.ts" --include="*.tsx"

# Check fetch calls without timeout
echo -e "\n=== Fetch Calls (check for timeout) ==="
grep -rn "fetch(" --include="*.ts" --include="*.tsx" | head -20
```

### Timeout Implementation

```typescript
// ✅ Fetch with timeout (utils/fetchWithTimeout.ts)
interface FetchOptions extends RequestInit {
  timeoutMs?: number;
}

export async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeoutMs = 30000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ✅ Usage in component with cleanup
function DataFetcher({ endpoint }: Props) {
  const [data, setData] = useState(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      try {
        const response = await fetch(endpoint, {
          signal: controller.signal,
        });
        const result = await response.json();
        setData(result);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err);
        }
      }
    }

    fetchData();

    return () => {
      controller.abort(); // Cancel on unmount
    };
  }, [endpoint]);

  // ... render logic
}

// ✅ Promise race with timeout
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}
```

### Timeout Strategy

| Operation Type | Recommended Timeout | Rationale |
|---------------|---------------------|-----------|
| API read | 10-30s | User patience limit |
| API write | 30-60s | Allow for processing |
| File upload | 120s+ | Large file handling |
| Health check | 5s | Quick verification |
| Database query | 30s | Prevent long locks |
| External API | 10s | Limit third-party impact |

---

## 5. State Recovery & Persistence

### Detection Commands
```bash
# Check for localStorage usage
echo "=== Local Storage Usage ==="
grep -rn "localStorage\|sessionStorage" --include="*.ts" --include="*.tsx"

# Find state persistence patterns
echo -e "\n=== State Persistence ==="
grep -rn "persist\|hydrate\|rehydrate\|saveState" --include="*.ts" --include="*.tsx"

# Check for form state recovery
echo -e "\n=== Form State ==="
grep -rn "useForm\|formState\|dirty\|unsaved" --include="*.tsx"

# Find IndexedDB usage
echo -e "\n=== IndexedDB ==="
grep -rn "indexedDB\|IDBDatabase\|Dexie" --include="*.ts" --include="*.tsx"
```

### State Recovery Patterns

```typescript
// ✅ Persisted state hook
function usePersistedState<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setPersistedState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const newValue = value instanceof Function ? value(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(newValue));
        } catch (error) {
          console.error('Failed to persist state:', error);
        }
        return newValue;
      });
    },
    [key]
  );

  return [state, setPersistedState];
}

// ✅ Form state recovery
function EditForm({ id }: Props) {
  const draftKey = `form-draft-${id}`;
  const [formData, setFormData] = usePersistedState(draftKey, {
    title: '',
    content: '',
  });
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    const draft = localStorage.getItem(draftKey);
    if (draft) {
      setHasDraft(true);
    }
  }, [draftKey]);

  const handleSubmit = async () => {
    await saveForm(formData);
    localStorage.removeItem(draftKey); // Clear draft on success
  };

  const discardDraft = () => {
    localStorage.removeItem(draftKey);
    setFormData({ title: '', content: '' });
    setHasDraft(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      {hasDraft && (
        <DraftNotice>
          <p>Recovered unsaved changes</p>
          <button type="button" onClick={discardDraft}>Discard</button>
        </DraftNotice>
      )}
      {/* Form fields */}
    </form>
  );
}

// ✅ App state hydration
function AppStateProvider({ children }: PropsWithChildren) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Hydrate from storage
    const savedState = localStorage.getItem('app-state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        // Restore state...
      } catch {
        // Invalid state, start fresh
      }
    }
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
```

---

## 6. Health Monitoring & Self-Healing

### Detection Commands
```bash
# Check for health monitoring
echo "=== Health Monitoring ==="
grep -rn "health\|heartbeat\|ping\|alive" --include="*.ts" --include="*.tsx"

# Find auto-reconnection logic
echo -e "\n=== Reconnection Logic ==="
grep -rn "reconnect\|resubscribe\|connection.*lost" --include="*.ts" --include="*.tsx"

# Check for WebSocket handling
echo -e "\n=== WebSocket Management ==="
grep -rn "WebSocket\|ws\.\|socket\." --include="*.ts" --include="*.tsx"
```

### Self-Healing Connection Pattern

```typescript
// ✅ Resilient WebSocket connection
class ResilientConnection {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(
    private url: string,
    private onMessage: (data: unknown) => void,
    private onStatusChange: (connected: boolean) => void
  ) {
    this.connect();
  }

  private connect(): void {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.onStatusChange(true);
        logger.info('WebSocket connected');
      };

      this.ws.onmessage = (event) => {
        this.onMessage(JSON.parse(event.data));
      };

      this.ws.onclose = () => {
        this.onStatusChange(false);
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        logger.error('WebSocket error', error);
      };
    } catch (error) {
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    logger.info(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, Math.min(delay, 30000));
  }

  disconnect(): void {
    this.maxReconnectAttempts = 0; // Prevent reconnection
    this.ws?.close();
  }
}
```

---

## Enterprise Readiness Checklist

### Reliability & Resilience Scorecard

| Criterion | Weight | Status |
|-----------|--------|--------|
| Error boundaries at app/route level | 15% | ☐ |
| Error boundaries report to tracking | 10% | ☐ |
| Retry logic for network requests | 15% | ☐ |
| Request timeouts configured | 10% | ☐ |
| AbortController for cancelable requests | 10% | ☐ |
| Graceful degradation for features | 10% | ☐ |
| Loading states for async operations | 10% | ☐ |
| Form state recovery | 5% | ☐ |
| Connection resilience | 10% | ☐ |
| Offline awareness | 5% | ☐ |

**Minimum Score for Deployment: 80%**
