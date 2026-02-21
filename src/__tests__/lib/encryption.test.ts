import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, isEncrypted } from '@/lib/encryption'

describe('Encryption', () => {
  it('should encrypt and decrypt text correctly', () => {
    const originalText = '123456789'
    const encrypted = encrypt(originalText)
    const decrypted = decrypt(encrypted)

    expect(encrypted).not.toBe(originalText)
    expect(decrypted).toBe(originalText)
  })

  it('should return same value for empty strings', () => {
    expect(encrypt('')).toBe('')
    expect(decrypt('')).toBe('')
  })

  it('should produce different ciphertexts for same plaintext', () => {
    const text = '123456789'
    const encrypted1 = encrypt(text)
    const encrypted2 = encrypt(text)

    // Due to random IV, same plaintext should produce different ciphertexts
    expect(encrypted1).not.toBe(encrypted2)
    // But both should decrypt to same value
    expect(decrypt(encrypted1)).toBe(text)
    expect(decrypt(encrypted2)).toBe(text)
  })

  it('should detect encrypted strings', () => {
    const plainText = '123456789'
    const encrypted = encrypt(plainText)

    expect(isEncrypted(encrypted)).toBe(true)
    expect(isEncrypted(plainText)).toBe(false)
  })

  it('should handle special characters', () => {
    const specialText = 'Test!@#$%^&*()_+-=[]{}|;:,.<>?'
    const encrypted = encrypt(specialText)
    const decrypted = decrypt(encrypted)

    expect(decrypted).toBe(specialText)
  })

  it('should handle unicode characters', () => {
    const unicodeText = '日本語テスト 🎉'
    const encrypted = encrypt(unicodeText)
    const decrypted = decrypt(encrypted)

    expect(decrypted).toBe(unicodeText)
  })
})
