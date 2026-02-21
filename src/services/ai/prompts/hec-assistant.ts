/**
 * H-E-C Assistant Prompt Template
 *
 * Generates prompts for creating Hypothesis-Experiment-Conclusion documentation
 * following the Australian R&D Tax Incentive requirements.
 */

import type { HecSuggestion } from '@/types/ai-review'

// ============================================
// Types
// ============================================

export interface HecPromptInput {
  /** Name of the R&D project */
  projectName: string
  /** Description of the project */
  projectDescription: string
  /** Name of the specific activity (optional) */
  activityName?: string
  /** Description of the specific activity (optional) */
  activityDescription?: string
  /** Any existing hypothesis text to improve upon */
  existingHypothesis?: string
  /** Any existing experiment text to improve upon */
  existingExperiment?: string
}

// ============================================
// System Context
// ============================================

const HEC_SYSTEM_CONTEXT = `You are an expert in Australian R&D Tax Incentive documentation. Your task is to generate high-quality Hypothesis-Experiment-Conclusion (H-E-C) documentation for R&D activities.

## H-E-C Framework Requirements (ATO Guidelines)

The H-E-C framework is used to demonstrate that an activity involves systematic experimentation to resolve technical uncertainty. Each section must clearly show:

### 1. HYPOTHESIS
- State what technical outcome or capability was being investigated
- Identify the specific technical uncertainty that needed resolution
- Frame as: "It was hypothesized that [approach/method] could achieve [technical outcome] because [technical reasoning]"
- Must describe TECHNICAL uncertainty, not commercial, financial, or business uncertainty

### 2. EXPERIMENT
- Describe the systematic methodology used to test the hypothesis
- Include specific technical approaches, tools, technologies, or methods
- Show how variables were controlled or measured
- Demonstrate this was a planned investigation, not trial-and-error without method

### 3. OBSERVATION
- Record what was actually observed during the experimentation
- Include both expected and unexpected results
- Note any technical measurements, data, or outcomes
- This section may be brief if the user needs to fill in specific results

### 4. EVALUATION
- Analyze whether the hypothesis was supported or refuted
- Compare expected outcomes against actual results
- Identify what technical knowledge was gained
- Note any limitations or constraints discovered

### 5. CONCLUSION
- State the outcome of the R&D activity
- Summarize what new technical knowledge was generated
- Indicate whether the technical uncertainty was resolved
- Note implications for future R&D if applicable

## Writing Guidelines
- Write in PAST TENSE (as if documenting completed work)
- Use technical language appropriate to the field
- Each section should be 2-4 sentences
- Be specific and concrete, avoid vague statements
- Focus on TECHNICAL aspects, not business benefits
- Avoid marketing language or commercial justifications`

// ============================================
// Prompt Builder
// ============================================

/**
 * Build a prompt for H-E-C generation
 */
export function buildHecPrompt(input: HecPromptInput): string {
  const {
    projectName,
    projectDescription,
    activityName,
    activityDescription,
    existingHypothesis,
    existingExperiment,
  } = input

  let contextSection = `## Project Information
- **Project Name:** ${projectName}
- **Project Description:** ${projectDescription}`

  if (activityName) {
    contextSection += `
- **Activity Name:** ${activityName}`
  }

  if (activityDescription) {
    contextSection += `
- **Activity Description:** ${activityDescription}`
  }

  let improvementSection = ''
  if (existingHypothesis || existingExperiment) {
    improvementSection = `

## Existing Documentation to Improve
${existingHypothesis ? `**Current Hypothesis:** ${existingHypothesis}` : ''}
${existingExperiment ? `**Current Experiment:** ${existingExperiment}` : ''}

Please improve upon the existing documentation while maintaining its core intent.`
  }

  const outputFormat = `

## Required Output Format
Return a JSON object with exactly this structure:
{
  "hypothesis": "Your generated hypothesis text (2-4 sentences)",
  "experiment": "Your generated experiment methodology text (2-4 sentences)",
  "observation": "Your generated observation text (2-3 sentences, can be general as user may fill in specifics)",
  "evaluation": "Your generated evaluation text (2-4 sentences)",
  "conclusion": "Your generated conclusion text (2-4 sentences)"
}

Return ONLY the JSON object, no additional text or markdown formatting.`

  return `${contextSection}${improvementSection}

Based on the project and activity information provided, generate comprehensive H-E-C documentation that demonstrates genuine R&D activities with technical uncertainty.
${outputFormat}`
}

/**
 * Get the system instruction for H-E-C generation
 */
export function getHecSystemInstruction(): string {
  return HEC_SYSTEM_CONTEXT
}

/**
 * Parse and validate H-E-C response
 */
export function parseHecResponse(response: string): HecSuggestion {
  // Try to parse as JSON
  let parsed: unknown

  // Handle potential markdown code blocks
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
  const textToParse = jsonMatch ? jsonMatch[1].trim() : response.trim()

  try {
    parsed = JSON.parse(textToParse)
  } catch (firstError) {
    // Try to find JSON object in response
    const objectMatch = response.match(/\{[\s\S]*\}/)
    if (objectMatch) {
      try {
        parsed = JSON.parse(objectMatch[0])
      } catch (secondError) {
        console.error('H-E-C JSON parse error. Raw response:', response.slice(0, 500))
        throw new Error('Could not parse H-E-C response as JSON: ' + (secondError instanceof Error ? secondError.message : 'Invalid JSON'))
      }
    } else {
      console.error('H-E-C no JSON found. Raw response:', response.slice(0, 500))
      throw new Error('Could not parse H-E-C response as JSON: No JSON object found in response')
    }
  }

  // Validate structure
  const hec = parsed as Record<string, unknown>
  if (
    typeof hec.hypothesis !== 'string' ||
    typeof hec.experiment !== 'string' ||
    typeof hec.observation !== 'string' ||
    typeof hec.evaluation !== 'string' ||
    typeof hec.conclusion !== 'string'
  ) {
    throw new Error('H-E-C response missing required fields')
  }

  return {
    hypothesis: hec.hypothesis,
    experiment: hec.experiment,
    observation: hec.observation,
    evaluation: hec.evaluation,
    conclusion: hec.conclusion,
  }
}
