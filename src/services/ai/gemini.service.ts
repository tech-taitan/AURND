/**
 * Gemini AI Service
 *
 * Foundation service for interacting with Google's Gemini 2.5 Flash model.
 * Provides consistent interface for all AI features with retry logic and error handling.
 */

import {
  GoogleGenerativeAI,
  GenerativeModel,
  GenerateContentResult,
  GenerateContentStreamResult,
} from '@google/generative-ai'

// ============================================
// Types
// ============================================

export interface GeminiGenerateOptions {
  /** Enable streaming response */
  stream?: boolean
  /** Temperature for response randomness (0-1) */
  temperature?: number
  /** Maximum tokens to generate */
  maxOutputTokens?: number
  /** System instruction for the model */
  systemInstruction?: string
  /** Force JSON response format */
  jsonMode?: boolean
}

export interface GeminiResponse {
  /** The generated text content */
  text: string
  /** Token usage statistics */
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

// ============================================
// Constants
// ============================================

const DEFAULT_MODEL = 'gemini-2.5-flash-lite'
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 1000

// ============================================
// Service
// ============================================

export class GeminiService {
  private client: GoogleGenerativeAI
  private model: GenerativeModel

  constructor(modelName: string = DEFAULT_MODEL) {
    const apiKey = process.env.GOOGLE_AI_API_KEY

    if (!apiKey) {
      throw new Error(
        'GOOGLE_AI_API_KEY environment variable is not set. ' +
          'Get your API key from https://aistudio.google.com/app/apikey and add it to your .env.local file.'
      )
    }

    this.client = new GoogleGenerativeAI(apiKey)
    this.model = this.client.getGenerativeModel({ model: modelName })
  }

  /**
   * Generate content using Gemini model (non-streaming)
   */
  async generateContent(
    prompt: string,
    options: GeminiGenerateOptions = {}
  ): Promise<GeminiResponse> {
    const { temperature = 0.7, maxOutputTokens = 4096, systemInstruction, jsonMode = false } = options

    // Build generation config
    const generationConfig: Record<string, unknown> = {
      temperature,
      maxOutputTokens,
    }

    // Add JSON mode if requested
    if (jsonMode) {
      generationConfig.responseMimeType = 'application/json'
    }

    // Configure the model with options
    const model = systemInstruction
      ? this.client.getGenerativeModel({
          model: DEFAULT_MODEL,
          systemInstruction,
          generationConfig,
        })
      : this.client.getGenerativeModel({
          model: DEFAULT_MODEL,
          generationConfig,
        })

    // Execute with retry logic
    const result = await this.executeWithRetry(() => model.generateContent(prompt))

    const response = result.response
    const text = response.text()

    return {
      text,
      usage: response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount ?? 0,
            completionTokens: response.usageMetadata.candidatesTokenCount ?? 0,
            totalTokens: response.usageMetadata.totalTokenCount ?? 0,
          }
        : undefined,
    }
  }

  /**
   * Generate content using Gemini model (streaming)
   */
  async generateContentStream(
    prompt: string,
    options: GeminiGenerateOptions = {}
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const { temperature = 0.7, maxOutputTokens = 4096, systemInstruction } = options

    // Configure the model with options
    const model = systemInstruction
      ? this.client.getGenerativeModel({
          model: DEFAULT_MODEL,
          systemInstruction,
          generationConfig: {
            temperature,
            maxOutputTokens,
          },
        })
      : this.client.getGenerativeModel({
          model: DEFAULT_MODEL,
          generationConfig: {
            temperature,
            maxOutputTokens,
          },
        })

    const result = await this.executeWithRetry(() => model.generateContentStream(prompt))

    return this.streamToGenerator(result)
  }

  /**
   * Generate JSON content with automatic parsing
   */
  async generateJSON<T>(
    prompt: string,
    options: GeminiGenerateOptions = {}
  ): Promise<T> {
    const response = await this.generateContent(prompt, {
      ...options,
      temperature: options.temperature ?? 0.3, // Lower temperature for JSON
    })

    // Extract JSON from response (handle markdown code blocks)
    const jsonText = this.extractJSON(response.text)

    try {
      return JSON.parse(jsonText) as T
    } catch (error) {
      throw new Error(
        `Failed to parse AI response as JSON. Response: ${response.text.slice(0, 500)}...`
      )
    }
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Execute a function with exponential backoff retry logic
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    retries: number = MAX_RETRIES,
    delayMs: number = INITIAL_RETRY_DELAY_MS
  ): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      if (retries <= 0) {
        throw error
      }

      // Check if error is retryable (rate limit, temporary failure)
      if (this.isRetryableError(error)) {
        console.warn(
          `Gemini API error, retrying in ${delayMs}ms... (${retries} retries left)`
        )
        await this.sleep(delayMs)
        return this.executeWithRetry(fn, retries - 1, delayMs * 2)
      }

      throw error
    }
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      return (
        message.includes('rate limit') ||
        message.includes('quota') ||
        message.includes('429') ||
        message.includes('503') ||
        message.includes('500') ||
        message.includes('timeout')
      )
    }
    return false
  }

  /**
   * Extract JSON from a response that might be wrapped in markdown code blocks
   */
  private extractJSON(text: string): string {
    // Try to extract from markdown code block
    const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonBlockMatch) {
      return jsonBlockMatch[1].trim()
    }

    // Try to find raw JSON object or array
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    if (jsonMatch) {
      return jsonMatch[0]
    }

    // Return original text if no JSON found
    return text.trim()
  }

  /**
   * Convert streaming result to async generator
   */
  private async *streamToGenerator(
    result: GenerateContentStreamResult
  ): AsyncGenerator<string, void, unknown> {
    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) {
        yield text
      }
    }
  }

  /**
   * Sleep for a given number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// ============================================
// Singleton Export
// ============================================

let geminiServiceInstance: GeminiService | null = null

/**
 * Get the singleton GeminiService instance
 */
export function getGeminiService(): GeminiService {
  if (!geminiServiceInstance) {
    geminiServiceInstance = new GeminiService()
  }
  return geminiServiceInstance
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetGeminiService(): void {
  geminiServiceInstance = null
}
