/**
 * Code Suggester Prompt Template
 *
 * Generates prompts for suggesting ANZSIC (industry) and FOR (field of research)
 * codes for R&D activities and projects.
 */

import type { CodeSuggestion, CodeSuggestions } from '@/types/ai-review'

// ============================================
// Types
// ============================================

export interface CodeSuggesterPromptInput {
  /** Company name */
  companyName: string
  /** Company industry description */
  industryDescription?: string
  /** Project name */
  projectName: string
  /** Project description */
  projectDescription: string
  /** Activity description (if specific to an activity) */
  activityDescription?: string
}

// ============================================
// System Context
// ============================================

const CODE_SUGGESTER_SYSTEM_CONTEXT = `You are an expert in Australian classification systems for R&D Tax Incentive applications. Your task is to suggest appropriate ANZSIC and FOR codes.

## ANZSIC Codes (Australian and New Zealand Standard Industrial Classification)

ANZSIC codes classify businesses by their primary industry. They have 4 digits:
- First 2 digits: Division and Subdivision
- Last 2 digits: Group and Class

### Common ANZSIC Codes for R&D:
- 5420 - Data Processing, Web Hosting and Electronic Information Storage Services
- 6201 - Computer System Design and Related Services (most common for software R&D)
- 6202 - Computer Consultancy Services
- 6910 - Scientific Research Services
- 6920 - Other Professional, Scientific and Technical Services
- 2411 - Pharmaceutical Manufacturing
- 2419 - Other Pharmaceutical and Medicinal Product Manufacturing
- 2412 - Human Pharmaceutical Manufacturing
- 2531 - Agricultural Machinery Manufacturing
- 3110 - Professional and Scientific Equipment Manufacturing

## FOR Codes (Field of Research)

FOR codes classify research activities by academic discipline. Format varies:
- 2-digit: Broad division (e.g., 08 - Information and Computing Sciences)
- 4-digit: Group (e.g., 0801 - Artificial Intelligence)
- 6-digit: Field (e.g., 080101 - Adaptive Agents and Intelligent Robotics)

### Common FOR Codes for R&D:
- 0801 - Artificial Intelligence and Image Processing
- 0802 - Computation Theory and Mathematics
- 0803 - Computer Software
- 0804 - Data Format
- 0805 - Distributed Computing
- 0806 - Information Systems
- 0807 - Library and Information Studies
- 0899 - Other Information and Computing Sciences
- 0901 - Aerospace Engineering
- 0906 - Electrical and Electronic Engineering
- 0913 - Mechanical Engineering
- 1001 - Agricultural Biotechnology
- 1101 - Medical Biochemistry and Metabolomics

## Selection Guidelines

1. **ANZSIC**: Choose based on the COMPANY's primary industry, not the specific R&D project
2. **FOR**: Choose based on the RESEARCH FIELD of the specific R&D activity
3. Provide confidence scores based on how well the code matches
4. Include rationale explaining why each code was selected`

// ============================================
// Prompt Builder
// ============================================

/**
 * Build a prompt for code suggestion
 */
export function buildCodeSuggesterPrompt(input: CodeSuggesterPromptInput): string {
  const { companyName, industryDescription, projectName, projectDescription, activityDescription } =
    input

  let contextSection = `## Company Information
- **Company Name:** ${companyName}`

  if (industryDescription) {
    contextSection += `
- **Industry:** ${industryDescription}`
  }

  contextSection += `

## R&D Project Information
- **Project Name:** ${projectName}
- **Project Description:** ${projectDescription}`

  if (activityDescription) {
    contextSection += `

## Specific Activity
- **Activity Description:** ${activityDescription}`
  }

  const outputFormat = `

## Required Output Format
Return a JSON object with suggested codes:
{
  "anzsicCodes": [
    {
      "code": "6201",
      "description": "Computer System Design and Related Services",
      "confidence": 85,
      "rationale": "The company primarily develops software solutions..."
    },
    ...
  ],
  "forCodes": [
    {
      "code": "0801",
      "description": "Artificial Intelligence and Image Processing",
      "confidence": 90,
      "rationale": "The R&D activity involves machine learning algorithms..."
    },
    ...
  ]
}

Provide TOP 3 suggestions for each code type, ordered by confidence (highest first).
Return ONLY the JSON object, no additional text or markdown formatting.`

  return `${contextSection}

Based on the company and project information, suggest appropriate ANZSIC and FOR codes.
${outputFormat}`
}

/**
 * Get the system instruction for code suggestion
 */
export function getCodeSuggesterSystemInstruction(): string {
  return CODE_SUGGESTER_SYSTEM_CONTEXT
}

/**
 * Parse and validate code suggestion response
 */
export function parseCodeSuggesterResponse(response: string): CodeSuggestions {
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
        console.error('Code suggester JSON parse error. Raw response:', response.slice(0, 500))
        throw new Error('Could not parse code suggestion response as JSON: ' + (secondError instanceof Error ? secondError.message : 'Invalid JSON'))
      }
    } else {
      console.error('Code suggester no JSON found. Raw response:', response.slice(0, 500))
      throw new Error('Could not parse code suggestion response as JSON: No JSON object found in response')
    }
  }

  const result = parsed as Record<string, unknown>

  const validateCodeArray = (arr: unknown, name: string): CodeSuggestion[] => {
    if (!Array.isArray(arr)) {
      throw new Error(`${name} must be an array`)
    }

    return arr.map((item: unknown, index: number) => {
      const code = item as Record<string, unknown>

      if (typeof code.code !== 'string') {
        throw new Error(`${name}[${index}] missing code`)
      }
      if (typeof code.description !== 'string') {
        throw new Error(`${name}[${index}] missing description`)
      }
      if (typeof code.rationale !== 'string') {
        throw new Error(`${name}[${index}] missing rationale`)
      }

      const confidence = Number(code.confidence)
      if (isNaN(confidence) || confidence < 0 || confidence > 100) {
        throw new Error(`Invalid confidence in ${name}[${index}]`)
      }

      return {
        code: code.code,
        description: code.description,
        confidence,
        rationale: code.rationale,
      }
    })
  }

  return {
    anzsicCodes: validateCodeArray(result.anzsicCodes, 'anzsicCodes'),
    forCodes: validateCodeArray(result.forCodes, 'forCodes'),
  }
}
