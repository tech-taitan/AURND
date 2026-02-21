# Data Protection - Deep Checks

> Level 3 deep checks for security audit category 5.

## 5.1.a Secrets Detection Commands

```bash
# High-confidence secret patterns
grep -rn "sk_live_\|sk_test_\|pk_live_\|pk_test_" --include="*.ts" --include="*.tsx"  # Stripe
grep -rn "AKIA[0-9A-Z]{16}" --include="*.ts"  # AWS Access Key
grep -rn "ghp_[a-zA-Z0-9]{36}\|github_pat_" --include="*.ts"  # GitHub PAT
grep -rn "xox[baprs]-[a-zA-Z0-9-]+" --include="*.ts"  # Slack tokens
grep -rn "eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\." --include="*.ts"  # JWT (may be test)

# Generic secret patterns
grep -rn "password\s*[:=]\s*['\"][^'\"]+['\"]" --include="*.ts" | grep -v "\.env\|process\.env\|test\|mock"
grep -rn "api[_-]?key\s*[:=]\s*['\"][^'\"]+['\"]" --include="*.ts" --include="*.tsx"
grep -rn "secret\s*[:=]\s*['\"][^'\"]+['\"]" --include="*.ts"
```

| Secret Type | Pattern | Severity |
|-------------|---------|----------|
| Production API key | Hardcoded in source | P0 |
| Database password | In code or committed .env | P0 |
| JWT secret | < 32 chars or hardcoded | P0 |
| Test/mock credentials | Clearly marked as test | P3 |
| Private key file | .pem, .key in repo | P0 |

---

## 5.1.b Environment Variable Audit

```bash
# Check .env files not in .gitignore
git ls-files | grep -E "\.env$|\.env\.(local|production|development)$"

# Find direct secret usage without env vars
grep -rn "SUPABASE_SERVICE_ROLE\|OPENAI_API_KEY\|GEMINI_API_KEY" --include="*.ts" | grep -v "process\.env"

# Check for hardcoded test values that should use auth
grep -rn "DEFAULT_.*ID.*=.*['\"]test-\|TEST_.*ID.*=.*['\"]" --include="*.ts" --include="*.tsx"
grep -rn "const.*ORG.*ID.*=.*['\"][a-z-]*test" --include="*.ts" --include="*.tsx" -i

# Verify all secrets in code exist in .env.example
# Extract all process.env references
grep -roh "process\.env\.\w\+" --include="*.ts" --include="*.tsx" | sort -u > /tmp/env_used.txt
# Check against .env.example
grep -oh "^\w\+=" .env.example | sed 's/=//' | sort > /tmp/env_defined.txt
comm -23 /tmp/env_used.txt /tmp/env_defined.txt  # Shows missing from .env.example
```

```typescript
// VULNERABLE: Hardcoded secret
const supabase = createClient(url, 'eyJhbGciOiJIUzI1NiIs...');

// VULNERABLE: Hardcoded test values in production code
const DEFAULT_ORG_ID = "test-org-1"  // ✗ Should come from session
const TEST_CLIENT_ID = "demo-client"  // ✗ Hardcoded test data

// SECURE: Environment variable
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// SECURE: Runtime validation
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// SECURE: Get from authenticated session
const orgId = session?.user?.organisationId;
if (!orgId) {
  throw new Error('User must be authenticated');
}
```

### Missing Environment Variables

| Issue | Severity | Detection |
|-------|----------|-----------|
| Secret used in code but missing from .env.example | P0-Critical | Compare process.env usage vs .env.example |
| Hardcoded test IDs in production code | P1-High | `DEFAULT_ORG_ID = "test-"` patterns |
| ENCRYPTION_KEY missing from environment | P0-Critical | Used in code but not in .env files |

---

## 5.2.a Encryption Verification

```bash
# Check for weak crypto usage
grep -rn "crypto\.createCipher\|DES\|RC4\|MD5\|SHA1" --include="*.ts"  # Deprecated/weak
grep -rn "createCipheriv.*aes-128\|aes-192" --include="*.ts"  # Prefer AES-256

# Check for hardcoded salt in key derivation
grep -rn "scrypt.*['\"]salt['\"]" --include="*.ts"  # Static salt defeats purpose
grep -rn "pbkdf2.*['\"]salt['\"]" --include="*.ts"  # Static salt

# Check for silent decryption failures
grep -rn "decrypt.*function\|function.*decrypt" --include="*.ts" -A 10 | grep -E "catch.*\{.*return ['\"]?\}|catch.*return ['\"]"
```

| Algorithm | Status | Replacement |
|-----------|--------|-------------|
| MD5 | ✗ Broken | SHA-256 or better |
| SHA1 | ✗ Weak | SHA-256 or better |
| DES/3DES | ✗ Deprecated | AES-256-GCM |
| AES-CBC | ⚠ Needs HMAC | AES-256-GCM |
| AES-256-GCM | ✓ Recommended | - |

### Key Derivation Issues

| Issue | Severity | Detection |
|-------|----------|-----------|
| Static salt in scrypt/pbkdf2 | P0-Critical | `scryptSync(key, 'salt', 32)` |
| Weak key derivation | P1-High | Using plain password as key |
| Silent decryption failures | P1-High | `catch { return '' }` without logging |

```typescript
// VULNERABLE: Static salt defeats purpose
function getKey(): Buffer {
  return crypto.scryptSync(password, 'salt', 32);  // ✗ Hardcoded salt
}

// SECURE: Per-environment salt or documented static salt
function getKey(): Buffer {
  const salt = process.env.KEY_DERIVATION_SALT || 'default-salt';
  return crypto.scryptSync(password, salt, 32);
  // Note: Static salt is acceptable for key derivation if password is unique per environment
}

// VULNERABLE: Silent failure hides issues
export function decrypt(encryptedText: string): string {
  try {
    // decryption logic
  } catch {
    return '';  // ✗ Silent failure, no logging
  }
}

// SECURE: Log failures for debugging
export function decrypt(encryptedText: string): string {
  try {
    // decryption logic
  } catch (error) {
    logger.error('Decryption failed', error);  // ✓ Logged
    return '';  // Return empty but logged
  }
}
```

---

## 5.4.a PII Detection & Handling

```bash
# Find PII field patterns
grep -rn "ssn\|social.*security\|tax.*id\|passport" --include="*.ts" -i
grep -rn "credit.*card\|card.*number\|cvv\|cvc" --include="*.ts" -i
grep -rn "date.*birth\|dob\|birthday" --include="*.ts" -i
grep -rn "phone.*number\|mobile\|telephone" --include="*.ts" -i
```

### PII Handling Checklist

| Data Type | Storage | Logging | Transmission | Retention |
|-----------|---------|---------|--------------|-----------|
| Email | Encrypted or hashed for lookup | Masked (a***@example.com) | HTTPS only | Delete on request |
| Phone | Encrypted | Last 4 digits only | HTTPS only | Delete on request |
| SSN/Tax ID | Encrypted + access logged | Never log | Avoid if possible | Legal minimum |
| DOB | Plain (low sensitivity) | OK | HTTPS only | Delete on request |
| Address | Encrypted or plain by risk | City/Country only | HTTPS only | Delete on request |

---

## 5.5.a Logging Security Audit

```bash
# Find logging of sensitive data
grep -rn "console\.log\|logger\.\|log\." --include="*.ts" -A 1 | grep -i "password\|token\|secret\|key\|auth\|session\|user"
# Find full request/response logging
grep -rn "log.*req\.body\|log.*res\.body\|JSON\.stringify.*req" --include="*.ts"
```

```typescript
// VULNERABLE: Logging sensitive data
console.log('User login:', { email, password }); // ✗ Password in logs
logger.info('Request:', req.body); // ✗ May contain secrets

// SECURE: Sanitized logging
const sanitize = (obj: any) => {
  const sensitive = ['password', 'token', 'secret', 'key', 'authorization'];
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => 
      [k, sensitive.some(s => k.toLowerCase().includes(s)) ? '[REDACTED]' : v]
    )
  );
};
logger.info('Request:', sanitize(req.body));
```

### Structured Logging Requirements

- [ ] No passwords, tokens, or secrets in logs
- [ ] PII masked or excluded (email: `a***@example.com`)
- [ ] Request IDs for tracing (correlation)
- [ ] Log levels appropriate (no DEBUG in production)
- [ ] Logs don't expose internal paths or stack traces to users

---

## Secure Implementation Examples

### Environment Variable Validation
```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
```

### Secure Encryption
```typescript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

export function encrypt(text: string, key: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

export function decrypt(encrypted: string, key: Buffer): string {
  const [ivHex, tagHex, data] = encrypted.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### Log Sanitization
```typescript
type LogData = Record<string, unknown>;

const SENSITIVE_KEYS = [
  'password', 'token', 'secret', 'key', 'authorization',
  'cookie', 'session', 'apiKey', 'api_key', 'accessToken',
  'refreshToken', 'credit', 'ssn', 'cvv',
];

function sanitizeForLogging(data: LogData): LogData {
  const sanitized: LogData = {};
  
  for (const [key, value] of Object.entries(data)) {
    const isSensitive = SENSITIVE_KEYS.some(
      s => key.toLowerCase().includes(s.toLowerCase())
    );
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value as LogData);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
}
```
