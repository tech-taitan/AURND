/**
 * Application Drafter Prompt Template
 *
 * Generates prompts for drafting a complete R&D Tax Incentive application
 * using existing client, project, activity, and expenditure data.
 */

import type { ApplicationDraft } from '@/types/ai-review'
import type { ActivityType } from '@prisma/client'

// ============================================
// Types
// ============================================

export interface ApplicationDrafterInput {
  client: {
    companyName: string
    abn: string
    incorporationType?: string
  }
  projects: Array<{
    id: string
    projectName: string
    projectDescription: string
    technicalHypothesis?: string | null
    methodology?: string | null
    technicalUncertainty?: string | null
    expectedOutcome?: string | null
  }>
  activities: Array<{
    id: string
    projectId: string
    activityName: string
    activityType: ActivityType
    activityDescription: string
    hypothesis?: string | null
    experiment?: string | null
    observation?: string | null
    evaluation?: string | null
    conclusion?: string | null
  }>
  expenditureSummary: {
    totalAmount: number
    byCategory: Record<string, number>
  }
}

// ============================================
// System Context
// ============================================

const APPLICATION_DRAFTER_SYSTEM_CONTEXT = `You are an expert Australian R&D Tax Incentive consultant.
Your task is to draft a complete, ATO-compliant R&D application narrative from the provided data.

## Writing Requirements
- Use clear, professional language suitable for ATO review
- Focus on technical uncertainty and systematic experimentation
- Avoid marketing or commercial language
- Use past tense where appropriate
- Ensure each activity includes H-E-C structure
- Summarize expenditure categories and justify eligibility

## Output Requirements
- Return ONLY valid JSON matching the required schema
- Do not include markdown or extra commentary
- Ensure all required fields are present`

// ============================================
// Prompt Builder
// ============================================

export function buildApplicationDrafterPrompt(input: ApplicationDrafterInput): string {
  const { client, projects, activities, expenditureSummary } = input

  const projectSection = projects
    .map(
      (project) => `- [${project.id}] ${project.projectName}: ${project.projectDescription}`
    )
    .join('\n')

  const activitySection = activities
    .map(
      (activity) => `- [${activity.id}] (${activity.projectId}) ${activity.activityName} [${activity.activityType}]\n  Description: ${activity.activityDescription}\n  H: ${activity.hypothesis ?? 'N/A'}\n  E: ${activity.experiment ?? 'N/A'}\n  O: ${activity.observation ?? 'N/A'}\n  Ev: ${activity.evaluation ?? 'N/A'}\n  C: ${activity.conclusion ?? 'N/A'}`
    )
    .join('\n')

  const outputFormat = `\n\n## Required Output Format\nReturn a JSON object with this structure:\n{\n  "executiveSummary": "string",\n  "projectNarratives": [\n    {\n      "projectId": "string",\n      "projectName": "string",\n      "overview": "string",\n      "technicalObjectives": "string",\n      "methodology": "string",\n      "outcomes": "string"\n    }\n  ],\n  "activityDescriptions": [\n    {\n      "activityId": "string",\n      "activityName": "string",\n      "activityType": "CORE|SUPPORTING_DIRECT|SUPPORTING_DOMINANT_PURPOSE",\n      "hypothesis": "string",\n      "experiment": "string",\n      "observation": "string",\n      "evaluation": "string",\n      "conclusion": "string",\n      "uncertaintyStatement": "string"\n    }\n  ],\n  "expenditureSummary": {\n    "totalAmount": 0,\n    "byCategory": {"RSP": 0},\n    "narrative": "string"\n  },\n  "technicalUncertaintyStatement": "string"\n}\nReturn ONLY the JSON object.`

  return `## Client\n- Company: ${client.companyName}\n- ABN: ${client.abn}\n- Incorporation: ${client.incorporationType ?? 'Unknown'}\n\n## Projects\n${projectSection || 'None'}\n\n## Activities\n${activitySection || 'None'}\n\n## Expenditure Summary\n- Total: ${expenditureSummary.totalAmount}\n- By Category: ${JSON.stringify(expenditureSummary.byCategory)}\n\nDraft the application narrative based on the information provided.${outputFormat}`
}

export function getApplicationDrafterSystemInstruction(): string {
  return APPLICATION_DRAFTER_SYSTEM_CONTEXT
}

export function parseApplicationDrafterResponse(response: string): ApplicationDraft {
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
        console.error('Application draft JSON parse error. Raw response:', response.slice(0, 500))
        throw new Error(
          'Could not parse application draft response as JSON: ' +
            (secondError instanceof Error ? secondError.message : 'Invalid JSON')
        )
      }
    } else {
      console.error('Application draft no JSON found. Raw response:', response.slice(0, 500))
      throw new Error('Could not parse application draft response as JSON: No JSON object found in response')
    }
  }

  return parsed as ApplicationDraft
}
