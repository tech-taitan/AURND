/**
 * H-E-C Assistant Service
 *
 * Generates Hypothesis-Experiment-Conclusion documentation using AI.
 */

import type { HecSuggestion } from '@/types/ai-review'
import { getGeminiService } from './gemini.service'
import {
  buildHecPrompt,
  getHecSystemInstruction,
  parseHecResponse,
  type HecPromptInput,
} from './prompts/hec-assistant'

export class HecAssistantService {
  /**
   * Generate H-E-C documentation for a project/activity
   */
  async generate(input: HecPromptInput): Promise<HecSuggestion> {
    const gemini = getGeminiService()

    const prompt = buildHecPrompt(input)
    const systemInstruction = getHecSystemInstruction()

    try {
      const response = await gemini.generateContent(prompt, {
        systemInstruction,
        temperature: 0.4, // Lower temperature for more consistent documentation
        maxOutputTokens: 2048,
        jsonMode: true, // Force JSON response
      })

      return parseHecResponse(response.text)
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`H-E-C generation failed: ${error.message}`)
      }
      throw error
    }
  }
}

// Singleton instance
let instance: HecAssistantService | null = null

export function getHecAssistantService(): HecAssistantService {
  if (!instance) {
    instance = new HecAssistantService()
  }
  return instance
}

export function resetHecAssistantService(): void {
  instance = null
}
