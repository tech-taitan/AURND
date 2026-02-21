import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // NextAuth
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),

  // Encryption
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters'),

  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Optional: Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),

  // Optional: OCR
  OCR_PYTHON_PATH: z.string().optional(),

  // Optional: Google AI (Gemini) for AI-powered features
  GOOGLE_AI_API_KEY: z.string().optional(),

  // Optional: ABR GUID for ABN lookup
  ABR_GUID: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

let validatedEnv: Env | null = null

export function resetValidatedEnv() {
  validatedEnv = null
}

export function validateEnv(): Env {
  if (validatedEnv) return validatedEnv

  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    const errors = parsed.error.issues.map(
      (issue) => `  - ${issue.path.join('.')}: ${issue.message}`
    )
    throw new Error(
      `Invalid environment variables:\n${errors.join('\n')}\n\nPlease check your .env file.`
    )
  }

  validatedEnv = parsed.data
  return validatedEnv
}

// Call validation at startup in non-test environments
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  try {
    validateEnv()
  } catch (error) {
    console.error(error)
    // Don't crash in development, just warn
    if (process.env.NODE_ENV === 'production') {
      process.exit(1)
    }
  }
}

export default validateEnv
