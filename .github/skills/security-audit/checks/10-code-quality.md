# Code Quality & Health - Deep Checks

> Level 3 deep checks for security audit category 10.

## 10.1.a TypeScript Strict Mode Verification

```bash
# Check tsconfig.json for strict mode
grep -A 20 '"compilerOptions"' tsconfig.json | grep -E "strict|noImplicit|strictNull"

# Count type safety issues
grep -rn ": any\|as any\|<any>" --include="*.ts" --include="*.tsx" | wc -l
grep -rn "@ts-ignore\|@ts-nocheck\|@ts-expect-error" --include="*.ts" --include="*.tsx" | wc -l
grep -rn "eslint-disable.*@typescript-eslint" --include="*.ts" --include="*.tsx" | wc -l

# CRITICAL: Detect unsafe Prisma type casting (defeats type safety)
grep -rn "as unknown as.*prisma\|prisma.*as unknown as" --include="*.ts" -i
grep -rn "this\.prisma.*as unknown" --include="*.ts"

# CRITICAL: Detect syntax errors from duplicate code blocks
grep -rn "^export.*function.*{" --include="*.ts" -A 15 | grep -B 10 "^\s*\w\+,\s*$"
```

| Config Option | Required Value | Notes |
|---------------|----------------|-------|
| strict | true | Enables all strict checks |
| noImplicitAny | true | No implicit any types |
| strictNullChecks | true | Null safety |
| noUncheckedIndexedAccess | true | Safe array/object access |
| noImplicitReturns | true | All paths return |
| noFallthroughCasesInSwitch | true | Switch safety |

```json
// tsconfig.json - Recommended strict settings
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": true
  }
}
```

---

## 10.1.b Type Safety Severity Matrix

| Pattern | Count Threshold | Severity |
|---------|-----------------|----------|
| `: any` or `as any` | > 10 | P2 |
| `@ts-ignore` | > 5 | P1 |
| `@ts-nocheck` | Any | P0 |
| `eslint-disable` (blanket) | > 5 | P2 |
| `as unknown as` (type escape hatch) | Any | P1 |
| Unsafe Prisma casting | Any | P1 |

### Unsafe Type Casting Patterns

```typescript
// VULNERABLE: Defeats TypeScript type safety with Prisma
class SubmissionService {
  constructor(private prisma: PrismaClient) {}

  private get submissionPrisma() {
    return this.prisma as unknown as {
      submission: SubmissionDelegate;
      // ✗ Breaks type safety, no compile-time checks
    };
  }
}

// SECURE: Extend Prisma client properly or use type assertions correctly
// Option 1: Extend PrismaClient
interface ExtendedPrismaClient extends PrismaClient {
  submission: SubmissionDelegate;
}

// Option 2: Use proper type guards
function hasSubmission(prisma: any): prisma is { submission: SubmissionDelegate } {
  return 'submission' in prisma;
}

// Option 3: Just use the Prisma client directly without casting
class SubmissionService {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string) {
    return this.prisma.submission.findUnique({ where: { id } });
    // ✓ Type-safe, no casting needed
  }
}
```

## 10.1.c Syntax Error Detection

```bash
# Detect duplicate code blocks that cause compilation errors
# Look for function definitions followed by orphaned parameters/closing braces
find . -name "*.ts" -exec awk '/export.*function.*\(/{count++; if(count>1)print FILENAME":"NR":"$0}' {} \;

# Find mismatched braces
grep -rn "^}\s*$" --include="*.ts" -A 1 -B 1 | grep -E "^\s*\w+,\s*$"
```

| Error Type | Detection | Severity |
|------------|-----------|----------|
| Duplicate code blocks | Orphaned params after function close | P0-Critical (build fails) |
| Mismatched braces | Function followed by orphaned `}` | P0-Critical |
| Incomplete function definitions | Function missing closing brace | P0-Critical |

```typescript
// SYNTAX ERROR: Duplicate code block
export async function searchClients(search?: string, page?: number, limit?: number) {
  const user = await requireOrganisation()
  return clientService.list({
    organisationId: user.organisationId!,
    search,
    page,
    limit,
  })
}
    search,      // ✗ DUPLICATE - orphaned parameters
    page,
    limit,
  })
}               // ✗ DUPLICATE - orphaned closing brace

// CORRECT: No duplication
export async function searchClients(search?: string, page?: number, limit?: number) {
  const user = await requireOrganisation()
  return clientService.list({
    organisationId: user.organisationId!,
    search,
    page,
    limit,
  })
}
```

---

## 10.2.a Error Handling Verification

```bash
# Find React error boundaries
grep -rn "componentDidCatch\|ErrorBoundary\|error.*boundary" --include="*.tsx"

# Find unhandled promise rejections
grep -rn "\.then(" --include="*.ts" | grep -v "\.catch\|await"
grep -rn "async.*=>\|async function" --include="*.ts" -A 10 | grep -v "try\|catch"
```

### Error Handling Checklist

- [ ] Root-level React Error Boundary wrapping app
- [ ] Route-level error boundaries for isolation
- [ ] Global `unhandledrejection` listener
- [ ] Global `error` event listener
- [ ] Error tracking service configured (Sentry, etc.)
- [ ] All async functions wrapped in try-catch or have .catch()

---

## 10.3.a Test Coverage Analysis

```bash
# Run coverage report
npm run test -- --coverage
# or
vitest run --coverage

# Find files without tests
for f in $(find src -name "*.ts" -o -name "*.tsx" | grep -v "\.test\."); do
  testfile="${f%.ts*}.test.${f##*.}"
  [ ! -f "$testfile" ] && echo "Missing test: $f"
done
```

| Coverage Metric | Minimum | Recommended | Security-Critical |
|-----------------|---------|-------------|-------------------|
| Line coverage | 60% | 80% | 90% |
| Branch coverage | 50% | 70% | 85% |
| Function coverage | 70% | 85% | 95% |

### Security Test Categories

- [ ] Authentication flow tests (login, logout, session)
- [ ] Authorization tests (role-based access)
- [ ] Input validation tests (boundary conditions, malformed input)
- [ ] Rate limiting tests (verify limits enforced)
- [ ] Error handling tests (no sensitive data leaked)

---

## 10.4.a Code Complexity Metrics

```bash
# Install complexity analyzer
npx code-complexity . --limit 20 --sort complexity

# Find long functions (>50 lines)
awk '/^(export )?(async )?(function|const.*=>)/{start=NR} /^}/{if(NR-start>50)print FILENAME":"start}' **/*.ts

# Find large files (>500 lines)
wc -l **/*.ts **/*.tsx 2>/dev/null | awk '$1 > 500 {print}'
```

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Cyclomatic complexity | > 10 | > 20 | Refactor into smaller functions |
| Function lines | > 50 | > 100 | Split function |
| File lines | > 300 | > 500 | Split into modules |
| Function parameters | > 4 | > 6 | Use options object |
| Nesting depth | > 3 | > 5 | Extract early returns |

---

## 10.5.a Dead Code Detection

```bash
# Find unused exports
npx ts-prune | head -50

# Find TODO/FIXME/HACK comments
grep -rn "TODO\|FIXME\|HACK\|XXX\|DEPRECATED" --include="*.ts" --include="*.tsx"

# Find commented code blocks
grep -rn "^\s*//.*function\|^\s*//.*const.*=\|^\s*/\*" --include="*.ts" | head -20
```

| Dead Code Type | Detection Method | Action |
|----------------|------------------|--------|
| Unused exports | ts-prune | Remove or make private |
| Unreachable code | TypeScript/ESLint | Remove |
| Commented code | Manual review | Remove (use git history) |
| TODO older than 6 months | Git blame | Fix or remove |
| Deprecated APIs | @deprecated tag | Migrate and remove |

---

## Secure Implementation Examples

### Strict TypeScript Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    
    // Strict type-checking
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    
    // Additional safety
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false,
    
    // Module safety
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    
    // Output
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "coverage"]
}
```

### ESLint Security Rules
```javascript
// eslint.config.js
import security from 'eslint-plugin-security';
import typescript from '@typescript-eslint/eslint-plugin';

export default [
  {
    plugins: {
      security,
      '@typescript-eslint': typescript,
    },
    rules: {
      // Security rules
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-possible-timing-attacks': 'warn',
      
      // TypeScript strict rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      
      // Code quality
      'complexity': ['warn', 10],
      'max-depth': ['warn', 3],
      'max-lines-per-function': ['warn', 50],
      'max-params': ['warn', 4],
    },
  },
];
```

### Vitest Coverage Configuration
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/types.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 85,
        branches: 70,
        statements: 80,
      },
    },
    globals: true,
    environment: 'jsdom',
  },
});
```

### Pre-commit Hooks
```json
// package.json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "precommit": "npm run lint && npm run typecheck && npm run test"
  },
  "husky": {
    "hooks": {
      "pre-commit": "npm run precommit"
    }
  }
}
```
