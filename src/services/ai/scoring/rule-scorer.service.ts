/**
 * Rule-Based Scorer Service
 *
 * Scores R&D documentation content against predefined risk factors and strength patterns.
 * Provides deterministic scoring based on pattern matching.
 */

import type { RiskFactor, StrengthFactor } from '@/types/ai-review'
import {
  RISK_FACTORS,
  STRENGTH_PATTERNS,
  HEC_QUALITY_CHECKS,
} from './scoring-rules'

// ============================================
// Types
// ============================================

export type ContentType = 'hec' | 'uncertainty' | 'classification' | 'dominantPurpose'

export interface RuleScoringResult {
  /** Risk factors that matched the content */
  matchedRisks: RiskFactor[]
  /** Strength factors that matched the content */
  matchedStrengths: StrengthFactor[]
  /** Calculated score based on rules (0-100) */
  ruleScore: number
}

export interface HecContent {
  hypothesis: string
  experiment: string
  observation: string
  evaluation: string
  conclusion: string
}

// ============================================
// Service
// ============================================

export class RuleScorerService {
  private readonly baseScore = 70

  /**
   * Score content against predefined rules
   */
  scoreContent(content: string, contentType: ContentType): RuleScoringResult {
    const matchedRisks: RiskFactor[] = []
    const matchedStrengths: StrengthFactor[] = []
    let scoreAdjustment = 0

    // Check risk factors
    for (const rule of RISK_FACTORS) {
      if (!rule.appliesTo.includes(contentType)) continue
      if (rule.impact === 0) continue // Skip neutral rules (used for other purposes)

      const matched = this.checkPatterns(content, rule.patterns)
      if (matched) {
        matchedRisks.push({
          category: rule.category,
          description: rule.description,
          impact: rule.impact,
          suggestion: rule.suggestion,
        })
        scoreAdjustment += rule.impact
      }
    }

    // Check strength patterns
    for (const pattern of STRENGTH_PATTERNS) {
      if (!pattern.appliesTo.includes(contentType)) continue

      const matched = this.checkPatterns(content, pattern.patterns)
      if (matched) {
        matchedStrengths.push({
          category: pattern.category,
          description: pattern.description,
          impact: pattern.impact,
        })
        scoreAdjustment += pattern.impact
      }
    }

    // Calculate final score (clamped to 0-100)
    const ruleScore = Math.max(0, Math.min(100, this.baseScore + scoreAdjustment))

    return {
      matchedRisks,
      matchedStrengths,
      ruleScore,
    }
  }

  /**
   * Score H-E-C documentation with field-specific quality checks
   */
  scoreHec(hec: HecContent): RuleScoringResult {
    const matchedRisks: RiskFactor[] = []
    const matchedStrengths: StrengthFactor[] = []
    let scoreAdjustment = 0

    // Combine all H-E-C fields for general pattern checking
    const combinedContent = [
      hec.hypothesis,
      hec.experiment,
      hec.observation,
      hec.evaluation,
      hec.conclusion,
    ].join(' ')

    // Check general risk factors
    for (const rule of RISK_FACTORS) {
      if (!rule.appliesTo.includes('hec')) continue
      if (rule.impact === 0) continue

      const matched = this.checkPatterns(combinedContent, rule.patterns)
      if (matched) {
        matchedRisks.push({
          category: rule.category,
          description: rule.description,
          impact: rule.impact,
          suggestion: rule.suggestion,
        })
        scoreAdjustment += rule.impact
      }
    }

    // Check general strength patterns
    for (const pattern of STRENGTH_PATTERNS) {
      if (!pattern.appliesTo.includes('hec')) continue

      const matched = this.checkPatterns(combinedContent, pattern.patterns)
      if (matched) {
        matchedStrengths.push({
          category: pattern.category,
          description: pattern.description,
          impact: pattern.impact,
        })
        scoreAdjustment += pattern.impact
      }
    }

    // Apply H-E-C specific quality checks
    for (const check of HEC_QUALITY_CHECKS) {
      const fieldContent = hec[check.field]
      const checkFailed = this.evaluateQualityCheck(fieldContent, check.check, check.value)

      if (checkFailed) {
        matchedRisks.push({
          category: 'structure',
          description: `${check.field}: ${check.description}`,
          impact: check.failImpact,
          suggestion: `Improve the ${check.field} section to meet quality standards.`,
        })
        scoreAdjustment += check.failImpact
      }
    }

    // Calculate final score (clamped to 0-100)
    const ruleScore = Math.max(0, Math.min(100, this.baseScore + scoreAdjustment))

    return {
      matchedRisks,
      matchedStrengths,
      ruleScore,
    }
  }

  /**
   * Check if content matches any of the patterns
   */
  private checkPatterns(content: string, patterns: (string | RegExp)[]): boolean {
    for (const pattern of patterns) {
      if (typeof pattern === 'string') {
        if (content.toLowerCase().includes(pattern.toLowerCase())) {
          return true
        }
      } else {
        if (pattern.test(content)) {
          return true
        }
      }
    }
    return false
  }

  /**
   * Evaluate a quality check against content
   * Returns true if check FAILS (content doesn't meet quality standard)
   */
  private evaluateQualityCheck(
    content: string,
    checkType: 'minLength' | 'maxLength' | 'containsPattern' | 'notContainsPattern' | 'pastTense',
    value: number | string | RegExp
  ): boolean {
    switch (checkType) {
      case 'minLength':
        return content.length < (value as number)

      case 'maxLength':
        return content.length > (value as number)

      case 'containsPattern':
        if (typeof value === 'string') {
          return !content.toLowerCase().includes(value.toLowerCase())
        }
        return !(value as RegExp).test(content)

      case 'notContainsPattern':
        if (typeof value === 'string') {
          return content.toLowerCase().includes(value.toLowerCase())
        }
        return (value as RegExp).test(content)

      case 'pastTense':
        // Check for common past tense indicators
        const pastTensePatterns = /\b(was|were|had|did|made|found|showed|demonstrated|developed|created|built|tested)\b/i
        return !pastTensePatterns.test(content)

      default:
        return false
    }
  }
}

// ============================================
// Singleton
// ============================================

let instance: RuleScorerService | null = null

export function getRuleScorerService(): RuleScorerService {
  if (!instance) {
    instance = new RuleScorerService()
  }
  return instance
}

export function resetRuleScorerService(): void {
  instance = null
}
