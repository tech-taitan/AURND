/**
 * Activity Classifier Service
 *
 * Classifies R&D activities as CORE, SUPPORTING_DIRECT, or SUPPORTING_DOMINANT_PURPOSE.
 */

import type { ClassificationSuggestion } from '@/types/ai-review'
import { getGeminiService } from './gemini.service'
import {
  buildClassifierPrompt,
  getClassifierSystemInstruction,
  parseClassifierResponse,
  type ClassifierPromptInput,
} from './prompts/activity-classifier'

export class ActivityClassifierService {
  /**
   * Classify an R&D activity
   */
  async classify(input: ClassifierPromptInput): Promise<ClassificationSuggestion> {
    const gemini = getGeminiService()

    const prompt = buildClassifierPrompt(input)
    const systemInstruction = getClassifierSystemInstruction()

    try {
      const response = await gemini.generateContent(prompt, {
        systemInstruction,
        temperature: 0.3, // Low temperature for consistent classification
        maxOutputTokens: 1024,
        jsonMode: true, // Force JSON response
      })

      return parseClassifierResponse(response.text)
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Activity classification failed: ${error.message}`)
      }
      throw error
    }
  }
}

// Singleton instance
let instance: ActivityClassifierService | null = null

export function getActivityClassifierService(): ActivityClassifierService {
  if (!instance) {
    instance = new ActivityClassifierService()
  }
  return instance
}

export function resetActivityClassifierService(): void {
  instance = null
}
