import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 32

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required')
  }
  // Decode the base64-encoded 32-byte key directly
  const decoded = Buffer.from(key, 'base64')
  if (decoded.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be a base64-encoded 32-byte key')
  }
  return decoded
}

export function encrypt(text: string): string {
  if (!text) return text

  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const salt = crypto.randomBytes(SALT_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()

  // Combine salt + iv + authTag + encrypted data
  const combined = Buffer.concat([
    salt,
    iv,
    authTag,
    Buffer.from(encrypted, 'hex'),
  ])

  return combined.toString('base64')
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText

  try {
    const key = getEncryptionKey()
    const combined = Buffer.from(encryptedText, 'base64')

    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH)
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
    const authTag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
    )
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH)

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted)
    decrypted = Buffer.concat([decrypted, decipher.final()])

    return decrypted.toString('utf8')
  } catch {
    // Return empty string if decryption fails (for backward compatibility)
    return ''
  }
}

// Utility to check if a string is encrypted
export function isEncrypted(text: string): boolean {
  if (!text) return false
  try {
    const decoded = Buffer.from(text, 'base64')
    // Check if it has the expected minimum length
    return decoded.length >= SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH + 1
  } catch {
    return false
  }
}

// Hash sensitive data for comparison without decryption
export function hashForComparison(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex')
}
