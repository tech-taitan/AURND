/**
 * Dominant Purpose Justifier Service
 *
 * Generates dominant purpose justifications for SUPPORTING_DOMINANT_PURPOSE activities.
 */

import type { DominantPurposeJustification } from '@/types/ai-review'
import { getGeminiService } from './gemini.service'
import {
  buildDominantPurposePrompt,
  getDominantPurposeSystemInstruction,
  parseDominantPurposeResponse,
  type DominantPurposePromptInput,
} from './prompts/dominant-purpose'

export class DominantPurposeService {
  /**
   * Generate a dominant purpose justification for a supporting activity
   */
  async generateJustification(
    input: DominantPurposePromptInput
  ): Promise<DominantPurposeJustification> {
    const gemini = getGeminiService()

    const prompt = buildDominantPurposePrompt(input)
    const systemInstruction = getDominantPurposeSystemInstruction()

    try {
      const response = await gemini.generateContent(prompt, {
        systemInstruction,
        temperature: 0.4, // Moderate temperature for varied but accurate justifications
        maxOutputTokens: 1024,
      })

      return parseDominantPurposeResponse(response.text)
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Dominant purpose justification failed: ${error.message}`)
      }
      throw error
    }
  }
}

// Singleton instance
let instance: DominantPurposeService | null = null

export function getDominantPurposeService(): DominantPurposeService {
  if (!instance) {
    instance = new DominantPurposeService()
  }
  return instance
}

export function resetDominantPurposeService(): void {
  instance = null
}
