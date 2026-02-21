# Security Audit Skill

A comprehensive security and code health audit skill for Claude AI that conducts thorough security assessments and generates detailed pre-deployment reports with actionable findings.

## Overview

This skill performs systematic security audits of codebases, identifying vulnerabilities, misconfigurations, and code quality issues. It provides structured assessments across 10 security categories with clear severity ratings and remediation guidance.

## Features

- **Three-Phase Audit Process**: Discovery, assessment, and report generation
- **10 Security Categories**: Comprehensive coverage of security concerns
- **Severity-Based Prioritization**: P0-Critical through P3-Low findings
- **Actionable Reports**: Specific remediation steps with file paths and line numbers
- **Defense in Depth Evaluation**: Industry best practices assessment

## Quick Start

Invoke this skill using any of these trigger phrases:

```
/security-audit
```

Or ask naturally:
- "Review security before deployment"
- "Generate a pre-deployment report"
- "Audit this codebase for vulnerabilities"
- "Check code health and security"

### Focused Audits

```
/security-audit --focus auth    # Focus on authentication/authorization
/security-audit --quick         # Quick scan of critical issues only
```

## Security Categories

| # | Category | Focus Area |
|---|----------|------------|
| 1 | **Authentication & Session Management** | Credential handling, tokens, MFA, account recovery |
| 2 | **Authorization & Access Control** | RBAC, IDOR prevention, row-level security |
| 3 | **Input Validation & Sanitization** | XSS, SQL injection, command injection, path traversal |
| 4 | **API Security** | Rate limiting, CORS, request validation |
| 5 | **Data Protection** | Secrets management, encryption, PII handling |
| 6 | **AI/LLM Security** | Prompt injection, output validation, cost controls |
| 7 | **Error Handling & Information Disclosure** | Error messages, stack traces, debug endpoints |
| 8 | **Transport & Network Security** | HTTPS, security headers, cookie security |
| 9 | **Dependency & Supply Chain Security** | Vulnerable packages, dependency pinning |
| 10 | **Code Quality & Health** | Type safety, test coverage, error boundaries |

## File Structure

```
security-audit/
├── README.md                   # This file
├── SKILL.md                    # Main skill instructions for Claude
├── checks/                     # Level 3 deep-dive security checks
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
    └── report-template.md      # Report structure template
```

## Audit Process

### Phase 1: Codebase Discovery
- Identify technology stack (frameworks, languages, databases)
- Map architecture (frontend, backend, API layers)
- Locate entry points (user inputs, API endpoints)
- Find sensitive areas (auth, payments, data handling)

### Phase 2: Security Assessment
For each of the 10 categories:
1. Search for relevant code patterns
2. Identify vulnerabilities with file paths and line numbers
3. Assess severity and assign rating (1-5)
4. Document evidence
5. Deep-dive using `checks/*.md` files as needed

### Phase 3: Report Generation
Generate structured report including:
- Executive summary with deployment recommendation
- Detailed findings by category
- Ratings table
- Prioritized remediation recommendations
- Critical files list

## Rating Scale

| Rating | Level | Description |
|--------|-------|-------------|
| 5/5 | Excellent | Industry best practices, defense in depth |
| 4/5 | Good | Solid implementation, minor improvements possible |
| 3/5 | Adequate | Meets minimum requirements, gaps present |
| 2/5 | Needs Improvement | Significant issues requiring attention |
| 1/5 | Critical | Serious vulnerabilities, immediate action required |
| N/A | Not Applicable | Category not relevant to this codebase |

## Priority Levels

| Priority | Severity | Action Required |
|----------|----------|-----------------|
| **P0** | Critical | Blocks deployment - must fix immediately |
| **P1** | High | Fix within 1 week |
| **P2** | Medium | Fix within 1 month |
| **P3** | Low | Fix when possible |

## Output

The skill generates a comprehensive security report including:

1. **Executive Summary**: Overall ratings and deployment recommendation
2. **Security Assessment**: Detailed findings by category with evidence
3. **Final Ratings Summary**: Scores for all 10 categories
4. **Prioritized Remediation**: Action items sorted by severity
5. **Deployment Checklist**: Pre-deployment verification items
6. **Files Requiring Attention**: Prioritized list of files to fix

### Deployment Recommendations

- **APPROVED**: No critical issues, ready for production
- **APPROVED WITH CONDITIONS**: Minor issues to address post-deployment
- **NOT RECOMMENDED**: Critical issues must be resolved first

## Integration with Deployment Readiness

This skill focuses on **security-specific** assessments. For operational readiness, use the complementary `deployment-readiness` skill:

| This Skill Covers | Deployment Readiness Covers |
|-------------------|----------------------------|
| Authentication | Code maintainability |
| Authorization | Scalability & performance |
| Input validation | Observability & monitoring |
| API security | Reliability & resilience |
| Data protection | Testing strategy |
| Secrets exposure | CI/CD readiness |

**Recommended workflow for full pre-deployment review:**
1. Run `/deployment-readiness` for operational readiness
2. Run `/security-audit` for security-specific checks
3. Combine reports into unified deployment decision

## Search Patterns

The skill searches for security-relevant patterns including:

- **Authentication**: `signIn`, `login`, `jwt`, `session`, `token`, `bcrypt`
- **Authorization**: `role`, `permission`, `admin`, `guard`, `middleware`
- **Input Validation**: `sanitize`, `validate`, `schema`, `zod`, `innerHTML`
- **Data Protection**: `password`, `secret`, `key`, `encrypt`, `hash`, `.env`
- **Error Handling**: `catch`, `error`, `throw`, `stack`, `debug`
- **AI/LLM**: `prompt`, `openai`, `anthropic`, `gemini`, `completion`

## Guidelines

1. **Be Thorough** - Check every category even if issues seem unlikely
2. **Provide Evidence** - Always include file paths and line numbers
3. **Be Actionable** - Every finding should have a clear remediation path
4. **Prioritize Correctly** - P0 issues genuinely block deployment
5. **Consider Context** - A portfolio site has different needs than a banking app
6. **Check Dependencies** - Run `npm audit` and include findings
7. **Test Assumptions** - Verify security measures actually work
8. **Document Positives** - Note good security practices to reinforce them

## Example Usage

```
User: /security-audit

Claude: I'll conduct a comprehensive security audit of your codebase...

[Phase 1: Codebase Discovery]
[Phase 2: Security Assessment - All 10 categories]
[Phase 3: Report Generation]

# Pre-Deployment Security & Code Health Report

## Executive Summary
- Overall Security Rating: 4.2/5
- Overall Code Health Rating: 4.0/5
- Critical Issues: 1
- Deployment Recommendation: APPROVED WITH CONDITIONS

[Detailed findings and remediation steps...]
```

## Contributing

To extend or customize this skill:

1. **Add new check patterns**: Update the relevant `checks/*.md` file
2. **Add new categories**: Create a new numbered file in `checks/`
3. **Modify report format**: Update `templates/report-template.md`
4. **Update search patterns**: Edit `SKILL.md` with new patterns

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Initial | Complete 10-category security audit framework |

---

*This skill is part of the Claude Skills collection for enterprise software development.*
