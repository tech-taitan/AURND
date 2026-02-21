---
name: security-audit
description: Conducts comprehensive security and code health checks on a codebase and generates a detailed pre-deployment report. Use this skill when preparing for production deployment, performing security reviews, or assessing code quality. Invoke with /security-audit or when asked to review security, audit code, or generate a pre-deployment report.
---

# Security & Code Health Audit

Perform a comprehensive security audit and code health assessment, generating a detailed pre-deployment report with actionable findings and ratings.

## Skill Structure

This skill uses modular files for efficient loading:

```
security-audit/
├── SKILL.md                    # This file (entry point, Level 2 checklist)
├── checks/                     # Level 3 deep checks (load on-demand)
│   ├── 01-authentication.md
│   ├── 02-authorization.md
│   ├── 03-input-validation.md
│   ├── 04-api-security.md
│   ├── 05-data-protection.md
│   ├── 06-ai-llm-security.md
│   ├── 07-error-handling.md
│   ├── 08-transport-security.md
│   ├── 09-dependencies.md
│   └── 10-code-quality.md
└── templates/
    └── report-template.md      # Report structure
```

**Usage:** For each category with findings, read the corresponding `checks/*.md` file for detailed verification commands, severity criteria, and secure implementation examples.

---

## Audit Process

### Phase 1: Codebase Discovery

First, explore the codebase to understand:
1. **Technology Stack** - Identify frameworks, languages, databases, and third-party services
2. **Architecture** - Map out frontend, backend, API layers, and data flow
3. **Entry Points** - Locate all user input points, API endpoints, and external integrations
4. **Sensitive Areas** - Find authentication, authorization, payment, and data handling code

Use the Explore agent to search for:
- Authentication/authorization patterns (`auth`, `login`, `session`, `token`, `jwt`)
- Database operations (`query`, `sql`, `orm`, `prisma`, `mongoose`)
- API endpoints (`router`, `endpoint`, `controller`, `handler`)
- Input handling (`form`, `input`, `body`, `params`, `request`)
- Environment/secrets (`env`, `config`, `secret`, `key`, `password`)
- File operations (`upload`, `file`, `fs`, `path`)

### Phase 2: Security Assessment

Evaluate each security category using the checklist below. For each sub-factor:
1. Search for relevant code patterns
2. Identify specific vulnerabilities with file paths and line numbers
3. Assess severity and assign a rating (1-5)
4. Document evidence
5. **For findings, read the corresponding `checks/*.md` file for Level 3 deep analysis**

### Phase 3: Report Generation

Generate a structured report using `templates/report-template.md` with:
- Executive summary
- Detailed findings by category
- Ratings table
- Prioritized remediation recommendations
- Critical files list

---

## Security Checklist (Level 2)

### 1. AUTHENTICATION & SESSION MANAGEMENT
*Deep checks: `checks/01-authentication.md`*

| Sub-Factor | What to Check |
|------------|---------------|
| 1.1 Credential Handling | Password hashing (bcrypt/argon2), no plaintext storage, secure transmission |
| 1.2 Session Management | Secure token generation, httpOnly cookies, proper expiration |
| 1.3 Token Validation | JWT signature verification, expiry checks, refresh token rotation |
| 1.4 Password Policy | Minimum length, complexity requirements, breach detection |
| 1.5 MFA Implementation | Second factor availability, backup codes, recovery flow |
| 1.6 Account Recovery | Secure reset tokens, rate limiting, no user enumeration |

**Search Patterns:**
```
signIn, signUp, login, logout, session, token, jwt, password, hash, bcrypt, argon
cookie, authenticate, authorize, credential, oauth, saml, oidc
```

---

### 2. AUTHORIZATION & ACCESS CONTROL
*Deep checks: `checks/02-authorization.md`*

| Sub-Factor | What to Check |
|------------|---------------|
| 2.1 Role-Based Access | Proper role definitions, principle of least privilege |
| 2.2 Resource Authorization | Ownership checks, IDOR prevention, permission validation |
| 2.3 API Authorization | Endpoint protection, scope validation, API key security |
| 2.4 Row-Level Security | Database policies, tenant isolation, data boundaries |
| 2.5 Privilege Escalation | Admin function protection, role manipulation prevention |

**Search Patterns:**
```
role, permission, admin, authorize, policy, guard, middleware, isAdmin, canAccess
owner, belongsTo, hasPermission, checkAuth, requireAuth, protected
```

---

### 3. INPUT VALIDATION & SANITIZATION
*Deep checks: `checks/03-input-validation.md`*

| Sub-Factor | What to Check |
|------------|---------------|
| 3.1 Input Validation | Schema validation (Zod/Yup/Joi), type checking, length limits |
| 3.2 SQL Injection | Parameterized queries, ORM usage, no string concatenation |
| 3.3 XSS Prevention | Output encoding, DOMPurify, CSP headers, no innerHTML |
| 3.4 Command Injection | No shell execution with user input, argument escaping |
| 3.5 Path Traversal | Path validation, no user-controlled file paths |
| 3.6 URL Validation | Protocol allowlist, SSRF prevention, redirect validation |

**Search Patterns:**
```
dangerouslySetInnerHTML, innerHTML, eval, exec, spawn, shell
sanitize, escape, validate, parse, schema, zod, yup, joi
query, sql, where, find, filter, params, body, request
```

---

### 4. API SECURITY
*Deep checks: `checks/04-api-security.md`*

| Sub-Factor | What to Check |
|------------|---------------|
| 4.1 Rate Limiting | Request throttling, brute force protection, DDoS mitigation |
| 4.2 Request Validation | Schema validation, content-type enforcement, size limits |
| 4.3 Response Security | No sensitive data in responses, proper error messages |
| 4.4 CORS Configuration | Specific origin allowlist, no wildcard in production |
| 4.5 API Versioning | Deprecation handling, backward compatibility |

**Search Patterns:**
```
rateLimit, throttle, cors, origin, header, content-type
response, json, error, status, middleware, validator
```

---

### 5. DATA PROTECTION
*Deep checks: `checks/05-data-protection.md`*

| Sub-Factor | What to Check |
|------------|---------------|
| 5.1 Secrets Management | No hardcoded secrets, environment variables, secret rotation |
| 5.2 Encryption at Rest | Database encryption, file encryption, key management |
| 5.3 Encryption in Transit | HTTPS enforcement, TLS configuration, certificate pinning |
| 5.4 PII Handling | Data minimization, anonymization, GDPR compliance |
| 5.5 Logging Security | No sensitive data in logs, log rotation, access controls |

**Search Patterns:**
```
password, secret, key, token, api_key, private, credential
encrypt, decrypt, hash, salt, crypto, bcrypt, aes
log, console, debug, print, trace, logger
.env, process.env, config, settings
```

---

### 6. AI/LLM SECURITY (If Applicable)
*Deep checks: `checks/06-ai-llm-security.md`*

| Sub-Factor | What to Check |
|------------|---------------|
| 6.1 Prompt Injection | Input sanitization, delimiter patterns, system prompt protection |
| 6.2 Output Validation | Response sanitization, content filtering, hallucination handling |
| 6.3 Cost Controls | Token limits, rate limiting, usage monitoring |
| 6.4 Data Leakage | No sensitive data in prompts, context isolation |

**Search Patterns:**
```
prompt, llm, openai, anthropic, gemini, gpt, claude, ai
completion, chat, generate, model, token, embedding
```

---

### 7. ERROR HANDLING & INFORMATION DISCLOSURE
*Deep checks: `checks/07-error-handling.md`*

| Sub-Factor | What to Check |
|------------|---------------|
| 7.1 Error Messages | Generic user-facing errors, detailed server-side logging |
| 7.2 Stack Traces | No production stack traces, error boundary implementation |
| 7.3 Debug Information | No debug endpoints in production, feature flags |
| 7.4 Version Disclosure | No framework/server version headers |

**Search Patterns:**
```
catch, error, throw, exception, try, finally
stack, trace, debug, verbose, development, NODE_ENV
```

---

### 8. TRANSPORT & NETWORK SECURITY
*Deep checks: `checks/08-transport-security.md`*

| Sub-Factor | What to Check |
|------------|---------------|
| 8.1 HTTPS Enforcement | HSTS headers, secure redirects, no mixed content |
| 8.2 Security Headers | CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| 8.3 Cookie Security | Secure, HttpOnly, SameSite attributes |
| 8.4 WebSocket Security | WSS protocol, origin validation, message validation |

**Search Patterns:**
```
header, csp, content-security-policy, x-frame, referrer
cookie, secure, httponly, samesite, cors
websocket, ws, wss, socket
```

---

### 9. DEPENDENCY & SUPPLY CHAIN SECURITY
*Deep checks: `checks/09-dependencies.md`*

| Sub-Factor | What to Check |
|------------|---------------|
| 9.1 Vulnerable Dependencies | npm audit, Snyk, Dependabot alerts |
| 9.2 Dependency Pinning | Lock files, exact versions, integrity hashes |
| 9.3 Third-Party Scripts | SRI hashes, CDN security, vendor review |
| 9.4 Build Security | CI/CD secrets, artifact integrity, reproducible builds |

**Search Patterns:**
```
package.json, package-lock.json, yarn.lock, pnpm-lock.yaml
script src, cdn, unpkg, jsdelivr, cloudflare
```

---

### 10. CODE QUALITY & HEALTH
*Deep checks: `checks/10-code-quality.md`*

| Sub-Factor | What to Check |
|------------|---------------|
| 10.1 Type Safety | TypeScript strict mode, no `any` abuse, null checks |
| 10.2 Error Boundaries | React error boundaries, global error handlers |
| 10.3 Test Coverage | Unit tests, integration tests, security tests |
| 10.4 Code Complexity | Cyclomatic complexity, function length, file size |
| 10.5 Dead Code | Unused exports, unreachable code, commented blocks |

**Search Patterns:**
```
any, @ts-ignore, @ts-nocheck, eslint-disable
test, spec, jest, vitest, mocha, cypress
TODO, FIXME, HACK, XXX, deprecated
```

---

## Rating Scale

| Rating | Level | Description |
|--------|-------|-------------|
| 5/5 | Excellent | Industry best practices, defense in depth |
| 4/5 | Good | Solid implementation, minor improvements possible |
| 3/5 | Adequate | Meets minimum requirements, gaps present |
| 2/5 | Needs Improvement | Significant issues requiring attention |
| 1/5 | Critical | Serious vulnerabilities, immediate action required |
| N/A | Not Applicable | Category not relevant to this codebase |

---

## Guidelines

1. **Be Thorough** - Check every category even if it seems unlikely to have issues
2. **Provide Evidence** - Always include file paths and line numbers for findings
3. **Be Actionable** - Every finding should have a clear remediation path
4. **Prioritize Correctly** - P0 issues genuinely block deployment; don't over-escalate
5. **Consider Context** - A portfolio site has different needs than a banking app
6. **Check Dependencies** - Run `npm audit` or equivalent and include findings
7. **Test Assumptions** - Verify security measures actually work, don't assume
8. **Document Positives** - Note good security practices to reinforce them
9. **Load Deep Checks** - Read `checks/*.md` files for categories with findings

---

## Example Invocations

- `/security-audit` - Full security and code health audit
- `/security-audit --focus auth` - Focus on authentication/authorization
- `/security-audit --quick` - Quick scan of critical issues only
- "Review security before deployment"
- "Generate a pre-deployment report"
- "Audit this codebase for vulnerabilities"
- "Check code health and security"
