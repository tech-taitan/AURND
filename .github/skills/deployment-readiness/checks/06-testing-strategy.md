# Level 3: Testing Strategy Deep Checks

## Overview
This document provides comprehensive detection patterns and best practices for implementing a robust testing strategy that ensures application quality and deployment confidence.

---

## 1. Unit Test Analysis

### Detection Commands
```bash
# Count test files
echo "=== Test File Count ==="
find . -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "*.spec.tsx" 2>/dev/null | grep -v node_modules | wc -l

# List test files
echo -e "\n=== Test Files ==="
find . -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "*.spec.tsx" 2>/dev/null | grep -v node_modules

# Check test framework setup
echo -e "\n=== Test Framework ==="
grep -rn "vitest\|jest\|mocha\|testing-library" package.json

# Find describe/it blocks
echo -e "\n=== Test Structure ==="
grep -rn "describe(\|it(\|test(" --include="*.test.ts" --include="*.test.tsx" | head -20

# Check for component tests
echo -e "\n=== Component Tests ==="
grep -rn "render(\|screen\.\|fireEvent\|userEvent" --include="*.test.tsx" | head -20
```

### Test File Structure Best Practices

```typescript
// ✅ Well-structured unit test (components/Button.test.tsx)
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  // Group related tests
  describe('rendering', () => {
    it('renders with default props', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('renders with variant styles', () => {
      render(<Button variant="primary">Primary</Button>);
      expect(screen.getByRole('button')).toHaveClass('btn-primary');
    });

    it('renders disabled state', () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('interactions', () => {
    it('calls onClick when clicked', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click</Button>);
      
      await userEvent.click(screen.getByRole('button'));
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick} disabled>Click</Button>);
      
      await userEvent.click(screen.getByRole('button'));
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('has accessible name', () => {
      render(<Button aria-label="Submit form">→</Button>);
      expect(screen.getByRole('button', { name: /submit form/i })).toBeInTheDocument();
    });
  });
});
```

### Unit Test Coverage Targets

| Component Type | Minimum Coverage | Priority Areas |
|---------------|------------------|----------------|
| Utility functions | 90% | Edge cases, error handling |
| React components | 80% | Rendering, interactions |
| Custom hooks | 85% | State changes, effects |
| Services | 80% | API calls, error states |
| Context providers | 75% | State management |

---

## 2. Integration Test Analysis

### Detection Commands
```bash
# Find integration test patterns
echo "=== Integration Tests ==="
find . -name "*.integration.test.ts" -o -name "*integration*" -type f 2>/dev/null | grep -v node_modules

# Check for API mocking
echo -e "\n=== API Mocking ==="
grep -rn "msw\|nock\|mock.*server\|setupServer" --include="*.ts" --include="*.tsx"

# Find database test patterns
echo -e "\n=== Database Tests ==="
grep -rn "test.*database\|beforeEach.*clean\|seed.*data" --include="*.test.ts"

# Check for test containers
echo -e "\n=== Test Containers ==="
grep -rn "testcontainers\|docker.*test" --include="*.ts" package.json
```

### Integration Test Patterns

```typescript
// ✅ API integration test with MSW (services/api.integration.test.ts)
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { apiClient } from './apiClient';

const server = setupServer(
  rest.get('/api/users/:id', (req, res, ctx) => {
    const { id } = req.params;
    return res(
      ctx.json({
        id,
        name: 'Test User',
        email: 'test@example.com',
      })
    );
  }),
  
  rest.post('/api/users', async (req, res, ctx) => {
    const body = await req.json();
    return res(
      ctx.status(201),
      ctx.json({ id: '123', ...body })
    );
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('API Client Integration', () => {
  describe('GET /api/users/:id', () => {
    it('fetches user by ID', async () => {
      const user = await apiClient.getUser('123');
      
      expect(user).toEqual({
        id: '123',
        name: 'Test User',
        email: 'test@example.com',
      });
    });

    it('handles 404 errors', async () => {
      server.use(
        rest.get('/api/users/:id', (req, res, ctx) => {
          return res(ctx.status(404), ctx.json({ error: 'Not found' }));
        })
      );

      await expect(apiClient.getUser('999')).rejects.toThrow('Not found');
    });
  });

  describe('POST /api/users', () => {
    it('creates new user', async () => {
      const newUser = { name: 'New User', email: 'new@example.com' };
      const created = await apiClient.createUser(newUser);
      
      expect(created).toMatchObject(newUser);
      expect(created.id).toBeDefined();
    });
  });
});
```

### Supabase Integration Testing

```typescript
// ✅ Supabase service integration test
import { createClient } from '@supabase/supabase-js';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

// Use test database or local Supabase
const supabase = createClient(
  process.env.TEST_SUPABASE_URL!,
  process.env.TEST_SUPABASE_ANON_KEY!
);

describe('User Service Integration', () => {
  const testUserId = 'test-user-123';

  beforeAll(async () => {
    // Seed test data
    await supabase.from('users').insert({
      id: testUserId,
      email: 'test@example.com',
      name: 'Test User',
    });
  });

  afterEach(async () => {
    // Clean up test data
    await supabase.from('posts').delete().eq('user_id', testUserId);
  });

  afterAll(async () => {
    await supabase.from('users').delete().eq('id', testUserId);
  });

  it('creates a post for user', async () => {
    const { data, error } = await supabase
      .from('posts')
      .insert({ user_id: testUserId, title: 'Test Post' })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.title).toBe('Test Post');
  });
});
```

---

## 3. E2E Test Analysis

### Detection Commands
```bash
# Check for E2E framework
echo "=== E2E Framework ==="
grep -rn "playwright\|cypress\|puppeteer\|selenium" package.json

# Find E2E test files
echo -e "\n=== E2E Test Files ==="
find . -name "*.e2e.ts" -o -name "*.e2e.tsx" -o -name "*.spec.ts" -path "*/e2e/*" 2>/dev/null | grep -v node_modules

# Check E2E configuration
echo -e "\n=== E2E Config ==="
ls -la playwright.config.ts cypress.config.ts 2>/dev/null

# Find page objects
echo -e "\n=== Page Objects ==="
find . -name "*page*.ts" -path "*/e2e/*" -o -name "*page*.ts" -path "*/tests/*" 2>/dev/null | grep -v node_modules
```

### E2E Test Structure (Playwright)

```typescript
// ✅ E2E test with Playwright (e2e/auth.spec.ts)
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('user can sign up', async ({ page }) => {
    // Navigate to signup
    await page.click('text=Sign Up');
    
    // Fill form
    await page.fill('[name="email"]', 'newuser@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.fill('[name="confirmPassword"]', 'SecurePass123!');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Verify success
    await expect(page.locator('text=Welcome')).toBeVisible();
    await expect(page).toHaveURL('/dashboard');
  });

  test('user can log in', async ({ page }) => {
    await page.click('text=Log In');
    
    await page.fill('[name="email"]', 'existing@example.com');
    await page.fill('[name="password"]', 'ExistingPass123!');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.click('text=Log In');
    
    await page.fill('[name="email"]', 'wrong@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });
});

// ✅ Page Object Pattern (e2e/pages/LoginPage.ts)
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('[name="email"]');
    this.passwordInput = page.locator('[name="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('[role="alert"]');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

---

## 4. Test Coverage Analysis

### Detection Commands
```bash
# Check coverage configuration
echo "=== Coverage Configuration ==="
grep -rn "coverage\|coverageThreshold\|coverageReporters" vitest.config.ts jest.config.* package.json 2>/dev/null

# Find coverage reports
echo -e "\n=== Coverage Reports ==="
ls -la coverage/ 2>/dev/null

# Check coverage thresholds
echo -e "\n=== Coverage Thresholds ==="
grep -A10 "coverageThreshold" vitest.config.ts jest.config.* 2>/dev/null
```

### Coverage Configuration (Vitest)

```typescript
// ✅ vitest.config.ts with coverage
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      
      // Files to include
      include: ['src/**/*.{ts,tsx}'],
      
      // Files to exclude
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.d.ts',
        'src/types/**',
        'src/index.tsx',
      ],
      
      // Coverage thresholds
      thresholds: {
        global: {
          branches: 70,
          functions: 75,
          lines: 80,
          statements: 80,
        },
        // Per-file thresholds for critical code
        'src/services/*.ts': {
          branches: 80,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
      
      // Fail CI if thresholds not met
      // Set to true in CI
      all: true,
    },
  },
});
```

### Coverage Targets by Area

| Code Area | Branches | Functions | Lines | Priority |
|-----------|----------|-----------|-------|----------|
| Business logic | 85% | 90% | 90% | Critical |
| API services | 80% | 85% | 85% | High |
| UI components | 70% | 75% | 80% | Medium |
| Utilities | 90% | 95% | 95% | High |
| Hooks | 75% | 80% | 80% | Medium |

---

## 5. Mocking Strategy Analysis

### Detection Commands
```bash
# Find mock implementations
echo "=== Mock Implementations ==="
grep -rn "vi\.mock\|jest\.mock\|mock\(" --include="*.test.ts" --include="*.test.tsx" | head -20

# Check for mock files
echo -e "\n=== Mock Files ==="
find . -name "__mocks__" -type d 2>/dev/null | grep -v node_modules
find . -name "*.mock.ts" 2>/dev/null | grep -v node_modules

# Find spy usage
echo -e "\n=== Spy Usage ==="
grep -rn "vi\.spyOn\|jest\.spyOn" --include="*.test.ts" --include="*.test.tsx" | head -20

# Check for test utilities
echo -e "\n=== Test Utilities ==="
ls -la tests/ test-utils/ __tests__/ 2>/dev/null
```

### Mocking Best Practices

```typescript
// ✅ Service mocking (services/__mocks__/supabaseService.ts)
import { vi } from 'vitest';

export const mockSupabaseService = {
  getUser: vi.fn().mockResolvedValue({ id: '1', name: 'Test User' }),
  createUser: vi.fn().mockResolvedValue({ id: '2', name: 'New User' }),
  updateUser: vi.fn().mockResolvedValue({ id: '1', name: 'Updated User' }),
  deleteUser: vi.fn().mockResolvedValue(undefined),
};

vi.mock('@/services/supabaseService', () => ({
  supabaseService: mockSupabaseService,
}));

// ✅ Usage in test
import { mockSupabaseService } from '@/services/__mocks__/supabaseService';

describe('UserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays user data', async () => {
    mockSupabaseService.getUser.mockResolvedValueOnce({
      id: '123',
      name: 'John Doe',
      email: 'john@example.com',
    });

    render(<UserProfile userId="123" />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('handles error state', async () => {
    mockSupabaseService.getUser.mockRejectedValueOnce(new Error('User not found'));

    render(<UserProfile userId="999" />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});

// ✅ Partial mocking (keep some real implementations)
vi.mock('@/utils/analytics', async () => {
  const actual = await vi.importActual('@/utils/analytics');
  return {
    ...actual,
    trackEvent: vi.fn(), // Mock only trackEvent
  };
});

// ✅ Module-level mock setup (tests/setup.ts)
import { vi } from 'vitest';

// Mock browser APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
const IntersectionObserverMock = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  takeRecords: vi.fn(),
  unobserve: vi.fn(),
}));
vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
```

---

## 6. Test Data Management

### Detection Commands
```bash
# Find fixture files
echo "=== Fixtures ==="
find . -name "fixtures" -type d 2>/dev/null | grep -v node_modules
find . -name "*.fixture.ts" -o -name "*.fixtures.ts" 2>/dev/null | grep -v node_modules

# Check for factory functions
echo -e "\n=== Factory Patterns ==="
grep -rn "factory\|createMock\|buildUser\|build.*Data" --include="*.ts" | grep -v node_modules | head -20

# Find seed data
echo -e "\n=== Seed Data ==="
grep -rn "seed\|testData\|sampleData" --include="*.ts" | head -20
```

### Test Data Factories

```typescript
// ✅ Test data factories (tests/factories/userFactory.ts)
import { faker } from '@faker-js/faker';
import type { User, UserRole } from '@/types';

interface UserOverrides {
  id?: string;
  email?: string;
  name?: string;
  role?: UserRole;
  createdAt?: Date;
}

export function createUser(overrides: UserOverrides = {}): User {
  return {
    id: overrides.id ?? faker.string.uuid(),
    email: overrides.email ?? faker.internet.email(),
    name: overrides.name ?? faker.person.fullName(),
    role: overrides.role ?? 'user',
    createdAt: overrides.createdAt ?? faker.date.past(),
    avatarUrl: faker.image.avatar(),
    ...overrides,
  };
}

export function createUsers(count: number, overrides: UserOverrides = {}): User[] {
  return Array.from({ length: count }, () => createUser(overrides));
}

// ✅ Complex entity factory
interface PostOverrides {
  id?: string;
  title?: string;
  content?: string;
  authorId?: string;
  published?: boolean;
}

export function createPost(overrides: PostOverrides = {}): Post {
  return {
    id: overrides.id ?? faker.string.uuid(),
    title: overrides.title ?? faker.lorem.sentence(),
    content: overrides.content ?? faker.lorem.paragraphs(3),
    authorId: overrides.authorId ?? faker.string.uuid(),
    published: overrides.published ?? true,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
}

// ✅ Usage in tests
describe('PostList', () => {
  it('displays posts', () => {
    const posts = [
      createPost({ title: 'First Post' }),
      createPost({ title: 'Second Post' }),
    ];

    render(<PostList posts={posts} />);

    expect(screen.getByText('First Post')).toBeInTheDocument();
    expect(screen.getByText('Second Post')).toBeInTheDocument();
  });
});
```

---

## Test Commands Cheatsheet

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific file
npm test -- src/components/Button.test.tsx

# Run in watch mode
npm test -- --watch

# Run E2E tests
npm run test:e2e

# Run only changed tests
npm test -- --changed

# Update snapshots
npm test -- --update

# Run with verbose output
npm test -- --verbose
```

---

## Enterprise Readiness Checklist

### Testing Strategy Scorecard

| Criterion | Weight | Status |
|-----------|--------|--------|
| Unit tests exist | 15% | ☐ |
| Component tests with React Testing Library | 15% | ☐ |
| Integration tests for API calls | 15% | ☐ |
| E2E tests for critical flows | 10% | ☐ |
| Coverage thresholds configured | 10% | ☐ |
| Coverage > 70% overall | 10% | ☐ |
| Mocking strategy consistent | 10% | ☐ |
| Test data factories | 5% | ☐ |
| CI runs tests on PR | 10% | ☐ |

**Minimum Score for Deployment: 80%**
