/**
 * AI Validation Service
 *
 * Validates AI-generated content against R&D Tax Incentive guidelines.
 * Uses AI to self-check outputs for compliance.
 */

import type {
  AiReviewResult,
  ValidationFeedback,
  ValidationIssue,
  ValidationStatus,
} from '@/types/ai-review'
import { getGeminiService } from './gemini.service'

// ============================================
// System Context
// ============================================

const VALIDATION_SYSTEM_CONTEXT = `You are an expert reviewer of Australian R&D Tax Incentive documentation. Your task is to validate AI-generated content for compliance with ATO requirements.

## Validation Criteria

### 1. H-E-C Documentation
- Hypothesis must describe TECHNICAL uncertainty, not commercial/financial
- Experiment must show SYSTEMATIC methodology, not trial-and-error
- Conclusion must demonstrate knowledge generation
- All sections should be written in past tense
- Each section should be 2-4 sentences

### 2. Activity Classification
- CORE activities must involve genuine technical uncertainty
- SUPPORTING activities must clearly link to a core activity
- Classification reasoning must reference ATO definitions
- Confidence scores should reflect actual certainty

### 3. Technical Uncertainty Statements
- Must follow format: "It was not known whether X because Y"
- Must describe TECHNICAL challenges, not business/commercial issues
- Must identify specific KNOWLEDGE GAPS
- Should not be vague or generic

### 4. Dominant Purpose Justifications
- Must reference the specific linked core activity
- Must explain HOW the activity supports R&D
- Must justify WHY R&D is >50% of purpose
- Should not focus on commercial benefits

## Validation Output
- "passed" - Content meets ATO requirements
- "needs_refinement" - Content has issues that should be addressed
- "failed" - Content has serious compliance issues`

// ============================================
// Service
// ============================================

export class ValidationService {
  /**
   * Validate AI-generated review results
   */
  async validate(reviewResult: AiReviewResult): Promise<ValidationFeedback> {
    const issues: ValidationIssue[] = []

    // Validate H-E-C if present
    if (reviewResult.hec) {
      const hecIssues = await this.validateHec(reviewResult.hec)
      issues.push(...hecIssues)
    }

    // Validate classification if present
    if (reviewResult.classification) {
      const classificationIssues = this.validateClassification(reviewResult.classification)
      issues.push(...classificationIssues)
    }

    // Validate uncertainty statements if present
    if (reviewResult.uncertaintyStatements) {
      const uncertaintyIssues = this.validateUncertainty(reviewResult.uncertaintyStatements)
      issues.push(...uncertaintyIssues)
    }

    // Validate dominant purpose if present
    if (reviewResult.dominantPurpose) {
      const dominantIssues = this.validateDominantPurpose(reviewResult.dominantPurpose)
      issues.push(...dominantIssues)
    }

    // Determine overall status
    const status = this.determineStatus(issues)

    return { status, issues }
  }

  /**
   * Use AI to validate H-E-C content
   */
  private async validateHec(
    hec: NonNullable<AiReviewResult['hec']>
  ): Promise<ValidationIssue[]> {
    const gemini = getGeminiService()
    const issues: ValidationIssue[] = []

    const prompt = `Validate this H-E-C documentation for R&D Tax Incentive compliance:

HYPOTHESIS: ${hec.hypothesis}
EXPERIMENT: ${hec.experiment}
OBSERVATION: ${hec.observation}
EVALUATION: ${hec.evaluation}
CONCLUSION: ${hec.conclusion}

Check for these issues:
1. Does the hypothesis describe TECHNICAL uncertainty (not commercial)?
2. Does the experiment show SYSTEMATIC methodology?
3. Is the content written in past tense?
4. Are sections appropriate length (2-4 sentences)?

Return JSON:
{
  "issues": [
    {"field": "hypothesis", "message": "Issue description", "suggestion": "How to fix"},
    ...
  ]
}
Return empty issues array if no problems found.`

    try {
      const response = await gemini.generateJSON<{ issues: ValidationIssue[] }>(prompt, {
        systemInstruction: VALIDATION_SYSTEM_CONTEXT,
        temperature: 0.2,
      })
      return response.issues || []
    } catch {
      // If validation fails, return empty (don't block on validation errors)
      return issues
    }
  }

  /**
   * Validate classification suggestion
   */
  private validateClassification(
    classification: NonNullable<AiReviewResult['classification']>
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    // Check confidence threshold
    if (classification.confidence < 50) {
      issues.push({
        field: 'classification',
        message: `Low confidence classification (${classification.confidence}%). Consider reviewing the activity description.`,
        suggestion: 'Provide more detailed activity description to improve classification accuracy.',
      })
    }

    // Check for missing reasoning
    if (!classification.reasoning || classification.reasoning.length < 50) {
      issues.push({
        field: 'classification',
        message: 'Classification reasoning is too brief.',
        suggestion: 'Reasoning should explain why this activity meets the criteria for the selected type.',
      })
    }

    // Check for missing core activity link for supporting types
    if (
      (classification.type === 'SUPPORTING_DIRECT' ||
        classification.type === 'SUPPORTING_DOMINANT_PURPOSE') &&
      !classification.suggestedCoreActivityId
    ) {
      issues.push({
        field: 'classification',
        message: 'Supporting activity should link to a core activity.',
        suggestion: 'Identify which core R&D activity this supporting activity relates to.',
      })
    }

    return issues
  }

  /**
   * Validate uncertainty statements
   */
  private validateUncertainty(
    statements: NonNullable<AiReviewResult['uncertaintyStatements']>
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    // Check we have at least one statement
    if (statements.length === 0) {
      issues.push({
        field: 'uncertaintyStatements',
        message: 'No technical uncertainty statements generated.',
        suggestion: 'Provide more detail about the technical challenges faced.',
      })
      return issues
    }

    // Check all statements have good confidence
    const lowConfidence = statements.filter((s) => s.confidence < 60)
    if (lowConfidence.length > 0) {
      issues.push({
        field: 'uncertaintyStatements',
        message: `${lowConfidence.length} statement(s) have low confidence scores.`,
        suggestion: 'Review statements with low confidence and ensure they describe technical uncertainty.',
      })
    }

    // Check format compliance
    for (const statement of statements) {
      if (!statement.statement.toLowerCase().includes('it was not known')) {
        issues.push({
          field: 'uncertaintyStatements',
          message: 'Statement does not follow ATO format.',
          suggestion: 'Statement should begin with "It was not known whether..."',
        })
        break
      }
    }

    return issues
  }

  /**
   * Validate dominant purpose justification
   */
  private validateDominantPurpose(
    justification: NonNullable<AiReviewResult['dominantPurpose']>
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    // Check for minimum length
    if (justification.justification.length < 100) {
      issues.push({
        field: 'dominantPurpose',
        message: 'Dominant purpose justification is too brief.',
        suggestion: 'Justification should explain in detail why >50% of the activity supports R&D.',
      })
    }

    // Check for linked activity reference
    if (!justification.linkedCoreActivityId) {
      issues.push({
        field: 'dominantPurpose',
        message: 'Justification missing linked core activity reference.',
        suggestion: 'Must specify which core R&D activity this supporting activity relates to.',
      })
    }

    return issues
  }

  /**
   * Determine overall validation status
   */
  private determineStatus(issues: ValidationIssue[]): ValidationStatus {
    if (issues.length === 0) {
      return 'passed'
    }

    // Check for critical issues (missing required fields, etc.)
    const criticalFields = ['classification', 'dominantPurpose']
    const hasCritical = issues.some(
      (i) => criticalFields.includes(i.field) && i.message.includes('missing')
    )

    if (hasCritical) {
      return 'failed'
    }

    return 'needs_refinement'
  }
}

// Singleton instance
let instance: ValidationService | null = null

export function getValidationService(): ValidationService {
  if (!instance) {
    instance = new ValidationService()
  }
  return instance
}

export function resetValidationService(): void {
  instance = null
}
