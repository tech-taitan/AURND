/**
 * Code Suggester Service
 *
 * Suggests ANZSIC (industry) and FOR (field of research) codes for R&D activities.
 */

import type { CodeSuggestions } from '@/types/ai-review'
import { getGeminiService } from './gemini.service'
import {
  buildCodeSuggesterPrompt,
  getCodeSuggesterSystemInstruction,
  parseCodeSuggesterResponse,
  type CodeSuggesterPromptInput,
} from './prompts/code-suggester'

export class CodeSuggesterService {
  /**
   * Suggest ANZSIC and FOR codes for a project/activity
   */
  async suggest(input: CodeSuggesterPromptInput): Promise<CodeSuggestions> {
    const gemini = getGeminiService()

    const prompt = buildCodeSuggesterPrompt(input)
    const systemInstruction = getCodeSuggesterSystemInstruction()

    try {
      const response = await gemini.generateContent(prompt, {
        systemInstruction,
        temperature: 0.3, // Low temperature for accurate code matching
        maxOutputTokens: 1536,
        jsonMode: true, // Force JSON response
      })

      return parseCodeSuggesterResponse(response.text)
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Code suggestion failed: ${error.message}`)
      }
      throw error
    }
  }
}

// Singleton instance
let instance: CodeSuggesterService | null = null

export function getCodeSuggesterService(): CodeSuggesterService {
  if (!instance) {
    instance = new CodeSuggesterService()
  }
  return instance
}

export function resetCodeSuggesterService(): void {
  instance = null
}
