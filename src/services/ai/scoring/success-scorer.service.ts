/**
 * Success Scorer Service
 *
 * Combines rule-based and AI scoring to provide a comprehensive success likelihood score.
 * The final score is weighted: 40% rule-based, 60% AI-based.
 */

import type {
  AiReviewResult,
  SuccessScore,
  RiskLevel,
  RiskFactor,
  StrengthFactor,
} from '@/types/ai-review'
import { getGeminiService } from '../gemini.service'
import {
  buildSuccessScorerPrompt,
  getSuccessScorerSystemInstruction,
  parseSuccessScorerResponse,
} from '../prompts/success-scorer'
import { getRuleScorerService } from './rule-scorer.service'

// ============================================
// Constants
// ============================================

const RULE_SCORE_WEIGHT = 0.4
const AI_SCORE_WEIGHT = 0.6

// ============================================
// Service
// ============================================

export class SuccessScorerService {
  /**
   * Score an AI review result for likelihood of ATO success
   */
  async score(reviewResult: AiReviewResult): Promise<SuccessScore> {
    const ruleScorer = getRuleScorerService()
    const allRiskFactors: RiskFactor[] = []
    const allStrengthFactors: StrengthFactor[] = []
    const ruleScores: number[] = []

    // Score H-E-C content if present
    if (reviewResult.hec) {
      const hecResult = ruleScorer.scoreHec({
        hypothesis: reviewResult.hec.hypothesis,
        experiment: reviewResult.hec.experiment,
        observation: reviewResult.hec.observation,
        evaluation: reviewResult.hec.evaluation,
        conclusion: reviewResult.hec.conclusion,
      })
      allRiskFactors.push(...hecResult.matchedRisks)
      allStrengthFactors.push(...hecResult.matchedStrengths)
      ruleScores.push(hecResult.ruleScore)
    }

    // Score uncertainty statements if present
    if (reviewResult.uncertaintyStatements && reviewResult.uncertaintyStatements.length > 0) {
      for (const statement of reviewResult.uncertaintyStatements) {
        const uncertaintyResult = ruleScorer.scoreContent(statement.statement, 'uncertainty')
        allRiskFactors.push(...uncertaintyResult.matchedRisks)
        allStrengthFactors.push(...uncertaintyResult.matchedStrengths)
        ruleScores.push(uncertaintyResult.ruleScore)
      }
    }

    // Score classification reasoning if present
    if (reviewResult.classification?.reasoning) {
      const classificationResult = ruleScorer.scoreContent(
        reviewResult.classification.reasoning,
        'classification'
      )
      allRiskFactors.push(...classificationResult.matchedRisks)
      allStrengthFactors.push(...classificationResult.matchedStrengths)
      ruleScores.push(classificationResult.ruleScore)
    }

    // Score dominant purpose if present
    if (reviewResult.dominantPurpose?.justification) {
      const dominantResult = ruleScorer.scoreContent(
        reviewResult.dominantPurpose.justification,
        'dominantPurpose'
      )
      allRiskFactors.push(...dominantResult.matchedRisks)
      allStrengthFactors.push(...dominantResult.matchedStrengths)
      ruleScores.push(dominantResult.ruleScore)
    }

    // Calculate average rule score
    const averageRuleScore =
      ruleScores.length > 0
        ? ruleScores.reduce((sum, score) => sum + score, 0) / ruleScores.length
        : 70

    // Get AI score
    let aiScore = 70
    let aiOverallAssessment = ''
    const aiRiskFactors: RiskFactor[] = []
    const aiStrengthFactors: StrengthFactor[] = []

    try {
      const gemini = getGeminiService()
      const prompt = buildSuccessScorerPrompt(reviewResult)
      const systemInstruction = getSuccessScorerSystemInstruction()

      const response = await gemini.generateContent(prompt, {
        systemInstruction,
        temperature: 0.3, // Low temperature for consistent scoring
        maxOutputTokens: 2048,
        jsonMode: true,
      })

      const aiResult = parseSuccessScorerResponse(response.text)
      aiScore = aiResult.aiScore
      aiOverallAssessment = aiResult.overallAssessment
      aiRiskFactors.push(...aiResult.riskFactors)
      aiStrengthFactors.push(...aiResult.strengthFactors)
    } catch (error) {
      // If AI scoring fails, use rule score only
      console.error('AI scoring failed, using rule score only:', error)
      aiOverallAssessment = 'AI evaluation unavailable. Score based on rule-based analysis only.'
    }

    // Combine scores
    const combinedScore = Math.round(
      averageRuleScore * RULE_SCORE_WEIGHT + aiScore * AI_SCORE_WEIGHT
    )

    // Deduplicate risk factors by description
    const uniqueRiskFactors = this.deduplicateFactors([...allRiskFactors, ...aiRiskFactors])
    const uniqueStrengthFactors = this.deduplicateStrengthFactors([
      ...allStrengthFactors,
      ...aiStrengthFactors,
    ])

    // Sort by impact (most impactful first)
    uniqueRiskFactors.sort((a, b) => a.impact - b.impact) // Negative impacts, so ascending
    uniqueStrengthFactors.sort((a, b) => b.impact - a.impact) // Positive impacts, so descending

    // Determine risk level
    const riskLevel = this.determineRiskLevel(combinedScore)

    return {
      overallScore: combinedScore,
      riskLevel,
      breakdown: {
        riskFactors: uniqueRiskFactors,
        strengthFactors: uniqueStrengthFactors,
      },
      overallAssessment: aiOverallAssessment,
    }
  }

  /**
   * Determine risk level based on score
   */
  private determineRiskLevel(score: number): RiskLevel {
    if (score >= 75) return 'low'
    if (score >= 50) return 'medium'
    return 'high'
  }

  /**
   * Deduplicate risk factors by description similarity
   */
  private deduplicateFactors(factors: RiskFactor[]): RiskFactor[] {
    const seen = new Map<string, RiskFactor>()

    for (const factor of factors) {
      // Create a normalized key from the description
      const key = factor.description.toLowerCase().slice(0, 50)

      if (!seen.has(key)) {
        seen.set(key, factor)
      } else {
        // Keep the one with higher (more negative) impact
        const existing = seen.get(key)!
        if (factor.impact < existing.impact) {
          seen.set(key, factor)
        }
      }
    }

    return Array.from(seen.values())
  }

  /**
   * Deduplicate strength factors by description similarity
   */
  private deduplicateStrengthFactors(factors: StrengthFactor[]): StrengthFactor[] {
    const seen = new Map<string, StrengthFactor>()

    for (const factor of factors) {
      const key = factor.description.toLowerCase().slice(0, 50)

      if (!seen.has(key)) {
        seen.set(key, factor)
      } else {
        // Keep the one with higher (more positive) impact
        const existing = seen.get(key)!
        if (factor.impact > existing.impact) {
          seen.set(key, factor)
        }
      }
    }

    return Array.from(seen.values())
  }
}

// ============================================
// Singleton
// ============================================

let instance: SuccessScorerService | null = null

export function getSuccessScorerService(): SuccessScorerService {
  if (!instance) {
    instance = new SuccessScorerService()
  }
  return instance
}

export function resetSuccessScorerService(): void {
  instance = null
}
