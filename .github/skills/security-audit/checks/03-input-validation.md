# Input Validation & Sanitization - Deep Checks

> Level 3 deep checks for security audit category 3.

## 3.1.a Schema Validation Audit

```bash
# Find unvalidated request handlers
grep -rn "req\.body\|req\.query\|req\.params" --include="*.ts" -B 2 -A 5 | grep -v "validate\|schema\|zod\|parse"
# Find any type assertions on input
grep -rn "as \w\+\|<\w\+>req\." --include="*.ts"
```

| Validation Library | Secure Pattern | Insecure Pattern |
|--------------------|----------------|------------------|
| Zod | `schema.parse(req.body)` | `req.body as UserInput` |
| Yup | `schema.validateSync(data)` | Direct property access |
| Joi | `schema.validate(data)` | No validation |

```typescript
// SECURE: Fail-fast validation
const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(50000),
  tags: z.array(z.string()).max(10).optional(),
});

export async function createPost(req: Request) {
  const input = CreatePostSchema.parse(req.body); // Throws on invalid
  // ... safe to use input
}
```

---

## 3.2.a SQL Injection Detection

| ORM/Driver | Vulnerable Pattern | Secure Pattern |
|------------|-------------------|----------------|
| Raw SQL | `` `SELECT * FROM users WHERE id = ${id}` `` | `SELECT * FROM users WHERE id = $1`, [id] |
| Prisma | `prisma.$queryRawUnsafe(userInput)` | `prisma.$queryRaw\`...\`` with tagged template |
| Supabase | `.or(userControlledString)` | `.or('id.eq.1,id.eq.2')` with validation |
| Drizzle | `sql.raw(userInput)` | `sql\`${param}\`` with automatic escaping |

```bash
# Detect SQL injection vectors
grep -rn "\$queryRawUnsafe\|\.raw(\|sql\s*+" --include="*.ts"
grep -rn "SELECT.*\${.*}\|INSERT.*\${.*}\|UPDATE.*\${.*}\|DELETE.*\${.*}" --include="*.ts"
```

### Supabase-Specific SQL Injection

```typescript
// VULNERABLE: User input in .or() filter
const { data } = await supabase
  .from('posts')
  .select()
  .or(req.query.filter); // ✗ Injection possible

// SECURE: Validated filter construction
const allowedFilters = ['published.eq.true', 'draft.eq.true'];
const filter = allowedFilters.includes(req.query.filter) 
  ? req.query.filter 
  : 'published.eq.true';
```

---

## 3.3.a XSS Prevention Matrix

| Context | Vulnerable | Secure | Severity |
|---------|-----------|--------|----------|
| React JSX | `dangerouslySetInnerHTML={{__html: userInput}}` | `{userInput}` (auto-escaped) | P0 |
| URL href | `<a href={userUrl}>` | Validate protocol allowlist | P1 |
| Event handler | `onClick={eval(userInput)}` | Never use eval | P0 |
| Style attribute | `style={{background: userInput}}` | Sanitize CSS values | P2 |
| Script context | `<script>var x = '${input}'</script>` | JSON.stringify + escape | P0 |

```bash
# Find XSS vectors
grep -rn "dangerouslySetInnerHTML\|innerHTML\|outerHTML" --include="*.tsx" --include="*.ts"
grep -rn "eval(\|new Function(\|setTimeout.*userInput" --include="*.ts"
grep -rn "document\.write\|document\.writeln" --include="*.ts"
```

### DOMPurify Configuration

```typescript
// SECURE: Strict DOMPurify config
import DOMPurify from 'dompurify';

const sanitized = DOMPurify.sanitize(userHtml, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
  ALLOWED_ATTR: ['href', 'title'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
});
```

---

## 3.4.a Command Injection Detection

```bash
# Find shell execution with potential user input
grep -rn "exec(\|execSync(\|spawn(\|spawnSync(\|child_process" --include="*.ts" -A 3
grep -rn "shell:\s*true" --include="*.ts"
```

| Severity | Pattern |
|----------|---------|
| P0 | `exec(\`command ${userInput}\`)` |
| P0 | `spawn('sh', ['-c', userCommand])` |
| P1 | `spawn(cmd, args, { shell: true })` with any user data |
| P2 | Hardcoded commands without user input but shell: true |

---

## 3.5.a Path Traversal Prevention

```typescript
// VULNERABLE
const filePath = path.join('/uploads', req.params.filename);
fs.readFile(filePath); // ✗ ../../../etc/passwd possible

// SECURE
const safeName = path.basename(req.params.filename); // Strip path components
const filePath = path.join('/uploads', safeName);
if (!filePath.startsWith('/uploads/')) throw new Error('Invalid path');
```

```bash
# Find path traversal vectors
grep -rn "path\.join.*req\.\|path\.resolve.*req\.\|fs\..*req\." --include="*.ts"
grep -rn "readFile\|writeFile\|unlink\|readdir" --include="*.ts" -A 2 | grep "req\.\|params\.\|query\."
```

---

## 3.6.a SSRF & URL Validation

```typescript
// VULNERABLE: Open redirect / SSRF
const url = req.query.redirect;
res.redirect(url); // ✗ Can redirect to attacker domain

fetch(req.body.webhookUrl); // ✗ SSRF to internal services

// SECURE: Protocol and domain allowlist
const ALLOWED_HOSTS = ['api.example.com', 'cdn.example.com'];
const url = new URL(req.body.webhookUrl);
if (!['https:'].includes(url.protocol)) throw new Error('HTTPS only');
if (!ALLOWED_HOSTS.includes(url.hostname)) throw new Error('Host not allowed');
// Also block internal IPs: 127.0.0.1, 10.x.x.x, 192.168.x.x, 169.254.x.x
```

### Internal IP Blocklist

```typescript
function isInternalIP(hostname: string): boolean {
  const ip = hostname;
  const internalPatterns = [
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^0\./,
    /^localhost$/i,
  ];
  return internalPatterns.some(pattern => pattern.test(ip));
}
```

---

## Secure Implementation Examples

### Input Validation with Zod
```typescript
import { z } from 'zod';

const UserInputSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100).regex(/^[a-zA-Z\s'-]+$/),
  age: z.number().int().min(0).max(150).optional(),
  website: z.string().url().startsWith('https://').optional(),
});

type UserInput = z.infer<typeof UserInputSchema>;

function validateInput(data: unknown): UserInput {
  return UserInputSchema.parse(data);
}
```

### Safe URL Validation
```typescript
function validateRedirectUrl(url: string, allowedDomains: string[]): string {
  try {
    const parsed = new URL(url);
    
    // Only allow HTTPS
    if (parsed.protocol !== 'https:') {
      throw new Error('Only HTTPS URLs allowed');
    }
    
    // Check against allowlist
    if (!allowedDomains.includes(parsed.hostname)) {
      throw new Error('Domain not allowed');
    }
    
    // Block internal IPs
    if (isInternalIP(parsed.hostname)) {
      throw new Error('Internal addresses not allowed');
    }
    
    return parsed.toString();
  } catch {
    throw new Error('Invalid URL');
  }
}
```
