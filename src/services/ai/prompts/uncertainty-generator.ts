/**
 * Technical Uncertainty Generator Prompt Template
 *
 * Generates prompts for creating technical uncertainty statements
 * that meet ATO requirements for R&D Tax Incentive claims.
 */

import type { UncertaintySuggestion } from '@/types/ai-review'

// ============================================
// Types
// ============================================

export interface UncertaintyPromptInput {
  /** Name of the activity */
  activityName: string
  /** Description of the activity */
  activityDescription: string
  /** Project context */
  projectDescription?: string
  /** Existing technical uncertainty statement to improve */
  existingUncertainty?: string
}

// ============================================
// System Context
// ============================================

const UNCERTAINTY_SYSTEM_CONTEXT = `You are an expert in Australian R&D Tax Incentive documentation. Your task is to generate technical uncertainty statements that meet ATO requirements.

## What is Technical Uncertainty?

Technical uncertainty exists when the outcome of an activity cannot be known or determined in advance based on current knowledge, information, or experience. It must be:

1. **TECHNICAL in nature** - Related to scientific or technical knowledge gaps
2. **GENUINE uncertainty** - Not just a matter of applying existing solutions
3. **Resolvable through R&D** - Can be addressed through systematic experimentation

## ATO-Compliant Statement Format

Technical uncertainty statements should follow this pattern:
"It was not known whether [specific technical challenge/approach] could be achieved/implemented because [knowledge gap or technical limitation]"

### Good Examples:
- "It was not known whether the machine learning model could achieve 95% accuracy on imbalanced datasets because existing techniques had not been validated for this specific data distribution."
- "It was not known whether the new composite material could withstand temperatures above 500°C while maintaining structural integrity because the interaction between the polymer matrix and ceramic fibres at these temperatures was not documented."

### Bad Examples (NOT technical uncertainty):
- "It was not known whether customers would like the new feature" (Commercial uncertainty)
- "It was not known whether the project would be profitable" (Financial uncertainty)
- "It was not known how long development would take" (Project management)
- "It was not known whether we could find skilled staff" (Resource uncertainty)

## Key Principles

1. Focus on WHAT could not be determined technically, not commercially
2. Identify the specific KNOWLEDGE GAP that existed
3. Show WHY existing knowledge was insufficient
4. Be SPECIFIC about the technical challenge
5. Avoid vague terms like "might work" or "could be better"`

// ============================================
// Prompt Builder
// ============================================

/**
 * Build a prompt for uncertainty statement generation
 */
export function buildUncertaintyPrompt(input: UncertaintyPromptInput): string {
  const { activityName, activityDescription, projectDescription, existingUncertainty } = input

  let contextSection = `## Activity Information
- **Activity Name:** ${activityName}
- **Activity Description:** ${activityDescription}`

  if (projectDescription) {
    contextSection += `
- **Project Context:** ${projectDescription}`
  }

  let improvementSection = ''
  if (existingUncertainty) {
    improvementSection = `

## Existing Statement to Improve
**Current Statement:** ${existingUncertainty}

Please generate improved alternatives that better meet ATO requirements.`
  }

  const outputFormat = `

## Required Output Format
Generate 2-3 alternative technical uncertainty statements. Return a JSON array with this structure:
[
  {
    "statement": "It was not known whether [challenge] could be achieved because [knowledge gap]",
    "isCommercial": false,
    "confidence": <number 0-100 indicating how well this meets ATO requirements>
  },
  ...
]

Mark "isCommercial": true if the statement inadvertently describes commercial/financial/business uncertainty (these will be filtered out).

Return ONLY the JSON array, no additional text or markdown formatting.`

  return `${contextSection}${improvementSection}

Based on the activity information, generate technical uncertainty statements that clearly demonstrate genuine technical uncertainty.
${outputFormat}`
}

/**
 * Get the system instruction for uncertainty generation
 */
export function getUncertaintySystemInstruction(): string {
  return UNCERTAINTY_SYSTEM_CONTEXT
}

/**
 * Parse and validate uncertainty response
 */
export function parseUncertaintyResponse(response: string): UncertaintySuggestion[] {
  // Try to parse as JSON array
  let parsed: unknown

  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
  const textToParse = jsonMatch ? jsonMatch[1].trim() : response.trim()

  try {
    parsed = JSON.parse(textToParse)
  } catch (firstError) {
    const arrayMatch = response.match(/\[[\s\S]*\]/)
    if (arrayMatch) {
      try {
        parsed = JSON.parse(arrayMatch[0])
      } catch (secondError) {
        console.error('Uncertainty JSON parse error. Raw response:', response.slice(0, 500))
        throw new Error('Could not parse uncertainty response as JSON array: ' + (secondError instanceof Error ? secondError.message : 'Invalid JSON'))
      }
    } else {
      console.error('Uncertainty no JSON found. Raw response:', response.slice(0, 500))
      throw new Error('Could not parse uncertainty response as JSON array: No JSON array found in response')
    }
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Uncertainty response must be an array')
  }

  return parsed.map((item: unknown, index: number) => {
    const suggestion = item as Record<string, unknown>

    if (typeof suggestion.statement !== 'string') {
      throw new Error(`Uncertainty suggestion ${index} missing statement`)
    }

    const confidence = Number(suggestion.confidence)
    if (isNaN(confidence) || confidence < 0 || confidence > 100) {
      throw new Error(`Invalid confidence score in suggestion ${index}`)
    }

    return {
      statement: suggestion.statement,
      isCommercial: Boolean(suggestion.isCommercial),
      confidence,
    }
  })
}
