# Deployment Readiness Skill

A comprehensive enterprise deployment readiness assessment skill for Claude AI that evaluates code quality, operational readiness, and best practices required for successful production deployments.

## Overview

This skill provides a structured, multi-level assessment framework for evaluating whether an application is ready for deployment to commercial production environments. It covers 10 key assessment categories and generates actionable reports with clear remediation guidance.

## Features

- **Three Assessment Levels**: Quick scan (5 min), category assessment, and deep-dive checks
- **10 Assessment Categories**: Comprehensive coverage of deployment concerns
- **Severity-Based Findings**: Clear prioritization with P0-Critical through P3-Low ratings
- **Actionable Reports**: Detailed remediation steps for each issue
- **Enterprise Focus**: Designed for commercial-scale deployments

## Quick Start

Invoke this skill using any of these trigger phrases:

```
/deployment-readiness
```

Or ask naturally:
- "Assess deployment readiness"
- "Deployment quality check"
- "Production readiness review"
- "Enterprise deployment assessment"

## Assessment Categories

| # | Category | Focus Area |
|---|----------|------------|
| 1 | **Code Maintainability** | Type safety, documentation, code organization, technical debt |
| 2 | **Scalability & Performance** | Caching, lazy loading, bundle optimization, memory management |
| 3 | **Observability & Monitoring** | Logging, error tracking, metrics, health checks |
| 4 | **Reliability & Resilience** | Error boundaries, retry logic, graceful degradation |
| 5 | **Configuration Management** | Environment variables, feature flags, secrets handling |
| 6 | **Testing Strategy** | Unit tests, integration tests, E2E tests, coverage |
| 7 | **CI/CD Readiness** | Build config, deployment pipelines, rollback capability |
| 8 | **API Design & Contracts** | Versioning, documentation, error responses |
| 9 | **Database Operations** | Migrations, indexing, connection pooling, backups |
| 10 | **Compliance & Standards** | Linting, accessibility, license compliance |

## File Structure

```
deployment-readiness/
├── README.md              # This file
├── SKILL.md               # Main skill instructions for Claude
├── checks/                # Deep-dive assessment guides
│   ├── 01-code-maintainability.md
│   ├── 02-scalability-performance.md
│   ├── 03-observability-monitoring.md
│   ├── 04-reliability-resilience.md
│   ├── 05-configuration-management.md
│   ├── 06-testing-strategy.md
│   ├── 07-cicd-readiness.md
│   ├── 08-api-design.md
│   ├── 09-database-operations.md
│   └── 10-compliance-standards.md
└── templates/             # Report templates
    └── report-template.md
```

## Assessment Levels

### Level 1: Quick Assessment (~5 minutes)
A rapid health snapshot using basic detection commands. Ideal for:
- Initial project evaluation
- Pre-PR sanity checks
- Quick status updates

### Level 2: Category Assessment (~30 minutes)
Systematic review of all 10 categories with detection patterns and findings documentation. Ideal for:
- Sprint milestone reviews
- Pre-staging deployment checks
- Regular health assessments

### Level 3: Deep Dive (As needed)
In-depth analysis using the detailed check files in `/checks/`. Ideal for:
- Production deployment approval
- Issue root cause analysis
- Compliance audits

## Readiness Ratings

| Rating | Symbol | Meaning | Action Required |
|--------|--------|---------|-----------------|
| Ready | ✅ | Meets enterprise standards | None |
| Acceptable | ⚠️ | Minor improvements needed | Post-deployment |
| Needs Work | 🔶 | Significant gaps exist | Pre-deployment |
| Blocker | ❌ | Critical issues present | Must fix |

## Score Thresholds

- **≥80%**: Ready for deployment ✅
- **60-79%**: Needs minor work before deployment ⚠️
- **<60%**: Critical issues must be addressed ❌

## Output

The skill generates a comprehensive report including:

1. **Executive Summary**: Overall readiness verdict
2. **Readiness Scorecard**: Scores for all 10 categories
3. **Critical Findings**: Blockers, high priority, and medium priority issues
4. **Detailed Assessments**: Per-category breakdown with evidence
5. **Remediation Roadmap**: Prioritized action items

## Integration with Security Audit

This skill focuses on **operational and code quality** factors. For security-specific assessments, use the complementary `security-audit` skill:

| This Skill Covers | Security Audit Covers |
|-------------------|----------------------|
| Maintainability | Authentication |
| Scalability | Authorization |
| Observability | Input validation |
| Reliability | API security |
| Testing | Secrets exposure |
| CI/CD | Vulnerability scanning |

**Recommended workflow for full pre-deployment review:**
1. Run `/deployment-readiness` first for operational readiness
2. Run `/security-audit` for security-specific checks
3. Combine reports into unified deployment decision

## Technology Focus

This skill is optimized for projects using:
- **Frontend**: React, TypeScript
- **Backend**: Node.js, Next.js
- **Database**: Supabase
- **Deployment**: Vercel
- **Testing**: Vitest, Playwright

However, the assessment principles apply broadly to modern web applications.

## Example Usage

```
User: /deployment-readiness

Claude: I'll conduct a deployment readiness assessment for your project...

[Runs Level 1 quick scan]
[Evaluates all 10 categories]
[Generates comprehensive report]
[Provides prioritized remediation steps]
```

## Contributing

To extend or customize this skill:

1. **Add new check patterns**: Update the relevant `checks/*.md` file
2. **Add new categories**: Create a new numbered file in `checks/`
3. **Modify report format**: Update `templates/report-template.md`
4. **Update detection commands**: Edit `SKILL.md` with new patterns

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Initial | Complete 10-category assessment framework |

---

*This skill is part of the Claude Skills collection for enterprise software development.*
