/**
 * Technical Uncertainty Generator Service
 *
 * Generates technical uncertainty statements for R&D activities.
 */

import type { UncertaintySuggestion } from '@/types/ai-review'
import { getGeminiService } from './gemini.service'
import {
  buildUncertaintyPrompt,
  getUncertaintySystemInstruction,
  parseUncertaintyResponse,
  type UncertaintyPromptInput,
} from './prompts/uncertainty-generator'

export class UncertaintyGeneratorService {
  /**
   * Generate technical uncertainty statements for an activity
   */
  async generate(input: UncertaintyPromptInput): Promise<UncertaintySuggestion[]> {
    const gemini = getGeminiService()

    const prompt = buildUncertaintyPrompt(input)
    const systemInstruction = getUncertaintySystemInstruction()

    try {
      const response = await gemini.generateContent(prompt, {
        systemInstruction,
        temperature: 0.5, // Moderate temperature for varied alternatives
        maxOutputTokens: 1536,
        jsonMode: true, // Force JSON response
      })

      const suggestions = parseUncertaintyResponse(response.text)

      // Filter out commercial uncertainty statements
      return suggestions.filter((s) => !s.isCommercial)
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Uncertainty generation failed: ${error.message}`)
      }
      throw error
    }
  }
}

// Singleton instance
let instance: UncertaintyGeneratorService | null = null

export function getUncertaintyGeneratorService(): UncertaintyGeneratorService {
  if (!instance) {
    instance = new UncertaintyGeneratorService()
  }
  return instance
}

export function resetUncertaintyGeneratorService(): void {
  instance = null
}
