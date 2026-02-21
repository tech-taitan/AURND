# Level 3: Code Maintainability Deep Checks

## Overview
This document provides in-depth detection patterns, severity classifications, and remediation guidance for code maintainability issues that impact enterprise deployment readiness.

---

## 1. Type Safety Analysis

### Detection Commands
```bash
# Count 'any' type usage (high count = red flag)
echo "=== 'any' Type Usage ==="
grep -rn ": any" --include="*.ts" --include="*.tsx" | grep -v "node_modules"

# Find implicit any (missing return types)
echo -e "\n=== Functions Without Return Types ==="
grep -rn "function\s\+\w\+(" --include="*.ts" --include="*.tsx" | grep -v ": \w"

# Check for type assertions (should be minimized)
echo -e "\n=== Type Assertions ==="
grep -rn "as any\|as unknown\|<any>" --include="*.ts" --include="*.tsx"

# Find @ts-ignore comments
echo -e "\n=== TypeScript Ignores ==="
grep -rn "@ts-ignore\|@ts-expect-error\|@ts-nocheck" --include="*.ts" --include="*.tsx"
```

### Severity Matrix

| Pattern | Severity | Threshold | Action |
|---------|----------|-----------|--------|
| `@ts-nocheck` in production code | P0-Critical | 0 allowed | Remove immediately |
| `as any` type assertion | P1-High | <5 per project | Refactor with proper types |
| `: any` parameter/return | P2-Medium | <10 per project | Add proper typing |
| `@ts-expect-error` with TODO | P3-Low | Document reason | Track for resolution |

### tsconfig.json Enterprise Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true
  }
}
```

---

## 2. Documentation Standards

### Detection Commands
```bash
# Check for JSDoc on exported functions
echo "=== Exported Functions Without JSDoc ==="
grep -B2 "export\s\+function\|export\s\+const.*=.*=>" --include="*.ts" --include="*.tsx" | grep -v "@\|/\*\*"

# Find README presence
echo -e "\n=== Documentation Files ==="
find . -name "README*" -o -name "CHANGELOG*" -o -name "CONTRIBUTING*" | grep -v node_modules

# Check for inline comments ratio
echo -e "\n=== Comment Density ==="
total_lines=$(find . -name "*.ts" -o -name "*.tsx" | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')
comment_lines=$(grep -r "//\|/\*" --include="*.ts" --include="*.tsx" | wc -l)
echo "Total lines: $total_lines, Comment lines: $comment_lines"

# Find TODO/FIXME that need attention
echo -e "\n=== Technical Debt Markers ==="
grep -rn "TODO\|FIXME\|HACK\|XXX\|BUG" --include="*.ts" --include="*.tsx" | head -30
```

### JSDoc Standard Template
```typescript
/**
 * Brief description of the function purpose.
 * 
 * @description Extended description for complex functions
 * @param {ParamType} paramName - Description of the parameter
 * @returns {ReturnType} Description of what is returned
 * @throws {ErrorType} Description of when errors are thrown
 * @example
 * // Example usage
 * const result = functionName(param);
 * 
 * @since 1.0.0
 * @see RelatedFunction
 */
export function functionName(paramName: ParamType): ReturnType {
  // Implementation
}
```

### Documentation Checklist

| Document | Required | Purpose |
|----------|----------|---------|
| README.md | ✅ Yes | Project overview, setup instructions |
| CHANGELOG.md | ✅ Yes | Version history, breaking changes |
| CONTRIBUTING.md | ⚠️ Recommended | Contribution guidelines |
| API.md / docs/ | ⚠️ Recommended | API documentation |
| Architecture.md | ⚠️ Recommended | System design decisions |

---

## 3. Code Organization Analysis

### Detection Commands
```bash
# Analyze folder structure
echo "=== Project Structure ==="
find . -type d -not -path "*/node_modules/*" -not -path "*/.git/*" | head -30

# Check for barrel exports (index.ts files)
echo -e "\n=== Barrel Exports ==="
find . -name "index.ts" -not -path "*/node_modules/*"

# Find large files (>300 lines)
echo -e "\n=== Large Files (>300 lines) ==="
find . -name "*.ts" -o -name "*.tsx" | xargs wc -l 2>/dev/null | sort -rn | head -20

# Check for circular dependencies indicators
echo -e "\n=== Potential Circular Dependencies ==="
grep -rn "import.*from.*'\.\." --include="*.ts" --include="*.tsx" | head -20
```

### Recommended Folder Structure
```
src/
├── components/          # UI components
│   ├── common/         # Shared components
│   └── features/       # Feature-specific components
├── pages/              # Route pages
├── services/           # External service integrations
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
├── constants/          # Application constants
├── contexts/           # React contexts
└── tests/              # Test utilities and mocks
```

### Severity Matrix - Organization

| Issue | Severity | Indicator | Resolution |
|-------|----------|-----------|------------|
| God files (>500 lines) | P1-High | Single file responsibility overload | Split by concern |
| Missing barrel exports | P3-Low | Import path verbosity | Add index.ts files |
| Inconsistent naming | P2-Medium | Mix of conventions | Standardize naming |
| Deep nesting (>4 levels) | P2-Medium | Complex folder hierarchy | Flatten structure |

---

## 4. Naming Convention Analysis

### Detection Commands
```bash
# Check component naming (should be PascalCase)
echo "=== Component Files ==="
find . -name "*.tsx" -not -path "*/node_modules/*" | xargs basename -a | sort

# Check for consistent hook naming (should start with 'use')
echo -e "\n=== Custom Hooks ==="
grep -rn "^export\s\+function\s\+use\|^export\s\+const\s\+use" --include="*.ts" --include="*.tsx"

# Find inconsistent constant naming
echo -e "\n=== Constants (should be UPPER_SNAKE_CASE) ==="
grep -rn "^export\s\+const\s\+[A-Z]" --include="*.ts" --include="constants*.ts" | head -20

# Check for Hungarian notation (anti-pattern)
echo -e "\n=== Potential Hungarian Notation ==="
grep -rn "str[A-Z]\|num[A-Z]\|arr[A-Z]\|obj[A-Z]" --include="*.ts" --include="*.tsx"
```

### Naming Convention Standards

| Element | Convention | Example | Anti-Pattern |
|---------|------------|---------|--------------|
| Components | PascalCase | `UserProfile.tsx` | `userProfile.tsx` |
| Hooks | camelCase with 'use' prefix | `useAuth()` | `Auth()`, `getAuth()` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` | `maxRetryCount` |
| Types/Interfaces | PascalCase | `UserProfile` | `userProfile`, `IUserProfile` |
| Functions | camelCase | `getUserById()` | `GetUserById()` |
| Boolean variables | is/has/should prefix | `isLoading` | `loading` |
| Event handlers | handle prefix | `handleClick` | `onClick` (unless prop) |
| Files | kebab-case or PascalCase | `user-service.ts` | `userService.ts` mixed |

---

## 5. Dead Code Detection

### Detection Commands
```bash
# Find unused exports (requires ts-prune or similar)
echo "=== Checking for Unused Exports ==="
# If ts-prune is available:
# npx ts-prune | head -30

# Find commented-out code blocks
echo -e "\n=== Commented Code Blocks ==="
grep -rn "^\s*//.*function\|^\s*//.*const\|^\s*//.*class" --include="*.ts" --include="*.tsx"

# Find files not imported anywhere
echo -e "\n=== Potentially Orphaned Files ==="
for file in $(find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v test); do
  basename="${file##*/}"
  name="${basename%.*}"
  if ! grep -rq "from.*$name\|import.*$name" --include="*.ts" --include="*.tsx" 2>/dev/null; then
    echo "Potentially unused: $file"
  fi
done | head -20

# Find unused imports
echo -e "\n=== ESLint Unused Imports ==="
# If eslint is configured:
# npx eslint . --rule 'no-unused-vars: error' 2>/dev/null | head -30
```

### Dead Code Severity

| Type | Severity | Detection Method | Action |
|------|----------|------------------|--------|
| Unused exports | P2-Medium | ts-prune | Remove or document |
| Commented code | P3-Low | grep | Remove, use git history |
| Unreachable code | P1-High | TypeScript/ESLint | Remove immediately |
| Unused dependencies | P2-Medium | depcheck | Remove from package.json |

---

## 6. Complexity Analysis

### Detection Commands
```bash
# Find long functions (>50 lines)
echo "=== Long Functions ==="
awk '/^(export )?(async )?function|^(export )?const.*=>/{start=NR; name=$0}
     /^}/ && start{if(NR-start>50) print name " (" NR-start " lines)"; start=0}' \
     $(find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules) 2>/dev/null | head -20

# Find deeply nested code (>4 levels)
echo -e "\n=== Deep Nesting ==="
grep -rn "^\s\{16,\}" --include="*.ts" --include="*.tsx" | head -20

# Find functions with many parameters (>4)
echo -e "\n=== Functions with Many Parameters ==="
grep -rn "function.*(.*, .*, .*, .*," --include="*.ts" --include="*.tsx" | head -20

# Count conditionals per file
echo -e "\n=== Conditional Complexity ==="
for file in $(find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules); do
  count=$(grep -c "if\s*(\|switch\s*(\|\?\s*:" "$file" 2>/dev/null)
  if [ "$count" -gt 20 ]; then
    echo "$file: $count conditionals"
  fi
done | sort -t: -k2 -rn | head -10
```

### Complexity Thresholds

| Metric | Acceptable | Warning | Critical |
|--------|------------|---------|----------|
| Function length | <30 lines | 30-50 lines | >50 lines |
| Parameters | ≤3 | 4-5 | >5 |
| Nesting depth | ≤3 | 4 | >4 |
| Conditionals per function | ≤5 | 6-10 | >10 |
| Cyclomatic complexity | ≤10 | 11-20 | >20 |

### Refactoring Patterns

```typescript
// ❌ Before: Complex nested logic
function processData(data: Data) {
  if (data) {
    if (data.items) {
      for (const item of data.items) {
        if (item.active) {
          if (item.type === 'special') {
            // deep nested logic
          }
        }
      }
    }
  }
}

// ✅ After: Early returns and extraction
function processData(data: Data | null) {
  if (!data?.items) return;
  
  const activeSpecialItems = data.items.filter(
    item => item.active && item.type === 'special'
  );
  
  activeSpecialItems.forEach(processSpecialItem);
}

function processSpecialItem(item: Item) {
  // Extracted logic
}
```

---

## Enterprise Readiness Checklist

### Code Maintainability Scorecard

| Criterion | Weight | Status |
|-----------|--------|--------|
| TypeScript strict mode enabled | 15% | ☐ |
| Zero `@ts-nocheck` usage | 10% | ☐ |
| <5 `any` type usages | 10% | ☐ |
| README.md present and complete | 10% | ☐ |
| No files >500 lines | 10% | ☐ |
| Consistent naming conventions | 10% | ☐ |
| JSDoc on public APIs | 10% | ☐ |
| No unreachable code | 10% | ☐ |
| Functions ≤50 lines | 10% | ☐ |
| Max nesting depth ≤4 | 5% | ☐ |

**Minimum Score for Deployment: 80%**
