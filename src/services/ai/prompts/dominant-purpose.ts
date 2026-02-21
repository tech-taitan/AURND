/**
 * Dominant Purpose Justification Prompt Template
 *
 * Generates prompts for creating dominant purpose justifications
 * for SUPPORTING_DOMINANT_PURPOSE activities.
 */

import type { DominantPurposeJustification } from '@/types/ai-review'

// ============================================
// Types
// ============================================

export interface DominantPurposePromptInput {
  /** Name of the supporting activity */
  activityName: string
  /** Description of the supporting activity */
  activityDescription: string
  /** The core activity this supports */
  linkedCoreActivity: {
    id: string
    name: string
    description: string
  }
  /** Project context */
  projectDescription?: string
}

// ============================================
// System Context
// ============================================

const DOMINANT_PURPOSE_SYSTEM_CONTEXT = `You are an expert in Australian R&D Tax Incentive documentation. Your task is to generate dominant purpose justifications for supporting R&D activities.

## What is the Dominant Purpose Test?

For a supporting activity to qualify under SUPPORTING_DOMINANT_PURPOSE, you must demonstrate that MORE THAN 50% of the activity's purpose is to support core R&D activities.

## Key Requirements

1. **Quantitative Threshold**: Must show >50% of the activity relates to R&D support
2. **Direct Link**: Must clearly connect to specific core R&D activities
3. **Purpose Focus**: Explain WHY the activity was undertaken, not just what it does
4. **R&D vs Non-R&D**: Acknowledge any non-R&D purposes but show R&D is dominant

## Justification Structure

A good dominant purpose justification should:

1. **State the activity's overall purpose**
2. **Identify the specific core R&D activity it supports**
3. **Explain HOW it supports the core activity**
4. **Demonstrate WHY R&D support is the dominant (>50%) purpose**
5. **Acknowledge any secondary purposes** (if applicable)

## Example Justification

"The development of the automated testing framework was undertaken with the dominant purpose (estimated 70%) of supporting Core Activity 'Machine Learning Model Development'. The framework was specifically designed to validate experimental ML models against benchmark datasets, enabling rapid iteration of the hypothesis testing cycle. While the testing framework has secondary benefits for general quality assurance (approximately 30%), its primary design decisions, architecture, and feature set were driven by the specific requirements of the R&D experimentation process."

## What to Avoid

- Vague statements like "mostly for R&D"
- Missing link to specific core activities
- Focus on commercial benefits rather than R&D support
- Failing to address the >50% threshold`

// ============================================
// Prompt Builder
// ============================================

/**
 * Build a prompt for dominant purpose justification
 */
export function buildDominantPurposePrompt(input: DominantPurposePromptInput): string {
  const { activityName, activityDescription, linkedCoreActivity, projectDescription } = input

  let contextSection = `## Supporting Activity to Justify
- **Activity Name:** ${activityName}
- **Activity Description:** ${activityDescription}`

  if (projectDescription) {
    contextSection += `
- **Project Context:** ${projectDescription}`
  }

  contextSection += `

## Linked Core R&D Activity
- **Core Activity Name:** ${linkedCoreActivity.name}
- **Core Activity ID:** ${linkedCoreActivity.id}
- **Core Activity Description:** ${linkedCoreActivity.description}`

  const outputFormat = `

## Required Output Format
Generate a dominant purpose justification that meets ATO requirements. Return a JSON object:
{
  "justification": "Your detailed justification text (3-5 sentences) explaining why >50% of this activity's purpose is to support the identified core R&D activity. Must reference the core activity by name.",
  "linkedCoreActivityId": "${linkedCoreActivity.id}"
}

The justification MUST:
1. Reference the specific core activity by name
2. Explain HOW this activity supports the core R&D
3. Demonstrate WHY R&D support is the dominant purpose (>50%)
4. Be specific and concrete, not vague

Return ONLY the JSON object, no additional text or markdown formatting.`

  return `${contextSection}

Generate a compelling dominant purpose justification that clearly demonstrates this activity's primary purpose is supporting the linked core R&D activity.
${outputFormat}`
}

/**
 * Get the system instruction for dominant purpose justification
 */
export function getDominantPurposeSystemInstruction(): string {
  return DOMINANT_PURPOSE_SYSTEM_CONTEXT
}

/**
 * Parse and validate dominant purpose response
 */
export function parseDominantPurposeResponse(response: string): DominantPurposeJustification {
  // Try to parse as JSON
  let parsed: unknown

  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
  const textToParse = jsonMatch ? jsonMatch[1].trim() : response.trim()

  try {
    parsed = JSON.parse(textToParse)
  } catch {
    const objectMatch = response.match(/\{[\s\S]*\}/)
    if (objectMatch) {
      parsed = JSON.parse(objectMatch[0])
    } else {
      throw new Error('Could not parse dominant purpose response as JSON')
    }
  }

  const result = parsed as Record<string, unknown>

  if (typeof result.justification !== 'string') {
    throw new Error('Dominant purpose response missing justification')
  }

  if (typeof result.linkedCoreActivityId !== 'string') {
    throw new Error('Dominant purpose response missing linkedCoreActivityId')
  }

  return {
    justification: result.justification,
    linkedCoreActivityId: result.linkedCoreActivityId,
  }
}
