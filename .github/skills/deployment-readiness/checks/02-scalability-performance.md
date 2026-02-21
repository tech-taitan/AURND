# Level 3: Scalability & Performance Deep Checks

## Overview
This document provides comprehensive detection patterns and remediation guidance for scalability and performance issues critical to enterprise deployment.

---

## 1. Caching Strategy Analysis

### Detection Commands
```bash
# Check for React memoization
echo "=== React Memoization Usage ==="
grep -rn "useMemo\|useCallback\|React.memo" --include="*.tsx" --include="*.ts"

# Find expensive computations without memoization
echo -e "\n=== Potential Unmemoized Computations ==="
grep -rn "\.filter(\|\.map(\|\.reduce(\|\.sort(" --include="*.tsx" | grep -v "useMemo"

# Check for API response caching
echo -e "\n=== Cache Headers in API Routes ==="
grep -rn "Cache-Control\|stale-while-revalidate\|max-age" --include="*.ts" api/

# Find SWR/React Query usage (data caching)
echo -e "\n=== Data Fetching Libraries ==="
grep -rn "useSWR\|useQuery\|@tanstack/react-query" --include="*.tsx" --include="*.ts"

# Check Vercel edge caching config
echo -e "\n=== Vercel Caching Configuration ==="
grep -rn "cache\|revalidate" vercel.json 2>/dev/null
```

### Caching Patterns

```typescript
// ❌ Anti-pattern: Expensive computation on every render
function UserList({ users }: Props) {
  const sortedUsers = users.sort((a, b) => a.name.localeCompare(b.name));
  return <>{sortedUsers.map(user => <UserCard key={user.id} user={user} />)}</>;
}

// ✅ Correct: Memoized computation
function UserList({ users }: Props) {
  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.name.localeCompare(b.name)),
    [users]
  );
  return <>{sortedUsers.map(user => <UserCard key={user.id} user={user} />)}</>;
}

// ✅ Correct: Memoized callback
function SearchInput({ onSearch }: Props) {
  const debouncedSearch = useCallback(
    debounce((term: string) => onSearch(term), 300),
    [onSearch]
  );
  return <input onChange={e => debouncedSearch(e.target.value)} />;
}
```

### Severity Matrix - Caching

| Issue | Severity | Impact | Threshold |
|-------|----------|--------|-----------|
| No memoization with large lists | P1-High | UI jank, poor UX | Lists >50 items |
| Missing API cache headers | P2-Medium | Excess network requests | All GET endpoints |
| No data fetching cache | P2-Medium | Redundant API calls | Frequently accessed data |
| Missing static asset caching | P1-High | Slow page loads | All static assets |

---

## 2. Lazy Loading & Code Splitting

### Detection Commands
```bash
# Check for React.lazy usage
echo "=== Lazy Loading ==="
grep -rn "React.lazy\|lazy(" --include="*.tsx" --include="*.ts"

# Find dynamic imports
echo -e "\n=== Dynamic Imports ==="
grep -rn "import(\|dynamic(" --include="*.tsx" --include="*.ts"

# Check for Suspense boundaries
echo -e "\n=== Suspense Boundaries ==="
grep -rn "<Suspense\|Suspense>" --include="*.tsx"

# Analyze bundle entry points
echo -e "\n=== Vite/Webpack Code Splitting Config ==="
grep -rn "manualChunks\|splitChunks\|rollupOptions" vite.config.ts 2>/dev/null

# Find heavy imports at top level
echo -e "\n=== Potentially Heavy Top-Level Imports ==="
grep -rn "^import.*from.*lodash\|^import.*from.*moment\|^import.*from.*chart" --include="*.tsx" --include="*.ts"
```

### Lazy Loading Patterns

```typescript
// ❌ Anti-pattern: Eager loading of heavy component
import HeavyChart from './HeavyChart';

function Dashboard() {
  return <HeavyChart data={data} />;
}

// ✅ Correct: Lazy loading with Suspense
const HeavyChart = lazy(() => import('./HeavyChart'));

function Dashboard() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <HeavyChart data={data} />
    </Suspense>
  );
}

// ✅ Route-based code splitting (Next.js/Vite)
// Automatic with file-based routing

// ✅ Manual chunk optimization (vite.config.ts)
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
  },
});
```

### Code Splitting Checklist

| Route/Feature | Should Lazy Load | Reason |
|---------------|------------------|--------|
| Admin pages | ✅ Yes | Low traffic, heavy |
| Dashboard charts | ✅ Yes | Heavy dependencies |
| Auth pages | ❌ No | Critical path |
| Home page | ❌ No | First impression |
| Modals/Dialogs | ✅ Yes | Not immediately visible |
| Heavy editors | ✅ Yes | Large bundle impact |

---

## 3. Database Query Optimization

### Detection Commands
```bash
# Find N+1 query patterns (loops with queries)
echo "=== Potential N+1 Queries ==="
grep -B5 -A5 "for.*of\|\.forEach\|\.map(" --include="*.ts" | grep -A5 -B5 "supabase\|\.from(\|\.select("

# Check for missing select specificity
echo -e "\n=== Select * Patterns ==="
grep -rn "\.select(\s*)\|\.select(\s*\"\*\"\s*)" --include="*.ts"

# Find queries without limits
echo -e "\n=== Queries Without Limits ==="
grep -rn "\.from(" --include="*.ts" | grep -v "\.limit(\|\.range("

# Check for proper joins
echo -e "\n=== Join Patterns ==="
grep -rn "\.select(.*,.*(\|\.select(\`" --include="*.ts"

# Find real-time subscriptions
echo -e "\n=== Real-time Subscriptions ==="
grep -rn "\.on(\|\.subscribe(\|channel(" --include="*.ts"
```

### Supabase Query Optimization

```typescript
// ❌ Anti-pattern: N+1 query
async function getUsersWithPosts() {
  const { data: users } = await supabase.from('users').select('*');
  
  for (const user of users) {
    const { data: posts } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', user.id);
    user.posts = posts;
  }
  return users;
}

// ✅ Correct: Single query with join
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
        created_at
      )
    `)
    .limit(50);
  return data;
}

// ✅ Correct: Specific column selection
const { data } = await supabase
  .from('users')
  .select('id, name, avatar_url')  // Only needed columns
  .eq('active', true)
  .limit(20);

// ✅ Correct: Pagination
const { data, count } = await supabase
  .from('posts')
  .select('*', { count: 'exact' })
  .range(0, 9)  // First 10 items
  .order('created_at', { ascending: false });
```

### Query Performance Matrix

| Pattern | Performance Impact | Detection | Fix |
|---------|-------------------|-----------|-----|
| SELECT * | Medium | `select()` empty/star | Specify columns |
| N+1 queries | Critical | Loop + query | Use joins |
| Missing pagination | High | No `.limit()` | Add pagination |
| No indexing | High | Slow queries | Add DB indexes |
| Unfiltered queries | Medium | No `.eq()` etc | Add filters |

---

## 4. Bundle Size Optimization

### Detection Commands
```bash
# Check bundle analysis configuration
echo "=== Bundle Analysis Setup ==="
grep -rn "rollup-plugin-visualizer\|webpack-bundle-analyzer\|source-map-explorer" package.json

# Find large dependencies
echo -e "\n=== Potentially Large Dependencies ==="
grep -rn "\"moment\"\|\"lodash\"\|\"@mui\"\|\"antd\"" package.json

# Check for tree-shaking friendly imports
echo -e "\n=== Import Patterns ==="
grep -rn "import \* as\|import { .*, .*, .*, " --include="*.ts" --include="*.tsx" | head -20

# Find duplicate functionality
echo -e "\n=== Date Libraries ==="
grep -rn "moment\|dayjs\|date-fns\|luxon" --include="*.ts" --include="*.tsx"

# Check for dev dependencies in production
echo -e "\n=== Dev Dependencies Check ==="
grep -A100 "\"dependencies\":" package.json | grep -B100 "\"devDependencies\":"
```

### Bundle Optimization Patterns

```typescript
// ❌ Anti-pattern: Import entire library
import _ from 'lodash';
const sorted = _.sortBy(items, 'name');

// ✅ Correct: Import specific function
import sortBy from 'lodash/sortBy';
const sorted = sortBy(items, 'name');

// ❌ Anti-pattern: Heavy date library
import moment from 'moment';

// ✅ Correct: Lightweight alternative
import { format, parseISO } from 'date-fns';

// ✅ Correct: Native Intl API
const formatted = new Intl.DateTimeFormat('en-US').format(date);
```

### Bundle Size Thresholds

| Chunk | Warning | Critical | Action |
|-------|---------|----------|--------|
| Main bundle | >200KB | >500KB | Code split |
| Vendor chunk | >300KB | >1MB | Tree shake |
| Individual route | >100KB | >300KB | Lazy load |
| Total initial | >500KB | >1MB | Optimize |

---

## 5. Image Optimization

### Detection Commands
```bash
# Find unoptimized image usage
echo "=== Image Tag Usage ==="
grep -rn "<img\s" --include="*.tsx" | grep -v "next/image\|Image"

# Check for Next.js Image component
echo -e "\n=== Optimized Image Usage ==="
grep -rn "next/image\|<Image" --include="*.tsx"

# Find large image files
echo -e "\n=== Large Image Files ==="
find . -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.gif" \) -size +100k 2>/dev/null

# Check for lazy loading
echo -e "\n=== Lazy Loading Images ==="
grep -rn "loading=\"lazy\"\|loading='lazy'" --include="*.tsx"

# Find SVG usage
echo -e "\n=== SVG Patterns ==="
grep -rn "\.svg\|<svg" --include="*.tsx" | head -20
```

### Image Optimization Patterns

```tsx
// ❌ Anti-pattern: Unoptimized image
<img src="/hero.jpg" alt="Hero" />

// ✅ Correct: Next.js Image (if using Next.js)
import Image from 'next/image';
<Image 
  src="/hero.jpg" 
  alt="Hero"
  width={1200}
  height={600}
  priority  // For above-fold images
/>

// ✅ Correct: Native lazy loading
<img 
  src="/below-fold.jpg" 
  alt="Content"
  loading="lazy"
  decoding="async"
  width="400"
  height="300"
/>

// ✅ Correct: Responsive images
<picture>
  <source srcSet="/hero.webp" type="image/webp" />
  <source srcSet="/hero.jpg" type="image/jpeg" />
  <img src="/hero.jpg" alt="Hero" loading="lazy" />
</picture>
```

---

## 6. Memory Management

### Detection Commands
```bash
# Find useEffect without cleanup
echo "=== useEffect Without Cleanup ==="
grep -A10 "useEffect(" --include="*.tsx" | grep -B10 "^\s*}\s*,\s*\[" | grep -v "return"

# Check for event listener cleanup
echo -e "\n=== Event Listeners ==="
grep -rn "addEventListener\|removeEventListener" --include="*.tsx" --include="*.ts"

# Find subscription patterns
echo -e "\n=== Subscriptions ==="
grep -rn "subscribe\|unsubscribe\|\.on(" --include="*.tsx" --include="*.ts"

# Check for setInterval/setTimeout cleanup
echo -e "\n=== Timer Patterns ==="
grep -rn "setInterval\|setTimeout\|clearInterval\|clearTimeout" --include="*.tsx" --include="*.ts"

# Find potential memory leaks with refs
echo -e "\n=== Ref Patterns ==="
grep -rn "useRef\|createRef" --include="*.tsx"
```

### Memory Management Patterns

```typescript
// ❌ Anti-pattern: No cleanup
useEffect(() => {
  const subscription = dataService.subscribe(handleData);
  // Memory leak! No cleanup
}, []);

// ✅ Correct: With cleanup
useEffect(() => {
  const subscription = dataService.subscribe(handleData);
  return () => {
    subscription.unsubscribe();
  };
}, []);

// ❌ Anti-pattern: No AbortController
useEffect(() => {
  fetch('/api/data')
    .then(res => res.json())
    .then(setData);
}, []);

// ✅ Correct: With AbortController
useEffect(() => {
  const controller = new AbortController();
  
  fetch('/api/data', { signal: controller.signal })
    .then(res => res.json())
    .then(setData)
    .catch(err => {
      if (err.name !== 'AbortError') throw err;
    });
    
  return () => controller.abort();
}, []);

// ✅ Correct: Timer cleanup
useEffect(() => {
  const intervalId = setInterval(checkStatus, 5000);
  return () => clearInterval(intervalId);
}, []);
```

### Memory Leak Severity

| Pattern | Severity | Detection | Impact |
|---------|----------|-----------|--------|
| Uncleared intervals | P0-Critical | Timer without clear | CPU, memory |
| Unclosed subscriptions | P1-High | No unsubscribe | Memory growth |
| Event listener leaks | P1-High | No removeEventListener | Memory, events |
| Unfetched abort | P2-Medium | No AbortController | Stale state |
| Large ref storage | P3-Low | Ref holding large data | Memory pressure |

---

## Enterprise Readiness Checklist

### Scalability & Performance Scorecard

| Criterion | Weight | Status |
|-----------|--------|--------|
| Memoization for expensive operations | 15% | ☐ |
| Route-based code splitting | 15% | ☐ |
| No N+1 database queries | 15% | ☐ |
| API response caching | 10% | ☐ |
| Bundle size <500KB initial | 10% | ☐ |
| Image optimization | 10% | ☐ |
| useEffect cleanup in all components | 10% | ☐ |
| Pagination for large datasets | 10% | ☐ |
| Lazy loading for below-fold content | 5% | ☐ |

**Minimum Score for Deployment: 80%**

---

## Performance Testing Commands

```bash
# Lighthouse CI (if configured)
npx lhci autorun

# Bundle size check
npm run build && ls -la dist/assets/*.js

# Check for performance regressions
# Compare with baseline metrics

# Memory profiling (browser DevTools)
# Record heap snapshots before/after navigation
```
