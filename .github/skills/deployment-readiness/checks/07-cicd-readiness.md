# Level 3: CI/CD Readiness Deep Checks

## Overview
This document provides comprehensive detection patterns and best practices for ensuring robust CI/CD pipelines, automated deployments, and reliable release management.

---

## 1. Build Configuration Analysis

### Detection Commands
```bash
# Check build configuration
echo "=== Build Configuration ==="
cat vite.config.ts 2>/dev/null | head -50
cat next.config.js 2>/dev/null | head -50

# Find build scripts
echo -e "\n=== Build Scripts ==="
grep -A20 "\"scripts\"" package.json | grep -E "build|compile|bundle"

# Check for build optimization
echo -e "\n=== Build Optimization ==="
grep -rn "minify\|terser\|sourcemap\|rollupOptions" vite.config.ts 2>/dev/null

# Find environment-specific builds
echo -e "\n=== Environment Builds ==="
grep -rn "build:prod\|build:staging\|build:dev" package.json

# Check TypeScript build config
echo -e "\n=== TypeScript Build ==="
grep -E "outDir|declaration|sourceMap" tsconfig.json 2>/dev/null
```

### Vite Build Configuration Best Practices

```typescript
// ✅ vite.config.ts - Production-ready configuration
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(),
      // Bundle analysis in build
      mode === 'analyze' && visualizer({
        filename: 'dist/stats.html',
        open: true,
        gzipSize: true,
      }),
    ].filter(Boolean),
    
    build: {
      // Output configuration
      outDir: 'dist',
      sourcemap: mode === 'production' ? 'hidden' : true,
      
      // Optimization
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: true,
        },
      },
      
      // Chunk splitting
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
            supabase: ['@supabase/supabase-js'],
          },
        },
      },
      
      // Asset handling
      assetsInlineLimit: 4096, // 4kb
      chunkSizeWarningLimit: 500, // 500kb
    },
    
    // Environment variable handling
    define: {
      __APP_VERSION__: JSON.stringify(env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
  };
});
```

### Build Script Configuration

```json
// ✅ package.json scripts
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "build:staging": "tsc && vite build --mode staging",
    "build:production": "tsc && vite build --mode production",
    "build:analyze": "tsc && vite build --mode analyze",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write 'src/**/*.{ts,tsx}'",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:ci": "vitest run --coverage",
    "clean": "rimraf dist coverage"
  }
}
```

---

## 2. Deployment Pipeline Analysis

### Detection Commands
```bash
# Check for CI/CD configuration
echo "=== CI/CD Configuration ==="
ls -la .github/workflows/ 2>/dev/null
cat .github/workflows/*.yml 2>/dev/null | head -100

# CRITICAL: Check for disabled deployment steps
echo -e "\n=== Disabled Deployment Steps (CRITICAL) ==="
grep -rn "if:\s*false\|if:\s*\${{.*false.*}}" .github/workflows/*.yml

# CRITICAL: Check for database migration in deploy workflow
echo -e "\n=== Database Migration in Deploy ==="
grep -rn "prisma.*migrate\|db.*migrate\|migrate:deploy" .github/workflows/*.yml

# Check for Prisma generate in build
echo -e "\n=== Prisma Generate in Build ==="
grep -rn "prisma generate" package.json .github/workflows/*.yml

# Check Vercel configuration
echo -e "\n=== Vercel Config ==="
cat vercel.json 2>/dev/null

# Find deployment scripts
echo -e "\n=== Deployment Scripts ==="
grep -rn "deploy\|release\|publish" package.json
ls -la scripts/ 2>/dev/null

# Check for Docker
echo -e "\n=== Docker Configuration ==="
ls -la Dockerfile docker-compose* 2>/dev/null
```

### GitHub Actions Workflow (Production-Ready)

```yaml
# ✅ .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20'

jobs:
  # Lint and type check
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Type check
        run: npm run typecheck

  # Run tests
  test:
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:ci
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true

  # Build
  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build:production
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: dist/
          retention-days: 7

  # Deploy to staging
  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    environment: staging
    steps:
      - uses: actions/checkout@v4
      
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build
          path: dist/
      
      - name: Deploy to Vercel (Staging)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./
          scope: ${{ secrets.VERCEL_ORG_ID }}

  # Deploy to production
  deploy-production:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4
      
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build
          path: dist/
      
      - name: Deploy to Vercel (Production)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: ./
          scope: ${{ secrets.VERCEL_ORG_ID }}
```

---

## 2.5 Critical Deployment Workflow Issues

### 2.5.a Disabled Deployment Steps

```bash
# Detect disabled deployment actions
grep -rn "if:\s*false" .github/workflows/*.yml
grep -rn "if:\s*\${{.*false.*}}" .github/workflows/*.yml
```

| Issue | Severity | Impact |
|-------|----------|--------|
| Deployment step with `if: false` | P0-Critical | Deployment will never run |
| Vercel action disabled | P0-Critical | No production deployment |
| Migration step commented out | P0-Critical | Schema drift |

```yaml
# BLOCKING: Deployment step is disabled
- name: Deploy to Vercel
  if: false  # ✗ CRITICAL: This step will never run!
  uses: amondnet/vercel-action@v25
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}

# SECURE: Enabled deployment with proper conditions
- name: Deploy to Vercel (Production)
  if: github.ref == 'refs/heads/main'  # ✓ Conditional on branch
  uses: amondnet/vercel-action@v25
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
    vercel-args: '--prod'
```

### 2.5.b Missing Database Migrations

```bash
# Check if deploy workflow includes migration step
grep -A 10 "deploy" .github/workflows/*.yml | grep "migrate"
grep -rn "prisma migrate deploy\|npx prisma migrate deploy" .github/workflows/*.yml
```

| Issue | Severity | Impact |
|-------|----------|--------|
| No migration step in deploy workflow | P1-High | Database schema drift |
| Migration runs after deployment | P2-Medium | App crashes until migration completes |
| Missing DATABASE_URL secret | P0-Critical | Migration fails silently |

```yaml
# VULNERABLE: No migration step
jobs:
  deploy:
    steps:
      - name: Deploy
        run: vercel deploy --prod
        # ✗ Database might be out of sync with code

# SECURE: Migration before deployment
jobs:
  deploy:
    steps:
      - name: Run Database Migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Deploy Application
        run: vercel deploy --prod
        # ✓ Database schema updated before deployment
```

### 2.5.c Prisma Client Generation

```bash
# Check if Prisma generate runs before build
grep -B 5 -A 5 "npm run build\|vite build\|next build" .github/workflows/*.yml package.json | grep "prisma generate"
grep -rn "\"build\":" package.json
```

| Issue | Severity | Impact |
|-------|----------|--------|
| No `prisma generate` before build | P0-Critical | Build fails with "Cannot find module '@prisma/client'" |
| Generate in wrong order | P1-High | Uses stale Prisma client |
| Missing in package.json build script | P1-High | Local builds work, CI fails |

```json
// VULNERABLE: Build without Prisma generate
{
  "scripts": {
    "build": "next build"  // ✗ Missing prisma generate
  }
}

// SECURE: Generate before build
{
  "scripts": {
    "build": "prisma generate && next build",
    "build:ci": "prisma generate && prisma migrate deploy && next build"
  }
}
```

```yaml
# VULNERABLE: Missing Prisma generate in CI
- name: Build
  run: npm run build
  # ✗ Will fail if Prisma client not generated

# SECURE: Explicit Prisma generate
- name: Generate Prisma Client
  run: npx prisma generate

- name: Build
  run: npm run build
  # ✓ Prisma client available
```

### Deployment Workflow Checklist

| Check | Status | Priority |
|-------|--------|----------|
| No disabled deployment steps (`if: false`) | ☐ | P0 |
| Database migration runs before deploy | ☐ | P1 |
| Prisma generate before build | ☐ | P0 |
| Health check after deployment | ☐ | P1 |
| Rollback mechanism exists | ☐ | P2 |
| Deployment notifications configured | ☐ | P3 |

---

## 3. Environment Promotion Strategy

### Detection Commands
```bash
# Check branch protection
echo "=== Branch Configuration ==="
git branch -a 2>/dev/null | head -20

# Find environment configurations
echo -e "\n=== Environment Configs ==="
ls -la .env* 2>/dev/null
ls -la environments/ config/environments/ 2>/dev/null

# Check for environment-specific workflows
echo -e "\n=== Environment Workflows ==="
grep -rn "environment:" .github/workflows/ 2>/dev/null
```

### Environment Promotion Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Feature   │────▶│   Develop   │────▶│    Main     │
│   Branch    │     │  (Staging)  │     │(Production) │
└─────────────┘     └─────────────┘     └─────────────┘
      │                    │                    │
      ▼                    ▼                    ▼
   PR Review          Auto Deploy          Auto Deploy
   + CI Tests         to Staging          to Production
                      + Smoke Tests       + Health Check
```

### GitHub Environment Configuration

```yaml
# ✅ Environment protection rules (in GitHub Settings)

# Staging Environment
staging:
  protection_rules:
    - required_reviewers: 0
    - wait_timer: 0
  deployment_branches:
    - develop

# Production Environment
production:
  protection_rules:
    - required_reviewers: 1
    - wait_timer: 5  # 5 minute wait
  deployment_branches:
    - main
```

---

## 4. Rollback Capability Analysis

### Detection Commands
```bash
# Check for versioning
echo "=== Version Management ==="
grep "\"version\"" package.json
git tag -l 2>/dev/null | tail -10

# Find rollback scripts
echo -e "\n=== Rollback Scripts ==="
grep -rn "rollback\|revert" package.json .github/workflows/ 2>/dev/null

# Check deployment history (Vercel)
echo -e "\n=== Vercel Deployments ==="
# vercel ls --limit 10 2>/dev/null

# Find database migration rollback
echo -e "\n=== Migration Rollback ==="
grep -rn "down\|rollback\|revert" migrations/ supabase/ 2>/dev/null | head -10
```

### Rollback Strategy Implementation

```yaml
# ✅ .github/workflows/rollback.yml
name: Rollback Deployment

on:
  workflow_dispatch:
    inputs:
      deployment_id:
        description: 'Deployment ID to rollback to'
        required: true
      environment:
        description: 'Environment (staging/production)'
        required: true
        default: 'production'

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    steps:
      - name: Rollback Vercel Deployment
        run: |
          vercel rollback ${{ github.event.inputs.deployment_id }} \
            --token=${{ secrets.VERCEL_TOKEN }}
      
      - name: Notify team
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "🔄 Rollback completed to deployment ${{ github.event.inputs.deployment_id }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### Versioning Strategy

```typescript
// ✅ Version management script (scripts/version.ts)
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

type BumpType = 'major' | 'minor' | 'patch';

function bumpVersion(type: BumpType): void {
  const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
  const [major, minor, patch] = pkg.version.split('.').map(Number);
  
  let newVersion: string;
  switch (type) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }
  
  // Update package.json
  pkg.version = newVersion;
  writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  
  // Create git tag
  execSync(`git add package.json`);
  execSync(`git commit -m "chore: bump version to ${newVersion}"`);
  execSync(`git tag -a v${newVersion} -m "Version ${newVersion}"`);
  
  console.log(`✅ Version bumped to ${newVersion}`);
}
```

---

## 5. Artifact Management

### Detection Commands
```bash
# Check build output
echo "=== Build Output ==="
ls -la dist/ build/ out/ 2>/dev/null | head -20

# Find artifact configuration
echo -e "\n=== Artifact Config ==="
grep -rn "artifact\|upload-artifact\|cache" .github/workflows/ 2>/dev/null

# Check for Docker image tags
echo -e "\n=== Docker Tags ==="
grep -rn "tag:\|tags:" .github/workflows/ Dockerfile 2>/dev/null
```

### Artifact Configuration Best Practices

```yaml
# ✅ Artifact caching and management
jobs:
  build:
    steps:
      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          path: |
            ~/.npm
            node_modules
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-
      
      - name: Cache build output
        uses: actions/cache@v3
        with:
          path: dist
          key: ${{ runner.os }}-build-${{ github.sha }}
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-${{ github.sha }}
          path: |
            dist/
            !dist/**/*.map
          retention-days: 30
          if-no-files-found: error
```

---

## 6. Deployment Verification

### Detection Commands
```bash
# Check for smoke tests
echo "=== Smoke Tests ==="
grep -rn "smoke\|health\|sanity" --include="*.ts" --include="*.yml" 2>/dev/null | head -20

# Find deployment verification
echo -e "\n=== Deployment Checks ==="
grep -rn "verify\|check.*deploy\|post.*deploy" .github/workflows/ 2>/dev/null

# Check for monitoring integration
echo -e "\n=== Monitoring Hooks ==="
grep -rn "sentry\|datadog\|newrelic" .github/workflows/ 2>/dev/null
```

### Post-Deployment Verification

```yaml
# ✅ Post-deployment checks
jobs:
  deploy-production:
    steps:
      - name: Deploy
        id: deploy
        run: # deployment commands

      - name: Wait for deployment
        run: sleep 30

      - name: Health check
        run: |
          response=$(curl -s -o /dev/null -w "%{http_code}" https://your-app.vercel.app/api/health)
          if [ "$response" != "200" ]; then
            echo "Health check failed with status: $response"
            exit 1
          fi
          echo "Health check passed"

      - name: Smoke test
        run: |
          npx playwright test tests/smoke.spec.ts --reporter=line
        env:
          BASE_URL: https://your-app.vercel.app

      - name: Notify Sentry of release
        run: |
          sentry-cli releases new ${{ github.sha }}
          sentry-cli releases set-commits ${{ github.sha }} --auto
          sentry-cli releases finalize ${{ github.sha }}
          sentry-cli releases deploys ${{ github.sha }} new -e production
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: your-org
          SENTRY_PROJECT: your-project

      - name: Rollback on failure
        if: failure()
        run: |
          echo "Deployment verification failed, initiating rollback..."
          # Rollback commands
```

### Smoke Test Example

```typescript
// ✅ tests/smoke.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('API health check responds', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });

  test('can navigate to main sections', async ({ page }) => {
    await page.goto('/');
    
    // Check navigation works
    await page.click('nav >> text=Blog');
    await expect(page).toHaveURL(/.*blog/);
    
    await page.click('nav >> text=Projects');
    await expect(page).toHaveURL(/.*projects/);
  });

  test('authentication flow available', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
```

---

## CI/CD Checklist Commands

```bash
# Quick CI/CD health check script
echo "=== CI/CD HEALTH CHECK ==="

echo -e "\n📁 Configuration Files:"
ls -la .github/workflows/ vercel.json Dockerfile 2>/dev/null

echo -e "\n📦 Build Scripts:"
grep -A5 "\"scripts\"" package.json | grep -E "build|deploy|test"

echo -e "\n🔐 Secrets (check GitHub):"
echo "Ensure these are configured:"
echo "  - VERCEL_TOKEN"
echo "  - VITE_* environment variables"
echo "  - SENTRY_AUTH_TOKEN"

echo -e "\n🏷️ Version:"
grep "\"version\"" package.json
git tag -l | tail -5 2>/dev/null

echo -e "\n✅ CI/CD check complete"
```

---

## Enterprise Readiness Checklist

### CI/CD Readiness Scorecard

| Criterion | Weight | Status |
|-----------|--------|--------|
| CI pipeline runs on PR | 15% | ☐ |
| Automated tests in CI | 15% | ☐ |
| Build configuration optimized | 10% | ☐ |
| Environment-specific builds | 10% | ☐ |
| Staging environment exists | 10% | ☐ |
| Production deployment automated | 15% | ☐ |
| Rollback capability | 10% | ☐ |
| Post-deployment verification | 10% | ☐ |
| Version tagging | 5% | ☐ |

**Minimum Score for Deployment: 80%**
