import { describe, it, expect, afterEach } from 'vitest'
import { resetValidatedEnv, validateEnv } from '@/lib/env'
import { withTempEnv } from '../fixtures/env'

afterEach(() => {
  resetValidatedEnv()
})

describe('Environment Validation', () => {
  it('should validate required environment variables', () => {
    // Since we set up env vars in setup.ts, this should pass
    expect(() => validateEnv()).not.toThrow()
  })

  it('should return validated environment object', () => {
    const env = validateEnv()
    
    expect(env.DATABASE_URL).toBeDefined()
    expect(env.NEXTAUTH_SECRET).toBeDefined()
    expect(env.NEXTAUTH_URL).toBeDefined()
    expect(env.ENCRYPTION_KEY).toBeDefined()
  })

  it('should throw when required variables are missing', () => {
    withTempEnv({ DATABASE_URL: undefined }, () => {
      expect(() => validateEnv()).toThrow('Invalid environment variables')
    })
  })
})
