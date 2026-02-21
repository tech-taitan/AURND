# Pre-Deployment Security & Code Health Report

## Executive Summary

- **Application:** [Name and brief description]
- **Technology Stack:** [Languages, frameworks, databases]
- **Audit Date:** [Date]
- **Overall Security Rating:** [X.X/5]
- **Overall Code Health Rating:** [X.X/5]
- **Critical Issues:** [Count]
- **Deployment Recommendation:** [APPROVED / APPROVED WITH CONDITIONS / NOT RECOMMENDED]

---

## Security Assessment

### [Category Name]
**Category Rating: X.X/5 (STATUS)**

| Sub-Factor | Rating | Status | Finding |
|------------|--------|--------|---------|
| X.X Name | X/5 | STATUS | Brief finding description |

**Evidence:**
- `file.ts:123` - Code snippet or description

**Recommendations:**
- Specific remediation steps

[Repeat for each category]

---

## Final Ratings Summary

| Category | Rating | Status |
|----------|--------|--------|
| 1. Authentication & Session | X.X/5 | STATUS |
| 2. Authorization & Access Control | X.X/5 | STATUS |
| 3. Input Validation & Sanitization | X.X/5 | STATUS |
| 4. API Security | X.X/5 | STATUS |
| 5. Data Protection | X.X/5 | STATUS |
| 6. AI/LLM Security | X.X/5 | STATUS |
| 7. Error Handling | X.X/5 | STATUS |
| 8. Transport & Network Security | X.X/5 | STATUS |
| 9. Dependency & Supply Chain | X.X/5 | STATUS |
| 10. Code Quality & Health | X.X/5 | STATUS |
| **OVERALL** | **X.X/5** | **STATUS** |

---

## Prioritized Remediation

### P0 - Critical (Block Deployment)
1. [Issue] - [File] - [Brief fix description]

### P1 - High (Fix Within 1 Week)
1. [Issue] - [File] - [Brief fix description]

### P2 - Medium (Fix Within 1 Month)
1. [Issue] - [File] - [Brief fix description]

### P3 - Low (Fix When Possible)
1. [Issue] - [File] - [Brief fix description]

---

## Deployment Checklist

- [ ] All P0 issues resolved
- [ ] Environment variables configured
- [ ] Secrets rotated from development
- [ ] Error monitoring enabled (Sentry/etc.)
- [ ] Logging configured (no sensitive data)
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Database backups configured
- [ ] Dependency audit clean

---

## Files Requiring Attention

| File | Priority | Issues |
|------|----------|--------|
| `path/to/file.ts` | P0 | Brief description |

---

## Rating Scale Reference

| Rating | Level | Description |
|--------|-------|-------------|
| 5/5 | Excellent | Industry best practices, defense in depth |
| 4/5 | Good | Solid implementation, minor improvements possible |
| 3/5 | Adequate | Meets minimum requirements, gaps present |
| 2/5 | Needs Improvement | Significant issues requiring attention |
| 1/5 | Critical | Serious vulnerabilities, immediate action required |
| N/A | Not Applicable | Category not relevant to this codebase |
