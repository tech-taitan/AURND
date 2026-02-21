# Level 3: Compliance & Standards Deep Checks

## Overview
This document provides comprehensive detection patterns and best practices for coding standards, accessibility compliance, licensing, and regulatory requirements in enterprise applications.

---

## 1. Linting & Code Quality Configuration

### Detection Commands
```bash
# Check ESLint configuration
echo "=== ESLint Configuration ==="
cat eslint.config.js .eslintrc.* 2>/dev/null | head -50

# Check Prettier configuration
echo -e "\n=== Prettier Configuration ==="
cat .prettierrc* prettier.config.* 2>/dev/null

# Find linting scripts
echo -e "\n=== Lint Scripts ==="
grep -A5 "\"scripts\"" package.json | grep -E "lint|format"

# Check for pre-commit hooks
echo -e "\n=== Git Hooks ==="
cat .husky/pre-commit 2>/dev/null
grep -rn "husky\|lint-staged" package.json 2>/dev/null

# Run lint check
echo -e "\n=== Current Lint Issues ==="
npm run lint 2>&1 | head -30
```

### ESLint Enterprise Configuration

```javascript
// ✅ eslint.config.js - Enterprise configuration
import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': typescript,
      'react': react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      'import': importPlugin,
    },
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        project: './tsconfig.json',
      },
    },
    rules: {
      // TypeScript strict rules
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      
      // React rules
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // Accessibility rules
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/label-has-associated-control': 'error',
      
      // Import organization
      'import/order': ['error', {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc' },
      }],
      'import/no-duplicates': 'error',
      
      // General code quality
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'coverage/'],
  },
];
```

### Pre-commit Hooks Configuration

```json
// ✅ package.json - lint-staged configuration
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  },
  "scripts": {
    "prepare": "husky install",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write 'src/**/*.{ts,tsx,json}'",
    "format:check": "prettier --check 'src/**/*.{ts,tsx,json}'"
  }
}
```

```bash
# ✅ .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

---

## 2. Accessibility (a11y) Compliance

### Detection Commands
```bash
# Check for ARIA attributes
echo "=== ARIA Usage ==="
grep -rn "aria-\|role=" --include="*.tsx" | wc -l
grep -rn "aria-label\|aria-labelledby\|aria-describedby" --include="*.tsx" | head -20

# Find images without alt text
echo -e "\n=== Images Without Alt Text ==="
grep -rn "<img\|<Image" --include="*.tsx" | grep -v "alt="

# Check for semantic HTML
echo -e "\n=== Semantic HTML Usage ==="
grep -rn "<nav\|<main\|<article\|<section\|<header\|<footer\|<aside" --include="*.tsx" | head -20

# Find click handlers without keyboard support
echo -e "\n=== Click Without Keyboard ==="
grep -rn "onClick=" --include="*.tsx" | grep -v "onKeyDown\|onKeyPress\|onKeyUp\|button\|<a\|<Link" | head -20

# Check for focus management
echo -e "\n=== Focus Management ==="
grep -rn "tabIndex\|focus()\|autoFocus" --include="*.tsx" | head -20

# Find form labels
echo -e "\n=== Form Labels ==="
grep -rn "<label\|htmlFor\|aria-label" --include="*.tsx" | grep -B2 -A2 "input\|select\|textarea" | head -30
```

### Accessibility Patterns

```tsx
// ✅ Accessible image
<img 
  src="/hero.jpg" 
  alt="Team collaboration meeting in modern office" 
  loading="lazy"
/>

// ✅ Decorative image (no alt needed)
<img src="/decoration.svg" alt="" role="presentation" />

// ✅ Accessible button with icon
<button 
  onClick={handleSubmit}
  aria-label="Submit form"
  aria-busy={isLoading}
  disabled={isLoading}
>
  {isLoading ? <Spinner aria-hidden="true" /> : <SendIcon aria-hidden="true" />}
</button>

// ✅ Accessible form
<form onSubmit={handleSubmit} aria-describedby="form-description">
  <p id="form-description" className="sr-only">
    Fill out this form to contact us.
  </p>
  
  <div>
    <label htmlFor="email">Email address</label>
    <input 
      id="email"
      type="email"
      aria-required="true"
      aria-invalid={!!errors.email}
      aria-describedby={errors.email ? "email-error" : undefined}
    />
    {errors.email && (
      <p id="email-error" role="alert" className="error">
        {errors.email}
      </p>
    )}
  </div>
  
  <button type="submit">Submit</button>
</form>

// ✅ Skip to main content link
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>

// ✅ Accessible modal
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Confirm Action</h2>
  <p id="modal-description">Are you sure you want to proceed?</p>
  <button onClick={onConfirm}>Confirm</button>
  <button onClick={onCancel}>Cancel</button>
</div>

// ✅ Screen reader only class (Tailwind)
// In globals.css or tailwind.config.js
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### WCAG 2.1 Checklist

| Level | Criterion | Check |
|-------|-----------|-------|
| A | 1.1.1 Non-text Content | All images have alt text |
| A | 1.3.1 Info and Relationships | Semantic HTML used |
| A | 2.1.1 Keyboard | All interactive elements keyboard accessible |
| A | 2.4.1 Bypass Blocks | Skip to content link |
| A | 2.4.4 Link Purpose | Links have descriptive text |
| A | 3.1.1 Language of Page | `<html lang="en">` |
| A | 4.1.2 Name, Role, Value | ARIA attributes correct |
| AA | 1.4.3 Contrast | 4.5:1 for normal text |
| AA | 2.4.7 Focus Visible | Focus indicators visible |

---

## 3. License Compliance

### Detection Commands
```bash
# Check project license
echo "=== Project License ==="
cat LICENSE 2>/dev/null | head -20
grep "\"license\"" package.json

# List dependency licenses
echo -e "\n=== Dependency Licenses ==="
# Requires license-checker: npm install -g license-checker
# license-checker --summary 2>/dev/null | head -30

# Find problematic licenses
echo -e "\n=== Potentially Problematic Licenses ==="
# license-checker --onlyAllow 'MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC;CC0-1.0;Unlicense' 2>/dev/null

# Check for license in source files
echo -e "\n=== Source File Headers ==="
head -5 src/index.tsx 2>/dev/null
```

### License Compliance Configuration

```javascript
// ✅ license-checker configuration (package.json or separate config)
{
  "license-check": {
    "allow": [
      "MIT",
      "Apache-2.0",
      "BSD-2-Clause",
      "BSD-3-Clause",
      "ISC",
      "CC0-1.0",
      "Unlicense",
      "0BSD",
      "CC-BY-4.0"
    ],
    "deny": [
      "GPL",
      "AGPL",
      "LGPL",
      "SSPL"
    ],
    "reportFile": "licenses.json"
  }
}
```

### License Categories

| License | Type | Enterprise Safe? |
|---------|------|------------------|
| MIT | Permissive | ✅ Yes |
| Apache-2.0 | Permissive | ✅ Yes |
| BSD-2-Clause | Permissive | ✅ Yes |
| BSD-3-Clause | Permissive | ✅ Yes |
| ISC | Permissive | ✅ Yes |
| GPL-3.0 | Copyleft | ⚠️ Caution |
| AGPL-3.0 | Strong Copyleft | ❌ No |
| SSPL | Source Available | ❌ No |

---

## 4. Code Formatting Standards

### Detection Commands
```bash
# Check Prettier configuration
echo "=== Prettier Config ==="
cat .prettierrc* prettier.config.* 2>/dev/null

# Check EditorConfig
echo -e "\n=== EditorConfig ==="
cat .editorconfig 2>/dev/null

# Verify formatting
echo -e "\n=== Format Check ==="
npm run format:check 2>&1 | head -20
```

### Prettier Configuration

```javascript
// ✅ prettier.config.js
export default {
  // Basics
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  useTabs: false,
  
  // Line handling
  printWidth: 100,
  endOfLine: 'lf',
  
  // Trailing commas for cleaner diffs
  trailingComma: 'es5',
  
  // JSX
  jsxSingleQuote: false,
  bracketSameLine: false,
  
  // Consistency
  bracketSpacing: true,
  arrowParens: 'always',
  
  // Plugins
  plugins: ['prettier-plugin-tailwindcss'],
  
  // Tailwind class sorting
  tailwindConfig: './tailwind.config.js',
};
```

### EditorConfig

```ini
# ✅ .editorconfig
root = true

[*]
charset = utf-8
end_of_line = lf
indent_size = 2
indent_style = space
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false

[*.{yml,yaml}]
indent_size = 2

[Makefile]
indent_style = tab
```

---

## 5. Documentation Standards

### Detection Commands
```bash
# Check for README
echo "=== README ==="
ls -la README* 2>/dev/null
wc -l README.md 2>/dev/null

# Check for contributing guide
echo -e "\n=== Contributing Guide ==="
ls -la CONTRIBUTING* 2>/dev/null

# Check for changelog
echo -e "\n=== Changelog ==="
ls -la CHANGELOG* 2>/dev/null
head -30 CHANGELOG.md 2>/dev/null

# Find inline documentation
echo -e "\n=== JSDoc Coverage ==="
grep -rn "/\*\*" --include="*.ts" --include="*.tsx" | wc -l

# Check API documentation
echo -e "\n=== API Docs ==="
ls -la docs/ API.md api/README.md 2>/dev/null
```

### README Template

```markdown
# Project Name

Brief description of the project.

## Features

- Feature 1
- Feature 2
- Feature 3

## Prerequisites

- Node.js >= 20.x
- npm >= 10.x

## Getting Started

### Installation

\`\`\`bash
npm install
\`\`\`

### Environment Setup

1. Copy `.env.example` to `.env.local`
2. Fill in required values

### Development

\`\`\`bash
npm run dev
\`\`\`

### Building

\`\`\`bash
npm run build
\`\`\`

### Testing

\`\`\`bash
npm test
\`\`\`

## Project Structure

\`\`\`
src/
├── components/     # React components
├── pages/          # Route pages
├── services/       # API services
├── utils/          # Utility functions
└── types/          # TypeScript types
\`\`\`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT - See [LICENSE](LICENSE).
```

---

## 6. Regulatory Compliance Considerations

### Detection Commands
```bash
# Check for GDPR-related patterns
echo "=== GDPR Patterns ==="
grep -rn "consent\|gdpr\|privacy\|cookie" --include="*.ts" --include="*.tsx" -i 2>/dev/null | head -20

# Find data retention patterns
echo -e "\n=== Data Retention ==="
grep -rn "retention\|delete.*user\|purge\|expire" --include="*.ts" 2>/dev/null | head -20

# Check for audit logging
echo -e "\n=== Audit Logging ==="
grep -rn "audit\|log.*action\|trackEvent" --include="*.ts" 2>/dev/null | head -20

# Find PII handling
echo -e "\n=== PII Handling ==="
grep -rn "email\|phone\|address\|ssn\|social.*security" --include="*.ts" --include="*.tsx" 2>/dev/null | head -20
```

### GDPR Compliance Patterns

```typescript
// ✅ Cookie consent management
interface CookieConsent {
  necessary: boolean;  // Always true
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('cookie-consent');
    if (stored) {
      setConsent(JSON.parse(stored));
    }
  }, []);

  const updateConsent = (newConsent: Partial<CookieConsent>) => {
    const updated = {
      necessary: true,
      analytics: false,
      marketing: false,
      ...consent,
      ...newConsent,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('cookie-consent', JSON.stringify(updated));
    setConsent(updated);
  };

  return { consent, updateConsent };
}

// ✅ Right to be forgotten (data deletion)
export async function deleteUserData(userId: string): Promise<void> {
  const supabase = getServiceSupabase();
  
  // Delete in order respecting foreign keys
  await supabase.from('comments').delete().eq('user_id', userId);
  await supabase.from('posts').delete().eq('user_id', userId);
  await supabase.from('sessions').delete().eq('user_id', userId);
  
  // Anonymize user record (or delete)
  await supabase.from('users').update({
    email: `deleted_${userId}@deleted.local`,
    name: '[Deleted User]',
    deleted_at: new Date().toISOString(),
  }).eq('id', userId);
  
  // Log for audit
  await supabase.from('audit_log').insert({
    action: 'USER_DATA_DELETED',
    user_id: userId,
    performed_at: new Date().toISOString(),
  });
}

// ✅ Data export for portability
export async function exportAllUserData(userId: string): Promise<UserDataExport> {
  const supabase = getServiceSupabase();
  
  const [user, posts, comments] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).single(),
    supabase.from('posts').select('*').eq('user_id', userId),
    supabase.from('comments').select('*').eq('user_id', userId),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    userData: user.data,
    posts: posts.data,
    comments: comments.data,
  };
}
```

### Compliance Checklist by Regulation

| Regulation | Requirement | Implementation |
|------------|-------------|----------------|
| GDPR | Consent | Cookie banner |
| GDPR | Data export | Export endpoint |
| GDPR | Right to delete | Delete endpoint |
| GDPR | Privacy policy | /privacy page |
| SOC 2 | Audit logging | Audit trail table |
| SOC 2 | Access controls | RLS policies |
| CCPA | Opt-out | Do not sell toggle |
| ADA | Accessibility | WCAG 2.1 AA |

---

## Enterprise Readiness Checklist

### Compliance & Standards Scorecard

| Criterion | Weight | Status |
|-----------|--------|--------|
| ESLint configured and passing | 15% | ☐ |
| Prettier configured | 10% | ☐ |
| Pre-commit hooks set up | 10% | ☐ |
| Basic accessibility (images, forms) | 15% | ☐ |
| Keyboard navigation works | 10% | ☐ |
| License compliance verified | 10% | ☐ |
| README complete | 10% | ☐ |
| Privacy policy page | 10% | ☐ |
| Cookie consent (if applicable) | 5% | ☐ |
| Audit logging (if required) | 5% | ☐ |

**Minimum Score for Deployment: 80%**
