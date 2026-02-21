/**
 * AI Review Types
 *
 * Shared TypeScript types for AI-powered content generation features.
 * Used by both frontend and backend for type-safe AI review workflows.
 */

import type { ActivityType } from '@prisma/client'

// ============================================
// Suggestion Status
// ============================================

/**
 * Status of an individual AI suggestion during review
 */
export type SuggestionStatus = 'pending' | 'accepted' | 'edited' | 'skipped'

/**
 * Validation status after AI self-validation
 */
export type ValidationStatus = 'passed' | 'needs_refinement' | 'failed'

// ============================================
// H-E-C (Hypothesis-Experiment-Conclusion) Suggestion
// ============================================

/**
 * AI-generated H-E-C framework documentation
 */
export interface HecSuggestion {
  /** Technical hypothesis being tested */
  hypothesis: string
  /** Experiment methodology and approach */
  experiment: string
  /** Observations made during experimentation (optional, often filled by user) */
  observation: string
  /** How results were evaluated */
  evaluation: string
  /** What was learned and the outcome */
  conclusion: string
}

// ============================================
// Activity Classification Suggestion
// ============================================

/**
 * AI-recommended activity classification
 */
export interface ClassificationSuggestion {
  /** Recommended activity type */
  type: ActivityType
  /** Confidence score (0-100) */
  confidence: number
  /** Explanation for the classification */
  reasoning: string
  /** If SUPPORTING, suggested core activity to link to */
  suggestedCoreActivityId?: string
}

// ============================================
// Technical Uncertainty Suggestion
// ============================================

/**
 * AI-generated technical uncertainty statement
 */
export interface UncertaintySuggestion {
  /** The uncertainty statement */
  statement: string
  /** Whether this describes commercial/financial uncertainty (should be filtered out) */
  isCommercial: boolean
  /** Confidence score (0-100) */
  confidence: number
}

// ============================================
// Industry/Research Code Suggestion
// ============================================

/**
 * AI-suggested classification code (ANZSIC or FOR)
 */
export interface CodeSuggestion {
  /** The code value (e.g., "6201" for ANZSIC, "0801" for FOR) */
  code: string
  /** Human-readable description of the code */
  description: string
  /** Confidence score (0-100) */
  confidence: number
  /** Why this code was suggested */
  rationale: string
}

/**
 * Combined code suggestions for both ANZSIC and FOR
 */
export interface CodeSuggestions {
  /** Top ANZSIC (industry) code suggestions */
  anzsicCodes: CodeSuggestion[]
  /** Top FOR (field of research) code suggestions */
  forCodes: CodeSuggestion[]
}

// ============================================
// Dominant Purpose Justification
// ============================================

/**
 * AI-generated dominant purpose justification for supporting activities
 */
export interface DominantPurposeJustification {
  /** The justification text explaining why >50% relates to R&D */
  justification: string
  /** The core activity this supporting activity is linked to */
  linkedCoreActivityId: string
}

// ============================================
// Validation Feedback
// ============================================

/**
 * Feedback from AI validation step
 */
export interface ValidationFeedback {
  /** Overall validation status */
  status: ValidationStatus
  /** Specific issues found, if any */
  issues: ValidationIssue[]
}

/**
 * A single validation issue
 */
export interface ValidationIssue {
  /** Which field or section has the issue */
  field: string
  /** Description of the issue */
  message: string
  /** Suggested fix */
  suggestion?: string
}

// ============================================
// Success Likelihood Scoring
// ============================================

/**
 * Risk level classification based on success score
 */
export type RiskLevel = 'low' | 'medium' | 'high'

/**
 * A factor that negatively impacts the success likelihood
 */
export interface RiskFactor {
  /** Category of the risk (e.g., 'language', 'structure', 'compliance') */
  category: string
  /** Description of the issue found */
  description: string
  /** Negative impact on score (-10 to -30) */
  impact: number
  /** Suggested fix for this issue */
  suggestion: string
}

/**
 * A factor that positively impacts the success likelihood
 */
export interface StrengthFactor {
  /** Category of the strength (e.g., 'methodology', 'documentation', 'clarity') */
  category: string
  /** Description of the positive aspect found */
  description: string
  /** Positive impact on score (+5 to +15) */
  impact: number
}

/**
 * Breakdown of factors affecting the success score
 */
export interface SuccessScoreBreakdown {
  /** Factors that decrease the likelihood of success */
  riskFactors: RiskFactor[]
  /** Factors that increase the likelihood of success */
  strengthFactors: StrengthFactor[]
}

/**
 * Success likelihood score for ATO acceptance
 */
export interface SuccessScore {
  /** Overall success likelihood percentage (0-100) */
  overallScore: number
  /** Risk level classification */
  riskLevel: RiskLevel
  /** Detailed breakdown of factors affecting the score */
  breakdown: SuccessScoreBreakdown
  /** AI-generated overall assessment summary */
  overallAssessment?: string
}

// ============================================
// Application Drafting
// ============================================

/**
 * Narrative summary for a project in the application draft
 */
export interface ProjectNarrative {
  projectId: string
  projectName: string
  overview: string
  technicalObjectives: string
  methodology: string
  outcomes: string
}

/**
 * Drafted activity description with H-E-C and uncertainty
 */
export interface ActivityDescriptionDraft {
  activityId: string
  activityName: string
  activityType: ActivityType
  hypothesis: string
  experiment: string
  observation: string
  evaluation: string
  conclusion: string
  uncertaintyStatement: string
}

/**
 * Expenditure summary for the draft application
 */
export interface ExpenditureSummary {
  totalAmount: number
  byCategory: Record<string, number>
  narrative: string
}

/**
 * Drafted application output
 */
export interface ApplicationDraft {
  executiveSummary: string
  projectNarratives: ProjectNarrative[]
  activityDescriptions: ActivityDescriptionDraft[]
  expenditureSummary: ExpenditureSummary
  technicalUncertaintyStatement: string
}

// ============================================
// Complete AI Review Result
// ============================================

/**
 * Complete result from an AI review session
 */
export interface AiReviewResult {
  /** H-E-C framework suggestions */
  hec?: HecSuggestion
  /** Activity classification suggestion */
  classification?: ClassificationSuggestion
  /** Technical uncertainty statement suggestions */
  uncertaintyStatements?: UncertaintySuggestion[]
  /** Industry and research code suggestions */
  codes?: CodeSuggestions
  /** Dominant purpose justification (only for SUPPORTING_DOMINANT_PURPOSE) */
  dominantPurpose?: DominantPurposeJustification
  /** Validation feedback from self-check */
  validation?: ValidationFeedback
  /** Success likelihood score */
  successScore?: SuccessScore
  /** Processing metadata */
  metadata: AiReviewMetadata
}

/**
 * Metadata about the AI review process
 */
export interface AiReviewMetadata {
  /** When the review was generated */
  generatedAt: string
  /** Total processing time in milliseconds */
  processingTimeMs: number
  /** Which features were processed */
  featuresProcessed: string[]
  /** Any errors that occurred */
  errors?: AiReviewError[]
}

/**
 * Error that occurred during AI review
 */
export interface AiReviewError {
  /** Which feature failed */
  feature: string
  /** Error message */
  message: string
}

// ============================================
// Accepted Suggestion (for saving)
// ============================================

/**
 * A suggestion that was accepted (possibly edited) by the user
 */
export interface AcceptedSuggestion {
  /** The database field name to update */
  fieldName: string
  /** The value to save */
  value: string
  /** Whether the user edited the suggestion before accepting */
  wasEdited: boolean
}
