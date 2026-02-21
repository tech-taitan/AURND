/**
 * Activity Classifier Prompt Template
 *
 * Generates prompts for classifying R&D activities as CORE, SUPPORTING_DIRECT,
 * or SUPPORTING_DOMINANT_PURPOSE according to ATO definitions.
 */

import type { ClassificationSuggestion } from '@/types/ai-review'
import type { ActivityType } from '@prisma/client'

// ============================================
// Types
// ============================================

export interface ClassifierPromptInput {
  /** Name of the activity to classify */
  activityName: string
  /** Description of the activity */
  activityDescription: string
  /** Technical uncertainty being addressed (if known) */
  technicalUncertainty?: string
  /** List of existing core activities in the project */
  existingCoreActivities?: Array<{
    id: string
    name: string
    description: string
  }>
}

// ============================================
// System Context
// ============================================

const CLASSIFIER_SYSTEM_CONTEXT = `You are an expert in Australian R&D Tax Incentive activity classification. Your task is to classify R&D activities according to ATO definitions.

## Activity Type Definitions

### CORE R&D Activities
Core R&D activities are experimental activities whose outcome cannot be known or determined in advance based on current knowledge, information, or experience, but can only be determined by applying a systematic progression of work that:
- Is based on principles of established science
- Proceeds from hypothesis to experiment, observation, and evaluation, leading to logical conclusions

**Key indicators of CORE activities:**
- Novel technical approach with uncertain outcome
- Systematic experimentation to resolve technical uncertainty
- Generates new knowledge not available in the public domain
- Cannot be resolved by a competent professional using existing knowledge

### SUPPORTING_DIRECT Activities
Supporting activities that are DIRECTLY related to core R&D activities. These are activities that:
- Are directly related to a core R&D activity
- Are undertaken for the dominant purpose of supporting the core activity
- Would not be undertaken without the core activity

**Examples:** Building prototypes, collecting data for experiments, developing test environments

### SUPPORTING_DOMINANT_PURPOSE Activities
Supporting activities where the dominant purpose (>50%) is to support core R&D. These require additional justification showing:
- More than 50% of the activity's purpose is R&D support
- Clear link to specific core activities
- Justification for why R&D is the dominant purpose

**Examples:** Software development where >50% supports R&D, facility modifications primarily for R&D

## Classification Rules
1. If the activity involves resolving TECHNICAL UNCERTAINTY through systematic experimentation → CORE
2. If the activity directly supports a core activity and wouldn't exist without it → SUPPORTING_DIRECT
3. If the activity has mixed purposes but >50% supports R&D → SUPPORTING_DOMINANT_PURPOSE
4. Activities with commercial-only purposes are NOT eligible for any classification`

// ============================================
// Prompt Builder
// ============================================

/**
 * Build a prompt for activity classification
 */
export function buildClassifierPrompt(input: ClassifierPromptInput): string {
  const { activityName, activityDescription, technicalUncertainty, existingCoreActivities } = input

  let contextSection = `## Activity to Classify
- **Activity Name:** ${activityName}
- **Activity Description:** ${activityDescription}`

  if (technicalUncertainty) {
    contextSection += `
- **Technical Uncertainty:** ${technicalUncertainty}`
  }

  let coreActivitiesSection = ''
  if (existingCoreActivities && existingCoreActivities.length > 0) {
    coreActivitiesSection = `

## Existing Core Activities in Project
These are the core R&D activities already defined. If this activity is SUPPORTING, consider which core activity it relates to:
${existingCoreActivities.map((a) => `- **${a.name}** (ID: ${a.id}): ${a.description}`).join('\n')}`
  }

  const outputFormat = `

## Required Output Format
Return a JSON object with exactly this structure:
{
  "type": "CORE" | "SUPPORTING_DIRECT" | "SUPPORTING_DOMINANT_PURPOSE",
  "confidence": <number 0-100>,
  "reasoning": "Detailed explanation of why this classification was chosen (2-4 sentences)",
  "suggestedCoreActivityId": "<ID of related core activity if type is SUPPORTING, otherwise null>"
}

Return ONLY the JSON object, no additional text or markdown formatting.`

  return `${contextSection}${coreActivitiesSection}

Based on the activity information and ATO definitions, classify this activity and explain your reasoning.
${outputFormat}`
}

/**
 * Get the system instruction for activity classification
 */
export function getClassifierSystemInstruction(): string {
  return CLASSIFIER_SYSTEM_CONTEXT
}

/**
 * Parse and validate classification response
 */
export function parseClassifierResponse(response: string): ClassificationSuggestion {
  // Try to parse as JSON
  let parsed: unknown

  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
  const textToParse = jsonMatch ? jsonMatch[1].trim() : response.trim()

  try {
    parsed = JSON.parse(textToParse)
  } catch (firstError) {
    const objectMatch = response.match(/\{[\s\S]*\}/)
    if (objectMatch) {
      try {
        parsed = JSON.parse(objectMatch[0])
      } catch (secondError) {
        console.error('Classification JSON parse error. Raw response:', response.slice(0, 500))
        throw new Error('Could not parse classification response as JSON: ' + (secondError instanceof Error ? secondError.message : 'Invalid JSON'))
      }
    } else {
      console.error('Classification no JSON found. Raw response:', response.slice(0, 500))
      throw new Error('Could not parse classification response as JSON: No JSON object found in response')
    }
  }

  const result = parsed as Record<string, unknown>

  // Validate type
  const validTypes: ActivityType[] = ['CORE', 'SUPPORTING_DIRECT', 'SUPPORTING_DOMINANT_PURPOSE']
  if (!validTypes.includes(result.type as ActivityType)) {
    throw new Error(`Invalid activity type: ${result.type}`)
  }

  // Validate confidence
  const confidence = Number(result.confidence)
  if (isNaN(confidence) || confidence < 0 || confidence > 100) {
    throw new Error(`Invalid confidence score: ${result.confidence}`)
  }

  if (typeof result.reasoning !== 'string') {
    throw new Error('Classification response missing reasoning')
  }

  return {
    type: result.type as ActivityType,
    confidence,
    reasoning: result.reasoning,
    suggestedCoreActivityId:
      typeof result.suggestedCoreActivityId === 'string' ? result.suggestedCoreActivityId : undefined,
  }
}
