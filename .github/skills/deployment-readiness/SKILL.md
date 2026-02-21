# Enterprise Deployment Readiness Assessment Skill

## Overview
This skill conducts comprehensive deployment readiness assessments for enterprise applications. It evaluates code quality, operational readiness, and best practices required for successful deployment into production environments at commercial scale.

## Trigger Phrases
- `/deployment-readiness`
- "assess deployment readiness"
- "deployment quality check"
- "production readiness review"
- "enterprise deployment assessment"

## Skill Metadata
```yaml
name: deployment-readiness
version: 1.0.0
category: DevOps & Quality Assurance
target_audience: Enterprise IT teams deploying to commercial environments
stack_focus: React, TypeScript, Node.js, Supabase, Vercel, Next.js
complementary_skills:
  - security-audit (for security-specific deep dives)
```

## Assessment Scope

### Relationship to Security Audit
This skill focuses on **operational and code quality** factors. For security-specific assessments:
- Authentication, Authorization → Use `security-audit` skill
- Input validation, API security → Use `security-audit` skill
- This skill covers: maintainability, scalability, observability, reliability, testing

---

## Level 1: Quick Assessment (5 minutes)

Run these commands to get an instant health snapshot:

```bash
# Test coverage check
grep -r "coverage" package.json 2>/dev/null || echo "⚠️ No coverage config"

# TypeScript strict mode
grep -E "\"strict\":\s*true" tsconfig.json 2>/dev/null || echo "⚠️ TypeScript not strict"

# Environment variable usage
grep -rn "process.env\." --include="*.ts" --include="*.tsx" | head -20

# Error boundary presence
grep -rn "ErrorBoundary\|error boundary" --include="*.tsx" | head -10

# Logging implementation
grep -rn "console\.\|logger\." --include="*.ts" --include="*.tsx" | wc -l
```

---

## Level 2: Category Assessment

### Category 1: Code Maintainability
**Focus**: Code structure, documentation, modularity, and technical debt

| Sub-Factor | Description | Search Pattern |
|------------|-------------|----------------|
| Type Safety | TypeScript strict mode and proper typing | `"strict": true`, `any` usage |
| Documentation | JSDoc, README, inline comments | `@param`, `@returns`, `README.md` |
| Code Organization | Separation of concerns, folder structure | Feature-based vs layer-based |
| Naming Conventions | Consistent, descriptive naming | PascalCase, camelCase consistency |
| Dead Code | Unused exports, commented code | `// TODO`, unused imports |
| Cyclomatic Complexity | Function complexity metrics | Functions >50 lines |

**Detection Commands**:
```bash
# Check for 'any' type usage (should be minimal)
grep -rn ": any" --include="*.ts" --include="*.tsx" | wc -l

# Find TODO/FIXME comments
grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.tsx"

# Check for unused imports (basic)
grep -rn "^import.*from" --include="*.ts" --include="*.tsx" | head -20
```

📁 **Level 3 Deep Checks**: [checks/01-code-maintainability.md](checks/01-code-maintainability.md)

---

### Category 2: Scalability & Performance
**Focus**: Application ability to handle growth and perform efficiently

| Sub-Factor | Description | Search Pattern |
|------------|-------------|----------------|
| Caching Strategy | Data caching, memoization | `useMemo`, `useCallback`, cache headers |
| Lazy Loading | Code splitting, dynamic imports | `React.lazy`, `dynamic()` |
| Database Queries | N+1 problems, query optimization | `.select()` patterns, joins |
| Bundle Size | Tree shaking, chunk optimization | Vite config, dynamic imports |
| Image Optimization | Next/Image, WebP, lazy loading | `<img>` vs `<Image>` |
| Memory Management | Cleanup, subscriptions, refs | `useEffect` cleanup, `unsubscribe` |

**Detection Commands**:
```bash
# Check for memoization usage
grep -rn "useMemo\|useCallback\|React.memo" --include="*.tsx" | wc -l

# Find lazy loading
grep -rn "React.lazy\|dynamic(" --include="*.tsx"

# Check for useEffect cleanup
grep -A5 "useEffect" --include="*.tsx" | grep -E "return.*=>|cleanup"
```

📁 **Level 3 Deep Checks**: [checks/02-scalability-performance.md](checks/02-scalability-performance.md)

---

### Category 3: Observability & Monitoring
**Focus**: Application visibility, debugging capability, and operational awareness

| Sub-Factor | Description | Search Pattern |
|------------|-------------|----------------|
| Structured Logging | Log levels, context, format | `logger.info`, `logger.error` |
| Error Tracking | Sentry, error boundaries | `Sentry.captureException` |
| Performance Metrics | Web Vitals, custom metrics | `reportWebVitals`, timing |
| Distributed Tracing | Request correlation, spans | `trace-id`, correlation headers |
| Health Checks | Liveness, readiness probes | `/health`, `/ready` endpoints |
| Alerting Rules | Threshold definitions | Dashboard configs |

**Detection Commands**:
```bash
# Check for Sentry integration
grep -rn "Sentry\|@sentry" --include="*.ts" --include="*.tsx"

# Find logging patterns
grep -rn "logger\.\|console\." --include="*.ts" --include="*.tsx" | head -20

# Check for analytics/metrics
grep -rn "analytics\|metrics\|reportWebVitals" --include="*.ts" --include="*.tsx"
```

📁 **Level 3 Deep Checks**: [checks/03-observability-monitoring.md](checks/03-observability-monitoring.md)

---

### Category 4: Reliability & Resilience
**Focus**: Fault tolerance, graceful degradation, and recovery mechanisms

| Sub-Factor | Description | Search Pattern |
|------------|-------------|----------------|
| Error Boundaries | React error isolation | `ErrorBoundary`, `componentDidCatch` |
| Retry Logic | Exponential backoff, circuit breakers | `retry`, `backoff`, attempts |
| Graceful Degradation | Fallback UI, offline support | `Suspense`, fallback props |
| Timeout Handling | Request timeouts, abort controllers | `AbortController`, `timeout` |
| State Recovery | Persistence, hydration | `localStorage`, `sessionStorage` |
| Health Monitoring | Self-healing, restart policies | Health check endpoints |

**Detection Commands**:
```bash
# Check for error boundaries
grep -rn "ErrorBoundary\|componentDidCatch\|getDerivedStateFromError" --include="*.tsx"

# Find retry implementations
grep -rn "retry\|backoff\|attempt" --include="*.ts" --include="*.tsx"

# Check for AbortController usage
grep -rn "AbortController\|signal.*abort" --include="*.ts" --include="*.tsx"
```

📁 **Level 3 Deep Checks**: [checks/04-reliability-resilience.md](checks/04-reliability-resilience.md)

---

### Category 5: Configuration Management
**Focus**: Environment handling, feature flags, and secrets management

| Sub-Factor | Description | Search Pattern |
|------------|-------------|----------------|
| Environment Variables | Proper env var usage | `process.env`, `import.meta.env` |
| Configuration Validation | Schema validation at startup | Zod schemas, validation |
| Feature Flags | Toggle capabilities | `feature_`, `flag_`, LaunchDarkly |
| Secrets Management | No hardcoded secrets | API keys in code |
| Environment Parity | Dev/staging/prod consistency | Environment-specific configs |
| Runtime Config | Dynamic configuration | Config service patterns |

**Detection Commands**:
```bash
# Check env var usage
grep -rn "process.env\|import.meta.env" --include="*.ts" --include="*.tsx"

# Find hardcoded secrets (CRITICAL)
grep -rn "sk_live\|pk_live\|api[_-]key.*=.*['\"]" --include="*.ts" --include="*.tsx"

# Check for feature flags
grep -rn "feature\|flag\|toggle" --include="*.ts" --include="*.tsx" -i
```

📁 **Level 3 Deep Checks**: [checks/05-configuration-management.md](checks/05-configuration-management.md)

---

### Category 6: Testing Strategy
**Focus**: Test coverage, test types, and quality assurance processes

| Sub-Factor | Description | Search Pattern |
|------------|-------------|----------------|
| Unit Tests | Component/function testing | `.test.ts`, `describe()`, `it()` |
| Integration Tests | API/service testing | Mock services, test containers |
| E2E Tests | User flow testing | Playwright, Cypress |
| Test Coverage | Coverage thresholds | `coverageThreshold` config |
| Mocking Strategy | Consistent mock patterns | `vi.mock`, `jest.mock` |
| Test Data Management | Fixtures, factories | `fixtures/`, factory functions |

**Detection Commands**:
```bash
# Count test files
find . -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" | wc -l

# Check for coverage configuration
grep -rn "coverage\|coverageThreshold" package.json vitest.config.ts

# Find E2E test setup
ls -la tests/ e2e/ playwright/ cypress/ 2>/dev/null
```

📁 **Level 3 Deep Checks**: [checks/06-testing-strategy.md](checks/06-testing-strategy.md)

---

### Category 7: CI/CD Readiness
**Focus**: Build process, deployment automation, and release management

| Sub-Factor | Description | Search Pattern |
|------------|-------------|----------------|
| Build Configuration | Reproducible builds | `vite.config.ts`, build scripts |
| Deployment Pipeline | Automated deployment | `.github/workflows/`, `vercel.json` |
| Environment Promotion | Stage progression | Branch protection, approvals |
| Rollback Capability | Quick rollback mechanism | Deployment history, versioning |
| Artifact Management | Build output handling | Output directory, artifacts |
| Deployment Verification | Post-deploy checks | Smoke tests, health checks |

**Detection Commands**:
```bash
# Check for CI/CD configuration
ls -la .github/workflows/ 2>/dev/null
cat vercel.json 2>/dev/null

# Find build scripts
grep -A10 "\"scripts\"" package.json

# Check for deployment configuration
grep -rn "deploy\|build\|release" package.json
```

📁 **Level 3 Deep Checks**: [checks/07-cicd-readiness.md](checks/07-cicd-readiness.md)

---

### Category 8: API Design & Contracts
**Focus**: API versioning, documentation, and backward compatibility

| Sub-Factor | Description | Search Pattern |
|------------|-------------|----------------|
| API Versioning | Version strategy | `/api/v1/`, version headers |
| Contract Documentation | OpenAPI, TypeScript types | `swagger`, `openapi.yaml` |
| Error Responses | Consistent error format | Error response types |
| Rate Limiting | Client rate limiting | Rate limit headers |
| Backward Compatibility | Breaking change management | Deprecation notices |
| Response Caching | Cache headers, ETags | `Cache-Control`, `ETag` |

**Detection Commands**:
```bash
# Check API structure
ls -la api/ pages/api/ 2>/dev/null

# Find API response patterns
grep -rn "return.*json\|NextResponse\|Response(" --include="*.ts" api/

# Check for error handling in APIs
grep -rn "catch\|error\|throw" --include="*.ts" api/
```

📁 **Level 3 Deep Checks**: [checks/08-api-design.md](checks/08-api-design.md)

---

### Category 9: Database Operations
**Focus**: Migration strategy, indexing, and data integrity

| Sub-Factor | Description | Search Pattern |
|------------|-------------|----------------|
| Migration Strategy | Version-controlled schema | `migrations/`, Supabase migrations |
| Index Optimization | Query performance | CREATE INDEX, query plans |
| Connection Pooling | Connection management | Pool configuration |
| Data Validation | Schema constraints | RLS policies, CHECK constraints |
| Backup Strategy | Recovery point objectives | Backup configuration |
| Query Optimization | N+1 prevention, joins | Select patterns, eager loading |

**Detection Commands**:
```bash
# Check for database schema
cat database.sql 2>/dev/null | head -50

# Find Supabase queries
grep -rn "supabase\.\|from(" --include="*.ts" --include="*.tsx" | head -20

# Check for transaction usage
grep -rn "transaction\|rpc(" --include="*.ts" --include="*.tsx"
```

📁 **Level 3 Deep Checks**: [checks/09-database-operations.md](checks/09-database-operations.md)

---

### Category 10: Compliance & Standards
**Focus**: Coding standards, accessibility, and regulatory requirements

| Sub-Factor | Description | Search Pattern |
|------------|-------------|----------------|
| Linting Configuration | ESLint, Prettier setup | `eslint.config.js`, `.prettierrc` |
| Accessibility (a11y) | WCAG compliance | `aria-`, `role=`, alt text |
| License Compliance | Dependency licenses | `license-checker`, SPDX |
| Code Formatting | Consistent style | Format on save, pre-commit |
| Documentation Standards | README, API docs | Documentation completeness |
| Regulatory Compliance | GDPR, SOC2 considerations | Data handling, audit logs |

**Detection Commands**:
```bash
# Check linting setup
cat eslint.config.js 2>/dev/null | head -30

# Find accessibility attributes
grep -rn "aria-\|role=" --include="*.tsx" | wc -l

# Check for alt text on images
grep -rn "<img\|<Image" --include="*.tsx" | grep -v "alt="
```

📁 **Level 3 Deep Checks**: [checks/10-compliance-standards.md](checks/10-compliance-standards.md)

---

## Assessment Workflow

### Step 1: Initialize Assessment
```markdown
# Deployment Readiness Assessment
**Project**: [Project Name]
**Date**: [Assessment Date]
**Assessor**: Claude AI
**Target Environment**: [Production/Staging]
```

### Step 2: Run Level 1 Quick Assessment
Execute quick commands from Level 1 section above.

### Step 3: Systematic Level 2 Review
For each of the 10 categories:
1. Run detection commands
2. Document findings
3. Assign readiness rating (Ready ✅ | Needs Work ⚠️ | Blocker ❌)

### Step 4: Deep Dive Level 3 (As Needed)
For categories with issues:
1. Load the corresponding `checks/*.md` file
2. Execute detailed detection patterns
3. Review against severity matrix
4. Document specific remediation steps

### Step 5: Generate Report
Use template: [templates/report-template.md](templates/report-template.md)

---

## Readiness Rating Scale

| Rating | Symbol | Meaning | Action Required |
|--------|--------|---------|-----------------|
| Ready | ✅ | Meets enterprise standards | None |
| Acceptable | ⚠️ | Minor improvements needed | Post-deployment |
| Needs Work | 🔶 | Significant gaps exist | Pre-deployment |
| Blocker | ❌ | Critical issues present | Must fix |

---

## Quick Reference Commands

### Full Assessment Script
```bash
echo "=== DEPLOYMENT READINESS QUICK SCAN ==="

echo -e "\n📁 Project Structure:"
ls -la

echo -e "\n📊 Test Coverage:"
grep -r "coverage" package.json 2>/dev/null || echo "No coverage config found"

echo -e "\n🔧 TypeScript Config:"
grep -E "strict|noImplicitAny" tsconfig.json 2>/dev/null

echo -e "\n📝 Environment Variables:"
grep -rn "process.env\|import.meta.env" --include="*.ts" --include="*.tsx" | wc -l

echo -e "\n🛡️ Error Handling:"
grep -rn "ErrorBoundary\|try.*catch" --include="*.ts" --include="*.tsx" | wc -l

echo -e "\n📈 Logging:"
grep -rn "logger\.\|Sentry" --include="*.ts" --include="*.tsx" | wc -l

echo -e "\n🧪 Test Files:"
find . -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | wc -l

echo -e "\n✅ Quick scan complete"
```

---

## Integration with Security Audit

When conducting a full pre-deployment review:

1. **Run this skill first** for operational readiness
2. **Run `/security-audit`** for security-specific checks
3. **Combine reports** into unified deployment decision

Both skills use complementary severity ratings and can cross-reference findings.
