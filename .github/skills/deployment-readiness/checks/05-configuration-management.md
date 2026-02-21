# Level 3: Configuration Management Deep Checks

## Overview
This document provides comprehensive detection patterns and best practices for managing application configuration across environments, including environment variables, feature flags, and secrets management.

---

## 1. Environment Variable Analysis

### Detection Commands
```bash
# Check for environment variable usage
echo "=== Environment Variable Usage ==="
grep -rn "process\.env\|import\.meta\.env" --include="*.ts" --include="*.tsx" | grep -v "node_modules"

# Find env vars without VITE_ prefix (won't be exposed to client)
echo -e "\n=== Server-Only Env Vars Used in Client Code ==="
grep -rn "process\.env\." --include="*.tsx" | grep -v "VITE_\|NEXT_PUBLIC_"

# Check for .env files
echo -e "\n=== Environment Files ==="
ls -la .env* 2>/dev/null

# Find all unique env vars used
echo -e "\n=== All Environment Variables Referenced ==="
grep -roh "process\.env\.\w\+\|import\.meta\.env\.\w\+" --include="*.ts" --include="*.tsx" | sort -u

# Check for env var validation
echo -e "\n=== Env Validation ==="
grep -rn "z\.object\|env\.parse\|validateEnv\|requiredEnv" --include="*.ts"
```

### Environment Variable Best Practices

```typescript
// ✅ Environment validation (config/env.ts)
import { z } from 'zod';

// Define schema for all environment variables
const envSchema = z.object({
  // Required variables
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  
  // Optional with defaults
  VITE_APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  VITE_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  
  // Optional API keys (may not be set in dev)
  VITE_SENTRY_DSN: z.string().optional(),
  VITE_ANALYTICS_ID: z.string().optional(),
});

// Parse and validate at startup
function validateEnv() {
  const parsed = envSchema.safeParse(import.meta.env);
  
  if (!parsed.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(parsed.error.format());
    throw new Error('Invalid environment configuration');
  }
  
  return parsed.data;
}

export const env = validateEnv();

// Type-safe access
export function getEnv<K extends keyof typeof env>(key: K): typeof env[K] {
  return env[key];
}
```

### Environment Variable Naming

| Prefix | Visibility | Use Case |
|--------|------------|----------|
| `VITE_` | Client-exposed | Public API URLs, feature flags |
| `NEXT_PUBLIC_` | Client-exposed (Next.js) | Public configuration |
| (no prefix) | Server-only | Secrets, API keys |
| `PRIVATE_` | Server-only (convention) | Sensitive data |

### Severity Matrix - Env Vars

| Issue | Severity | Detection |
|-------|----------|-----------|
| Secret exposed to client | P0-Critical | Non-prefixed var in .tsx |
| Missing required env var | P0-Critical | App fails to start |
| No env validation | P1-High | No Zod/validation code |
| Hardcoded configuration | P2-Medium | Strings that should be env |
| Missing .env.example | P3-Low | No template for setup |

---

## 2. Feature Flags Implementation

### Detection Commands
```bash
# Check for feature flag patterns
echo "=== Feature Flag Usage ==="
grep -rn "feature\|flag\|toggle\|experiment" --include="*.ts" --include="*.tsx" -i | grep -v "node_modules"

# Find conditional feature rendering
echo -e "\n=== Conditional Features ==="
grep -rn "isEnabled\|isFeature\|showFeature\|canAccess" --include="*.tsx"

# Check for feature flag services
echo -e "\n=== Feature Flag Services ==="
grep -rn "LaunchDarkly\|Unleash\|FlagSmith\|ConfigCat\|Split" --include="*.ts" package.json

# Find feature constants
echo -e "\n=== Feature Constants ==="
grep -rn "FEATURE_\|ENABLE_\|SHOW_" --include="*.ts" --include="*.tsx"
```

### Feature Flag Implementation

```typescript
// ✅ Feature flag service (services/featureFlags.ts)
type FeatureFlag = 
  | 'NEW_DASHBOARD'
  | 'AI_ASSISTANT'
  | 'DARK_MODE'
  | 'BETA_FEATURES';

interface FeatureConfig {
  [key: string]: {
    enabled: boolean;
    rolloutPercentage?: number;
    allowedUsers?: string[];
    startDate?: string;
    endDate?: string;
  };
}

// Configuration (could come from API or env)
const featureConfig: FeatureConfig = {
  NEW_DASHBOARD: {
    enabled: import.meta.env.VITE_FEATURE_NEW_DASHBOARD === 'true',
    rolloutPercentage: 50,
  },
  AI_ASSISTANT: {
    enabled: true,
    allowedUsers: ['admin', 'beta-tester'],
  },
  DARK_MODE: {
    enabled: true,
  },
  BETA_FEATURES: {
    enabled: import.meta.env.VITE_APP_ENV !== 'production',
  },
};

export function isFeatureEnabled(
  feature: FeatureFlag,
  userId?: string
): boolean {
  const config = featureConfig[feature];
  
  if (!config || !config.enabled) {
    return false;
  }
  
  // Check date range
  if (config.startDate && new Date() < new Date(config.startDate)) {
    return false;
  }
  if (config.endDate && new Date() > new Date(config.endDate)) {
    return false;
  }
  
  // Check user allowlist
  if (config.allowedUsers && userId) {
    return config.allowedUsers.includes(userId);
  }
  
  // Check rollout percentage
  if (config.rolloutPercentage !== undefined && userId) {
    const hash = simpleHash(userId + feature);
    return (hash % 100) < config.rolloutPercentage;
  }
  
  return config.enabled;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// ✅ React hook for features
export function useFeature(feature: FeatureFlag): boolean {
  const { user } = useAuth(); // Your auth context
  return useMemo(
    () => isFeatureEnabled(feature, user?.id),
    [feature, user?.id]
  );
}

// ✅ Feature flag component
interface FeatureProps {
  flag: FeatureFlag;
  children: ReactNode;
  fallback?: ReactNode;
}

export function Feature({ flag, children, fallback = null }: FeatureProps) {
  const isEnabled = useFeature(flag);
  return <>{isEnabled ? children : fallback}</>;
}

// ✅ Usage
function Dashboard() {
  return (
    <div>
      <Feature flag="NEW_DASHBOARD">
        <NewDashboard />
      </Feature>
      
      <Feature flag="AI_ASSISTANT" fallback={<ClassicSearch />}>
        <AISearchAssistant />
      </Feature>
    </div>
  );
}
```

---

## 3. Secrets Management

### Detection Commands
```bash
# CRITICAL: Check for hardcoded secrets
echo "=== CRITICAL: Hardcoded Secrets Check ==="
grep -rn "sk_live\|pk_live\|api[_-]key.*=.*['\"][a-zA-Z0-9]" --include="*.ts" --include="*.tsx"
grep -rn "password.*=.*['\"][^'\"]\+['\"]" --include="*.ts" --include="*.tsx"
grep -rn "secret.*=.*['\"][^'\"]\+['\"]" --include="*.ts" --include="*.tsx"
grep -rn "token.*=.*['\"][a-zA-Z0-9]" --include="*.ts" --include="*.tsx"

# Check .gitignore for env files
echo -e "\n=== .gitignore Env Coverage ==="
grep -E "\.env|secret|credential" .gitignore 2>/dev/null

# Find potential secrets in git history
echo -e "\n=== Check if secrets ever committed ==="
git log --oneline --all -S "sk_live" 2>/dev/null | head -5
git log --oneline --all -S "api_key" 2>/dev/null | head -5

# Check for secret management tools
echo -e "\n=== Secret Management Tools ==="
grep -rn "vault\|aws-secrets\|azure-keyvault\|gcp-secret" package.json 2>/dev/null
```

### Secrets Management Best Practices

```typescript
// ❌ NEVER: Hardcoded secrets
const API_KEY = 'sk_live_abc123...'; // CRITICAL VULNERABILITY

// ❌ NEVER: Secrets in client-visible code
const supabaseKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY; // WRONG!

// ✅ CORRECT: Server-side only secrets
// In API route (api/protected.ts)
const serviceKey = process.env.SUPABASE_SERVICE_KEY; // Server-only

// ✅ CORRECT: Secrets management with validation
const secretsSchema = z.object({
  SUPABASE_SERVICE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  DATABASE_URL: z.string().url(),
});

function getSecrets() {
  // Only call from server-side code
  if (typeof window !== 'undefined') {
    throw new Error('Secrets cannot be accessed from client');
  }
  
  return secretsSchema.parse({
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
  });
}
```

### Required .gitignore Entries

```gitignore
# Environment files
.env
.env.local
.env.*.local
.env.production

# Secret files
*.pem
*.key
secrets.json
credentials.json

# IDE settings that may contain paths
.idea/
.vscode/settings.json
```

### Secrets Severity Matrix

| Issue | Severity | Immediate Action |
|-------|----------|------------------|
| API key in source code | P0-Critical | Remove, rotate key, audit logs |
| Secret in git history | P0-Critical | Rotate key, consider rewriting history |
| Missing .gitignore | P1-High | Add before any commits |
| No secret validation | P2-Medium | Add schema validation |
| Secrets in logs | P0-Critical | Scrub logs, add filtering |

---

## 4. Environment Parity

### Detection Commands
```bash
# Check for environment-specific code
echo "=== Environment-Specific Logic ==="
grep -rn "development\|production\|staging" --include="*.ts" --include="*.tsx" | head -30

# Find environment checks
echo -e "\n=== Environment Checks ==="
grep -rn "NODE_ENV\|APP_ENV\|VITE_APP_ENV\|import\.meta\.env\.MODE" --include="*.ts" --include="*.tsx"

# Check for different configs per environment
echo -e "\n=== Config Files ==="
ls -la config/ 2>/dev/null
ls -la .env* 2>/dev/null

# Find mock/stub usage that should differ by env
echo -e "\n=== Mock Usage ==="
grep -rn "mock\|stub\|fake" --include="*.ts" --include="*.tsx" | grep -v "test\|spec" | head -20
```

### Environment Configuration Pattern

```typescript
// ✅ Environment-aware configuration (config/index.ts)
type Environment = 'development' | 'staging' | 'production';

interface Config {
  apiUrl: string;
  sentryDsn: string | null;
  analyticsEnabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  features: {
    debugPanel: boolean;
    mockData: boolean;
  };
}

const configs: Record<Environment, Config> = {
  development: {
    apiUrl: 'http://localhost:3000/api',
    sentryDsn: null,
    analyticsEnabled: false,
    logLevel: 'debug',
    features: {
      debugPanel: true,
      mockData: true,
    },
  },
  staging: {
    apiUrl: 'https://staging-api.example.com',
    sentryDsn: import.meta.env.VITE_SENTRY_DSN ?? null,
    analyticsEnabled: true,
    logLevel: 'info',
    features: {
      debugPanel: true,
      mockData: false,
    },
  },
  production: {
    apiUrl: 'https://api.example.com',
    sentryDsn: import.meta.env.VITE_SENTRY_DSN ?? null,
    analyticsEnabled: true,
    logLevel: 'warn',
    features: {
      debugPanel: false,
      mockData: false,
    },
  },
};

function getEnvironment(): Environment {
  const env = import.meta.env.MODE;
  if (env === 'development' || env === 'staging' || env === 'production') {
    return env;
  }
  return 'development';
}

export const config = configs[getEnvironment()];

// ✅ Usage
if (config.features.debugPanel) {
  // Show debug panel
}
```

### Environment Parity Checklist

| Aspect | Dev | Staging | Production |
|--------|-----|---------|------------|
| Database | Local/Docker | Staging DB | Prod DB |
| External APIs | Mocked/Sandbox | Sandbox | Live |
| Error tracking | Off/Console | On | On |
| Analytics | Off | On | On |
| Feature flags | All enabled | Selective | Selective |
| Logging | Debug | Info | Warn |

---

## 5. Runtime Configuration

### Detection Commands
```bash
# Check for runtime config patterns
echo "=== Runtime Configuration ==="
grep -rn "getConfig\|fetchConfig\|remoteConfig" --include="*.ts" --include="*.tsx"

# Find configuration refresh patterns
echo -e "\n=== Config Refresh ==="
grep -rn "refresh.*config\|config.*refresh\|reload.*config" --include="*.ts"

# Check for A/B testing config
echo -e "\n=== A/B Testing ==="
grep -rn "experiment\|variant\|ab[_-]test" --include="*.ts" --include="*.tsx" -i
```

### Runtime Configuration Implementation

```typescript
// ✅ Runtime configuration service (services/configService.ts)
interface RuntimeConfig {
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  featureFlags: Record<string, boolean>;
  apiRateLimits: {
    requests: number;
    windowMs: number;
  };
  uiConfig: {
    theme: 'light' | 'dark' | 'system';
    maxUploadSizeMb: number;
  };
}

class ConfigService {
  private config: RuntimeConfig | null = null;
  private lastFetch: number = 0;
  private cacheTimeMs = 5 * 60 * 1000; // 5 minutes

  async getConfig(): Promise<RuntimeConfig> {
    const now = Date.now();
    
    if (this.config && (now - this.lastFetch) < this.cacheTimeMs) {
      return this.config;
    }
    
    try {
      const response = await fetch('/api/config');
      if (!response.ok) {
        throw new Error('Failed to fetch config');
      }
      
      this.config = await response.json();
      this.lastFetch = now;
      
      return this.config!;
    } catch (error) {
      // Return cached config if available, or defaults
      if (this.config) {
        return this.config;
      }
      
      return this.getDefaults();
    }
  }

  private getDefaults(): RuntimeConfig {
    return {
      maintenanceMode: false,
      featureFlags: {},
      apiRateLimits: { requests: 100, windowMs: 60000 },
      uiConfig: { theme: 'system', maxUploadSizeMb: 10 },
    };
  }

  async isMaintenanceMode(): Promise<boolean> {
    const config = await this.getConfig();
    return config.maintenanceMode;
  }
}

export const configService = new ConfigService();

// ✅ React hook
export function useRuntimeConfig() {
  const [config, setConfig] = useState<RuntimeConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    configService.getConfig()
      .then(setConfig)
      .finally(() => setLoading(false));
  }, []);

  return { config, loading };
}
```

---

## 6. Configuration Documentation

### Required Configuration Documentation

```markdown
# Environment Configuration

## Required Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key | `eyJ...` |
| `VITE_SENTRY_DSN` | No | Sentry error tracking | `https://xxx@sentry.io/xxx` |

## Setup Instructions

1. Copy `.env.example` to `.env.local`
2. Fill in required values
3. Run `npm run validate-env` to verify

## Environment-Specific Notes

### Development
- Uses local Supabase or Docker
- Sentry disabled by default
- Debug logging enabled

### Production
- Requires all environment variables
- Sentry must be configured
- Feature flags controlled remotely
```

---

## Enterprise Readiness Checklist

### Configuration Management Scorecard

| Criterion | Weight | Status |
|-----------|--------|--------|
| Environment validation at startup | 15% | ☐ |
| No hardcoded secrets | 20% | ☐ |
| .gitignore covers all env files | 10% | ☐ |
| .env.example provided | 10% | ☐ |
| Feature flags implemented | 10% | ☐ |
| Server/client env separation | 15% | ☐ |
| Configuration documentation | 10% | ☐ |
| Environment parity defined | 5% | ☐ |
| Secret rotation process | 5% | ☐ |

**Minimum Score for Deployment: 85%**
