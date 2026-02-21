/**
 * Success Scorer Prompt Template
 *
 * Generates prompts for AI-based success likelihood scoring of R&D documentation.
 * The AI evaluates documentation against ATO R&D Tax Incentive standards.
 */

import type { AiReviewResult, RiskFactor, StrengthFactor } from '@/types/ai-review'

// ============================================
// System Context
// ============================================

const SUCCESS_SCORER_SYSTEM_CONTEXT = `You are an expert ATO (Australian Taxation Office) auditor specializing in R&D Tax Incentive claims. Your task is to evaluate R&D documentation and predict the likelihood of successful ATO acceptance.

## Your Evaluation Criteria

Based on ATO guidelines, you assess documentation for:

### 1. Technical Focus (vs Commercial)
- Documentation must describe TECHNICAL challenges and outcomes
- Avoid commercial language: profit, market share, competitive advantage, ROI
- The activity must resolve TECHNICAL uncertainty, not business/market uncertainty

### 2. Systematic Methodology
- Activities must follow a systematic approach, not random trial-and-error
- There should be a clear hypothesis → experiment → conclusion flow
- Variables should be controlled or measured
- The approach should be planned, documented, and repeatable

### 3. Knowledge Generation
- Activities must generate NEW KNOWLEDGE not already available
- Applying existing knowledge is not R&D
- The outcome should contribute to scientific or technological understanding

### 4. Technical Uncertainty
- There must be genuine uncertainty that couldn't be resolved by existing knowledge
- The uncertainty must be TECHNICAL in nature
- It must be clear WHY the outcome was uncertain (knowledge gap)

### 5. Documentation Quality
- H-E-C sections should be complete and detailed
- Past tense (documenting completed work)
- Specific and concrete, not vague
- Appropriate technical terminology

## Common Audit Red Flags
- Future tense (work not yet done)
- Commercial justifications
- Vague descriptions
- Missing technical detail
- Standard industry practices presented as R&D
- Improvement without measurable technical metrics

## Scoring Guidelines
- 80-100: Excellent documentation, high likelihood of acceptance
- 60-79: Good documentation with minor issues, likely to pass with refinement
- 40-59: Moderate issues that may trigger audit questions
- 0-39: Significant issues, high risk of rejection or audit

Be critical but fair. Identify specific issues and provide actionable suggestions.`

// ============================================
// Prompt Builder
// ============================================

/**
 * Build the success scorer prompt from AI review results
 */
export function buildSuccessScorerPrompt(reviewResult: AiReviewResult): string {
  const sections: string[] = []

  sections.push('## R&D Documentation to Evaluate\n')

  // Add H-E-C content if present
  if (reviewResult.hec) {
    sections.push('### H-E-C Documentation')
    sections.push(`**Hypothesis:** ${reviewResult.hec.hypothesis}`)
    sections.push(`**Experiment:** ${reviewResult.hec.experiment}`)
    sections.push(`**Observation:** ${reviewResult.hec.observation}`)
    sections.push(`**Evaluation:** ${reviewResult.hec.evaluation}`)
    sections.push(`**Conclusion:** ${reviewResult.hec.conclusion}`)
    sections.push('')
  }

  // Add classification if present
  if (reviewResult.classification) {
    sections.push('### Activity Classification')
    sections.push(`**Type:** ${reviewResult.classification.type}`)
    sections.push(`**Confidence:** ${reviewResult.classification.confidence}%`)
    sections.push(`**Reasoning:** ${reviewResult.classification.reasoning}`)
    sections.push('')
  }

  // Add uncertainty statements if present
  if (reviewResult.uncertaintyStatements && reviewResult.uncertaintyStatements.length > 0) {
    sections.push('### Technical Uncertainty Statements')
    reviewResult.uncertaintyStatements.forEach((statement, index) => {
      sections.push(`${index + 1}. ${statement.statement}`)
    })
    sections.push('')
  }

  // Add dominant purpose if present
  if (reviewResult.dominantPurpose) {
    sections.push('### Dominant Purpose Justification')
    sections.push(reviewResult.dominantPurpose.justification)
    sections.push('')
  }

  sections.push('---\n')
  sections.push('## Your Task\n')
  sections.push('Evaluate this R&D documentation and provide:')
  sections.push('1. An overall score (0-100) representing likelihood of ATO acceptance')
  sections.push('2. A list of risk factors that decrease the likelihood (issues found)')
  sections.push('3. A list of strength factors that increase the likelihood (positive aspects)')
  sections.push('4. A brief overall assessment summarizing your evaluation')
  sections.push('')
  sections.push('Respond with a JSON object in this exact format:')
  sections.push('```json')
  sections.push('{')
  sections.push('  "aiScore": <number 0-100>,')
  sections.push('  "riskFactors": [')
  sections.push('    {')
  sections.push('      "category": "<language|structure|compliance|clarity|methodology>",')
  sections.push('      "description": "<specific issue found>",')
  sections.push('      "impact": <negative number -10 to -30>,')
  sections.push('      "suggestion": "<how to fix this issue>"')
  sections.push('    }')
  sections.push('  ],')
  sections.push('  "strengthFactors": [')
  sections.push('    {')
  sections.push('      "category": "<methodology|documentation|clarity|technical|compliance>",')
  sections.push('      "description": "<positive aspect found>",')
  sections.push('      "impact": <positive number 5 to 15>')
  sections.push('    }')
  sections.push('  ],')
  sections.push('  "overallAssessment": "<2-3 sentence summary of the evaluation>"')
  sections.push('}')
  sections.push('```')

  return sections.join('\n')
}

/**
 * Get the system instruction for success scoring
 */
export function getSuccessScorerSystemInstruction(): string {
  return SUCCESS_SCORER_SYSTEM_CONTEXT
}

// ============================================
// Response Parser
// ============================================

export interface SuccessScorerResponse {
  aiScore: number
  riskFactors: RiskFactor[]
  strengthFactors: StrengthFactor[]
  overallAssessment: string
}

/**
 * Parse the success scorer response from AI
 */
export function parseSuccessScorerResponse(response: string): SuccessScorerResponse {
  // Try to parse as JSON
  let parsed: unknown

  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
  const textToParse = jsonMatch ? jsonMatch[1].trim() : response.trim()

  try {
    parsed = JSON.parse(textToParse)
  } catch {
    const objectMatch = response.match(/\{[\s\S]*\}/)
    if (objectMatch) {
      try {
        parsed = JSON.parse(objectMatch[0])
      } catch (secondError) {
        console.error('Success scorer JSON parse error. Raw response:', response.slice(0, 500))
        throw new Error(
          'Could not parse success scorer response as JSON: ' +
            (secondError instanceof Error ? secondError.message : 'Invalid JSON')
        )
      }
    } else {
      console.error('Success scorer no JSON found. Raw response:', response.slice(0, 500))
      throw new Error('Could not parse success scorer response as JSON: No JSON object found')
    }
  }

  const result = parsed as Record<string, unknown>

  // Validate and extract aiScore
  const aiScore = typeof result.aiScore === 'number' ? result.aiScore : 50
  const clampedScore = Math.max(0, Math.min(100, aiScore))

  // Validate and extract riskFactors
  const riskFactors: RiskFactor[] = []
  if (Array.isArray(result.riskFactors)) {
    for (const factor of result.riskFactors) {
      if (typeof factor === 'object' && factor !== null) {
        const f = factor as Record<string, unknown>
        riskFactors.push({
          category: typeof f.category === 'string' ? f.category : 'general',
          description: typeof f.description === 'string' ? f.description : '',
          impact: typeof f.impact === 'number' ? Math.min(0, f.impact) : -10,
          suggestion: typeof f.suggestion === 'string' ? f.suggestion : '',
        })
      }
    }
  }

  // Validate and extract strengthFactors
  const strengthFactors: StrengthFactor[] = []
  if (Array.isArray(result.strengthFactors)) {
    for (const factor of result.strengthFactors) {
      if (typeof factor === 'object' && factor !== null) {
        const f = factor as Record<string, unknown>
        strengthFactors.push({
          category: typeof f.category === 'string' ? f.category : 'general',
          description: typeof f.description === 'string' ? f.description : '',
          impact: typeof f.impact === 'number' ? Math.max(0, f.impact) : 5,
        })
      }
    }
  }

  // Extract overall assessment
  const overallAssessment =
    typeof result.overallAssessment === 'string'
      ? result.overallAssessment
      : 'No assessment provided.'

  return {
    aiScore: clampedScore,
    riskFactors,
    strengthFactors,
    overallAssessment,
  }
}
