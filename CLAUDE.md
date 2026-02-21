# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev              # Start Next.js dev server (http://localhost:3000)
npm run build            # Production build
npm run lint             # ESLint checks

# Testing
npm run test             # Run Vitest
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report

# Database (PostgreSQL via Docker)
npm run db:start         # Start PostgreSQL container
npm run db:stop          # Stop container
npm run db:reset         # Reset database (clears all data)
npm run db:push          # Apply Prisma schema to DB
npm run db:studio        # Open Prisma Studio GUI
npm run db:seed          # Seed data
npm run seed:admin       # Seed admin user
```

## Architecture

**Stack:** Next.js 16 (App Router), React 19, PostgreSQL 16, Prisma 7, NextAuth.js, Tailwind CSS 4, Radix UI

**Multi-tenancy:** Organisation-based isolation. All data queries must filter by `organisationId`.

### Directory Structure

- `src/app/(dashboard)/` - Protected routes (clients, projects, applications, compliance, calculator)
- `src/app/api/` - REST API routes with rate limiting
- `src/actions/` - Server Actions for form submissions and CRUD
- `src/services/` - Business logic layer (all extend `BaseService`)
- `src/components/ui/` - Radix UI wrapper components
- `src/schemas/` - Zod validation schemas
- `src/lib/` - Core utilities (db, auth, encryption, rate-limit)

### Server Actions vs API Routes

**Server Actions** (`src/actions/*.ts`): Used for form submissions. Call service layer, use `revalidatePath()` after mutations, return `ActionResult<T>`.

**API Routes** (`src/app/api/*/route.ts`): REST endpoints for programmatic access. Include rate limiting via `checkRateLimit()`.

### Service Layer Pattern

All services extend `BaseService` and return `ActionResult<T>`:
```typescript
type ActionResult<T> = { success: true; data: T } | { success: false; error: string }
```

Services verify ownership via `organisationId` and log changes to `AuditLog`.

## Database Schema (Key Models)

- `Organisation`, `User` - Multi-tenancy and auth (roles: ADMIN, MANAGER, PRACTITIONER, READONLY)
- `Client`, `StaffMember`, `TimeAllocation` - Client management
- `RDProject`, `RDActivity` - R&D projects (activity types: CORE, SUPPORTING_DIRECT, SUPPORTING_DOMINANT_PURPOSE)
- `Expenditure` - 9 types (RSP, CONTRACT_NON_RSP, SALARY, OTHER, FEEDSTOCK_INPUT, ASSOCIATE_PAID, ASSET_DECLINE, BALANCING_ADJ, CRC_CONTRIBUTION)
- `IncomeYearApplication`, `ComplianceCheck`, `GeneratedDocument` - Applications

## Domain Logic

**Tax Offset Calculation** (in `tax-offset-calculator.service.ts`):
- Refundable (turnover < $20M): 43.5%
- Non-refundable base (intensity ≤ 2%): 38.5%
- Non-refundable premium (intensity > 2%): 46.5%

**Registration Deadline:** Income year end + 10 months

## Environment Variables

Required in `.env.local`:
```
DATABASE_URL="postgresql://postgres:your_password@localhost:5433/rd_tax_app?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<32+ chars>"
ENCRYPTION_KEY="<32+ chars for TFN encryption>"
```

Optional (for AI features):
```
GOOGLE_AI_API_KEY="<from https://aistudio.google.com/app/apikey>"
```

## Initial Setup

```bash
npm install
npm run db:start
npm run db:push
npm run seed:admin
npm run dev
```
