# Dependency & Supply Chain Security - Deep Checks

> Level 3 deep checks for security audit category 9.

## 9.1.a Vulnerability Scanning Commands

```bash
# npm audit (built-in)
npm audit --json > audit-report.json
npm audit --audit-level=high  # Fail on high+ severity

# pnpm audit
pnpm audit --json

# yarn audit (v1)
yarn audit --json

# Snyk (if installed)
snyk test --json > snyk-report.json

# OSV Scanner (Google)
osv-scanner --lockfile=package-lock.json
```

| Severity | SLA | Action |
|----------|-----|--------|
| Critical | Block deployment | Fix immediately before deploy |
| High | 24-48 hours | Fix or document mitigation |
| Moderate | 1 week | Plan remediation |
| Low | 1 month | Fix when convenient |

---

## 9.1.b Dependency Audit Checklist

- [ ] `npm audit` shows 0 high/critical vulnerabilities
- [ ] No dependencies with known malicious versions
- [ ] Dependency count reasonable (check for bloat)
- [ ] All dependencies actively maintained (last commit < 2 years)
- [ ] No deprecated packages (`npm outdated`)

---

## 9.2.a Lock File Verification

```bash
# Verify lock file exists and is committed
git ls-files | grep -E "package-lock\.json|yarn\.lock|pnpm-lock\.yaml"

# Check for unpinned dependencies (semver ranges)
grep -E '"\^|"~|"\*|"latest"' package.json

# Verify integrity hashes exist in lock file
grep -c "integrity" package-lock.json  # Should be > 0 for each dep
```

| Practice | Status | Notes |
|----------|--------|-------|
| Lock file committed | Required | Ensures reproducible builds |
| Exact versions | Recommended | Use `--save-exact` |
| Integrity hashes | Required | Prevent tampering |
| `.npmrc` with `save-exact=true` | Recommended | Default to pinned |

```bash
# .npmrc security settings
cat >> .npmrc << EOF
save-exact=true
audit=true
fund=false
engine-strict=true
EOF
```

---

## 9.3.a Third-Party Script Audit

```bash
# Find CDN script includes
grep -rn "<script.*src=.*http" --include="*.html" --include="*.tsx"
grep -rn "cdn\.\|unpkg\.\|jsdelivr\.\|cdnjs\." --include="*.html" --include="*.tsx" --include="*.ts"

# Check for missing SRI hashes
grep -rn "<script.*src=" --include="*.html" | grep -v "integrity="
```

```html
<!-- VULNERABLE: No SRI hash -->
<script src="https://cdn.example.com/lib.js"></script>

<!-- SECURE: With SRI hash -->
<script 
  src="https://cdn.example.com/lib.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxprVuJ1lVp1pAoFBLLFZsRIqJB9aKT"
  crossorigin="anonymous"
></script>
```

| CDN Source | Risk Level | Recommendation |
|------------|------------|----------------|
| Self-hosted | Lowest | Preferred for critical libs |
| Major CDN with SRI | Low | Acceptable |
| Major CDN without SRI | Medium | Add SRI hashes |
| Unknown CDN | High | Self-host instead |
| Dynamic CDN URLs | Critical | Never use |

---

## 9.4.a Build Security Checklist

```bash
# Check for secrets in CI config
grep -rn "password\|secret\|key\|token" .github/workflows/*.yml | grep -v "secrets\.\|\${{.*}}"

# Verify secrets are using GitHub secrets
grep -rn "\${{" .github/workflows/*.yml | grep -i "secret\|key\|token\|password"
```

| CI/CD Check | Verify | Severity |
|-------------|--------|----------|
| Secrets in env vars | Use `${{ secrets.* }}` only | P0 |
| Artifact signing | Build outputs signed | P2 |
| Branch protection | Main branch protected | P1 |
| PR reviews required | At least 1 review | P2 |
| Dependency caching | Cache uses hash keys | P3 |

```yaml
# SECURE: GitHub Actions secret usage
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}  # ✓ From secrets
  NODE_ENV: production  # ✓ Not sensitive
  
# VULNERABLE: Hardcoded secret
env:
  API_KEY: "sk_live_abc123"  # ✗ Never do this
```

---

## Secure Implementation Examples

### Automated Dependency Auditing
```yaml
# .github/workflows/security.yml
name: Security Audit

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * *'  # Daily

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run npm audit
        run: npm audit --audit-level=high
      
      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
```

### Package.json Security Settings
```json
{
  "name": "my-app",
  "version": "1.0.0",
  "engines": {
    "node": ">=20.0.0"
  },
  "scripts": {
    "preinstall": "npx only-allow npm",
    "audit": "npm audit --audit-level=high",
    "audit:fix": "npm audit fix",
    "check-deps": "npx depcheck"
  },
  "overrides": {
    "vulnerable-package": "^2.0.0"
  }
}
```

### .npmrc Security Configuration
```ini
# .npmrc
# Use exact versions by default
save-exact=true

# Always run audit on install
audit=true

# Disable funding messages
fund=false

# Enforce engine requirements
engine-strict=true

# Registry configuration (for private packages)
# @mycompany:registry=https://npm.mycompany.com/

# Disable scripts from dependencies (security)
# ignore-scripts=true  # Enable if you don't need postinstall scripts
```

### SRI Hash Generator Script
```typescript
// scripts/generate-sri.ts
import crypto from 'crypto';
import fs from 'fs';

function generateSRI(content: Buffer): string {
  const hash = crypto.createHash('sha384').update(content).digest('base64');
  return `sha384-${hash}`;
}

async function main() {
  const files = process.argv.slice(2);
  
  for (const file of files) {
    const content = fs.readFileSync(file);
    const sri = generateSRI(content);
    console.log(`${file}: ${sri}`);
  }
}

main();
```

### Dependabot Configuration
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
      day: monday
    open-pull-requests-limit: 10
    reviewers:
      - security-team
    labels:
      - dependencies
      - security
    commit-message:
      prefix: "deps"
    ignore:
      # Ignore major updates that need manual review
      - dependency-name: "*"
        update-types: ["version-update:semver-major"]
    groups:
      # Group minor/patch updates
      minor-and-patch:
        patterns:
          - "*"
        update-types:
          - minor
          - patch
```
