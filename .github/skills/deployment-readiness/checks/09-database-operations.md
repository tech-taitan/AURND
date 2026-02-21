# Level 3: Database Operations Deep Checks

## Overview
This document provides comprehensive detection patterns and best practices for database operations, including migrations, query optimization, connection management, and data integrity for Supabase/PostgreSQL environments.

---

## 1. Migration Strategy Analysis

### Detection Commands
```bash
# Check for migration files
echo "=== Migration Files ==="
ls -la migrations/ supabase/migrations/ 2>/dev/null
find . -name "*migration*" -type f 2>/dev/null | grep -v node_modules

# Find schema definition
echo -e "\n=== Database Schema ==="
cat database.sql 2>/dev/null | head -100
cat supabase/schema.sql 2>/dev/null | head -100

# Check for migration tools
echo -e "\n=== Migration Tools ==="
grep -rn "prisma\|drizzle\|supabase.*migration\|knex" package.json 2>/dev/null

# Find manual schema changes
echo -e "\n=== Inline Schema Changes ==="
grep -rn "CREATE TABLE\|ALTER TABLE\|DROP TABLE" --include="*.ts" --include="*.sql" 2>/dev/null | head -20
```

### Migration Best Practices (Supabase)

```sql
-- ✅ Migration file naming: YYYYMMDDHHMMSS_description.sql
-- supabase/migrations/20250122120000_create_users.sql

-- Always include UP migration
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

### Rollback Migration Pattern

```sql
-- ✅ supabase/migrations/20250122120000_create_users_down.sql
-- Keep rollback files for each migration

-- Drop triggers first
DROP TRIGGER IF EXISTS users_updated_at ON users;

-- Drop policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Drop indexes
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_role;

-- Drop table
DROP TABLE IF EXISTS users;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at();
```

### Migration Severity Matrix

| Issue | Severity | Detection |
|-------|----------|-----------|
| No migration files | P0-Critical | Empty migrations/ |
| Missing rollback | P1-High | No *_down.sql files |
| No RLS policies | P0-Critical | Missing ENABLE RLS |
| Missing indexes | P2-Medium | No CREATE INDEX |
| Hardcoded schema changes | P1-High | SQL in .ts files |

---

## 2. Index Optimization Analysis

### Detection Commands
```bash
# Find indexes in schema
echo "=== Current Indexes ==="
grep -rn "CREATE INDEX\|CREATE UNIQUE INDEX" --include="*.sql" 2>/dev/null

# Check for queries without index usage
echo -e "\n=== Query Patterns ==="
grep -rn "\.eq(\|\.filter(\|\.order(" --include="*.ts" 2>/dev/null | head -20

# Find WHERE clauses
echo -e "\n=== Filter Patterns ==="
grep -rn "\.where(\|\.match(\|\.textSearch(" --include="*.ts" 2>/dev/null | head -20

# Check for potential missing indexes
echo -e "\n=== Frequently Filtered Columns ==="
grep -rn "\.eq('[a-z_]*'" --include="*.ts" 2>/dev/null | sed "s/.*\.eq('\([^']*\)'.*/\1/" | sort | uniq -c | sort -rn | head -10
```

### Index Strategy

```sql
-- ✅ Indexes for common query patterns

-- Single column indexes for equality checks
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_status ON posts(status);

-- Composite index for combined filters
CREATE INDEX idx_posts_user_status ON posts(user_id, status);

-- Partial index for active records only
CREATE INDEX idx_posts_active ON posts(created_at) 
  WHERE status = 'published';

-- Full-text search index
CREATE INDEX idx_posts_search ON posts 
  USING GIN (to_tsvector('english', title || ' ' || content));

-- Index for ordering
CREATE INDEX idx_posts_created_at_desc ON posts(created_at DESC);

-- Check index usage (run in Supabase SQL editor)
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
-- FROM pg_stat_user_indexes
-- ORDER BY idx_scan DESC;
```

### When to Add Indexes

| Query Pattern | Recommended Index |
|---------------|-------------------|
| `WHERE column = value` | B-tree on column |
| `WHERE col1 = val AND col2 = val` | Composite (col1, col2) |
| `ORDER BY column` | B-tree on column |
| `WHERE column LIKE 'prefix%'` | B-tree on column |
| `WHERE column @@ query` | GIN for full-text |
| `WHERE jsonb_column @> '{}'` | GIN on JSONB |
| `WHERE column IN (...)` | B-tree on column |

---

## 3. Connection Pooling

### Detection Commands
```bash
# Check Supabase client configuration
echo "=== Supabase Client Config ==="
grep -rn "createClient\|supabaseClient\|createBrowserClient" --include="*.ts" 2>/dev/null

# Find connection patterns
echo -e "\n=== Connection Patterns ==="
grep -rn "supabase\s*=\|new.*Client" --include="*.ts" 2>/dev/null | head -20

# Check for connection reuse
echo -e "\n=== Singleton Pattern ==="
grep -B5 -A5 "export.*supabase\|let supabase" --include="*.ts" 2>/dev/null | head -30
```

### Supabase Connection Best Practices

```typescript
// ✅ services/supabaseService.ts - Singleton client
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Single instance for the entire app
let supabaseInstance: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> {
  if (!supabaseInstance) {
    supabaseInstance = createClient<Database>(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        global: {
          headers: {
            'x-application-name': 'techtaitan',
          },
        },
        // Connection pool settings (for server-side)
        db: {
          schema: 'public',
        },
      }
    );
  }
  return supabaseInstance;
}

// Export singleton
export const supabase = getSupabase();

// ✅ Server-side with service role (API routes only)
export function getServiceSupabase(): SupabaseClient<Database> {
  // NEVER expose this client to the browser
  if (typeof window !== 'undefined') {
    throw new Error('Service client cannot be used in browser');
  }
  
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
```

### Connection Pooling Configuration (Supabase Dashboard)

| Setting | Development | Production |
|---------|-------------|------------|
| Pool Mode | Transaction | Transaction |
| Pool Size | 15 | 50-100 |
| Max Client Conn | 200 | 1000 |
| Connection Timeout | 30s | 15s |
| Idle Timeout | 60s | 30s |

---

## 4. Data Validation & Integrity

### Detection Commands
```bash
# Check for database constraints
echo "=== Database Constraints ==="
grep -rn "CHECK\|UNIQUE\|NOT NULL\|REFERENCES\|FOREIGN KEY" --include="*.sql" 2>/dev/null

# Find application-level validation
echo -e "\n=== Application Validation ==="
grep -rn "z\.object\|z\.string\|z\.number\|\.parse(" --include="*.ts" 2>/dev/null | head -20

# Check for RLS policies
echo -e "\n=== RLS Policies ==="
grep -rn "CREATE POLICY\|ROW LEVEL SECURITY" --include="*.sql" 2>/dev/null
```

### Database Constraints

```sql
-- ✅ Comprehensive table with constraints
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (length(currency) = 3),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Ensure completed_at only set when status is completed
  CONSTRAINT orders_completed_check 
    CHECK (
      (status = 'completed' AND completed_at IS NOT NULL) OR
      (status != 'completed' AND completed_at IS NULL)
    )
);

-- Unique constraint
CREATE UNIQUE INDEX idx_orders_user_pending 
  ON orders(user_id) 
  WHERE status = 'pending';  -- Only one pending order per user
```

### Application-Level Validation

```typescript
// ✅ Zod schema matching database constraints
import { z } from 'zod';

export const orderSchema = z.object({
  user_id: z.string().uuid(),
  status: z.enum(['pending', 'processing', 'completed', 'cancelled']).default('pending'),
  total_amount: z.number().nonnegative(),
  currency: z.string().length(3).default('USD'),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().positive(),
    price: z.number().nonnegative(),
  })).default([]),
});

// Validate before insert
export async function createOrder(data: unknown) {
  const validated = orderSchema.parse(data);
  
  const { data: order, error } = await supabase
    .from('orders')
    .insert(validated)
    .select()
    .single();
    
  if (error) {
    // Handle constraint violations
    if (error.code === '23505') {
      throw new Error('User already has a pending order');
    }
    throw error;
  }
  
  return order;
}
```

---

## 5. Backup & Recovery Strategy

### Detection Commands
```bash
# Check for backup configuration
echo "=== Backup Configuration ==="
grep -rn "backup\|snapshot\|dump" --include="*.yml" --include="*.yaml" --include="*.json" 2>/dev/null

# Find data export utilities
echo -e "\n=== Data Export ==="
grep -rn "pg_dump\|export.*data\|backup" --include="*.ts" --include="*.sh" 2>/dev/null
```

### Supabase Backup Strategy

```typescript
// ✅ Point-in-time recovery is automatic in Supabase Pro
// But implement application-level backups for critical data

// Data export utility (for compliance/audit)
export async function exportUserData(userId: string): Promise<UserDataExport> {
  const supabase = getServiceSupabase(); // Server-side only
  
  // Fetch all user data
  const [userResult, postsResult, commentsResult] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).single(),
    supabase.from('posts').select('*').eq('user_id', userId),
    supabase.from('comments').select('*').eq('user_id', userId),
  ]);
  
  return {
    exportedAt: new Date().toISOString(),
    user: userResult.data,
    posts: postsResult.data,
    comments: commentsResult.data,
  };
}

// Soft delete pattern for data recovery
export async function softDeleteUser(userId: string): Promise<void> {
  await supabase
    .from('users')
    .update({
      deleted_at: new Date().toISOString(),
      email: `deleted_${userId}@deleted.local`, // Anonymize
      name: '[Deleted User]',
    })
    .eq('id', userId);
}
```

### Backup Requirements by Environment

| Environment | Backup Type | Frequency | Retention |
|-------------|-------------|-----------|-----------|
| Development | None | - | - |
| Staging | Daily snapshot | Daily | 7 days |
| Production | PITR + Daily | Continuous | 30 days |
| Production | Full export | Weekly | 90 days |

---

## 6. Query Optimization

### Detection Commands
```bash
# Find N+1 query patterns
echo "=== Potential N+1 Queries ==="
grep -B5 -A5 "for.*of\|\.forEach\|\.map(" --include="*.ts" | grep -B5 -A5 "supabase\|\.from("

# Check for select * patterns
echo -e "\n=== Select * Patterns ==="
grep -rn "\.select(\s*)\|\.select(\"\*\")" --include="*.ts" 2>/dev/null

# Find queries without limits
echo -e "\n=== Queries Without Limits ==="
grep -rn "\.from(" --include="*.ts" 2>/dev/null | grep -v "\.limit(\|\.single(\|\.maybeSingle("

# Check for proper joins
echo -e "\n=== Join Patterns ==="
grep -rn "\.select(\`\|\.select('" --include="*.ts" 2>/dev/null | head -20
```

### Query Optimization Patterns

```typescript
// ❌ N+1 Query Anti-pattern
async function getUsersWithPosts() {
  const { data: users } = await supabase.from('users').select('*');
  
  // N+1 problem: one query per user
  for (const user of users!) {
    const { data: posts } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', user.id);
    user.posts = posts;
  }
  return users;
}

// ✅ Optimized: Single query with join
async function getUsersWithPosts() {
  const { data } = await supabase
    .from('users')
    .select(`
      id,
      name,
      email,
      posts (
        id,
        title,
        status,
        created_at
      )
    `)
    .eq('posts.status', 'published')
    .limit(50);
  return data;
}

// ✅ Specific column selection
async function getPostTitles() {
  const { data } = await supabase
    .from('posts')
    .select('id, title, created_at')  // Only needed columns
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(10);
  return data;
}

// ✅ Pagination
async function getPostsPaginated(page: number, limit: number = 20) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  const { data, count } = await supabase
    .from('posts')
    .select('*', { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });
  
  return {
    data,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  };
}

// ✅ Efficient counting
async function getPostCount(userId: string) {
  const { count } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })  // No data, just count
    .eq('user_id', userId);
  return count;
}

// ✅ Batch operations
async function batchUpdateStatus(ids: string[], status: string) {
  const { data, error } = await supabase
    .from('posts')
    .update({ status, updated_at: new Date().toISOString() })
    .in('id', ids)
    .select();
  return { data, error };
}
```

### Query Performance Checklist

| Pattern | Check | Fix |
|---------|-------|-----|
| N+1 queries | Loops with queries | Use joins |
| SELECT * | No column specification | List columns |
| Missing LIMIT | Unbounded queries | Add limit |
| Missing indexes | Slow filters | Add index |
| Large JOINs | Many nested relations | Limit depth |

---

## Enterprise Readiness Checklist

### Database Operations Scorecard

| Criterion | Weight | Status |
|-----------|--------|--------|
| Migration files exist | 15% | ☐ |
| Rollback migrations available | 10% | ☐ |
| RLS policies on all tables | 15% | ☐ |
| Indexes on filtered columns | 10% | ☐ |
| No N+1 queries | 15% | ☐ |
| Connection pooling configured | 10% | ☐ |
| Data validation (Zod + DB) | 10% | ☐ |
| Backup strategy defined | 10% | ☐ |
| Query pagination | 5% | ☐ |

**Minimum Score for Deployment: 80%**
