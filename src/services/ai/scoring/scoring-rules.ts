/**
 * Scoring Rules Reference Data
 *
 * Contains known risk factors and strength patterns based on ATO R&D Tax Incentive guidelines.
 * Used for rule-based scoring of AI-generated R&D documentation.
 */

// ============================================
// Risk Factor Definitions
// ============================================

export interface RiskFactorRule {
  /** Unique identifier */
  id: string
  /** Category of the risk */
  category: 'language' | 'structure' | 'compliance' | 'clarity' | 'methodology'
  /** Keywords or regex patterns that trigger this risk */
  patterns: (string | RegExp)[]
  /** Negative impact on score (-10 to -30) */
  impact: number
  /** Description of the issue */
  description: string
  /** Suggested fix */
  suggestion: string
  /** Which content types this rule applies to */
  appliesTo: ('hec' | 'uncertainty' | 'classification' | 'dominantPurpose')[]
}

/**
 * Common audit triggers and risk factors based on ATO guidance
 */
export const RISK_FACTORS: RiskFactorRule[] = [
  // Commercial/Financial Language Risks
  {
    id: 'RF001',
    category: 'language',
    patterns: [
      /\b(profit|revenue|market share|competitive advantage|cost sav(e|ing)|ROI)\b/i,
      /\b(business opportunity|commercial benefit|financial gain)\b/i,
    ],
    impact: -25,
    description: 'Contains commercial/financial language instead of technical focus',
    suggestion: 'Replace commercial language with technical terminology. Focus on knowledge gaps and technical challenges, not business outcomes.',
    appliesTo: ['hec', 'uncertainty'],
  },
  {
    id: 'RF002',
    category: 'language',
    patterns: [
      /\b(customer demand|market need|user request|client requirement)\b/i,
    ],
    impact: -20,
    description: 'Motivation appears driven by customer/market needs rather than technical uncertainty',
    suggestion: 'Reframe to emphasize the technical challenges that needed to be resolved, not the business driver.',
    appliesTo: ['hec', 'uncertainty'],
  },
  // Vague/Generic Language Risks
  {
    id: 'RF003',
    category: 'clarity',
    patterns: [
      /\b(various|several|some|many|multiple)\s+(challenges|issues|problems)\b/i,
      /\b(etc\.?|and so on|and more)\b/i,
    ],
    impact: -15,
    description: 'Contains vague or generic language lacking specificity',
    suggestion: 'Be specific about the technical challenges. Replace vague terms with concrete technical details.',
    appliesTo: ['hec', 'uncertainty', 'dominantPurpose'],
  },
  {
    id: 'RF004',
    category: 'clarity',
    patterns: [
      /\b(improve|enhance|optimize|better)\b/i,
    ],
    impact: -10,
    description: 'Uses improvement language without specifying technical metrics',
    suggestion: 'Quantify improvements with specific technical metrics (e.g., "reduced latency from 500ms to 50ms").',
    appliesTo: ['hec'],
  },
  // Methodology Risks
  {
    id: 'RF005',
    category: 'methodology',
    patterns: [
      /\b(trial and error|tried different|experimented randomly)\b/i,
      /\b(just tried|simply tested|we tested)\b/i,
    ],
    impact: -20,
    description: 'Suggests unsystematic trial-and-error rather than systematic investigation',
    suggestion: 'Describe the systematic methodology used. Explain the hypothesis-driven approach and controlled variables.',
    appliesTo: ['hec'],
  },
  {
    id: 'RF006',
    category: 'methodology',
    patterns: [
      /\b(followed documentation|used existing solution|applied known method)\b/i,
      /\b(standard approach|common practice|industry standard)\b/i,
    ],
    impact: -25,
    description: 'Indicates use of existing knowledge rather than generating new knowledge',
    suggestion: 'Explain why existing solutions were insufficient and what new knowledge was required.',
    appliesTo: ['hec', 'uncertainty'],
  },
  // Structure Risks
  {
    id: 'RF007',
    category: 'structure',
    patterns: [
      /^.{0,50}$/m, // Very short content (less than 50 chars)
    ],
    impact: -15,
    description: 'Content is too brief to adequately demonstrate R&D activities',
    suggestion: 'Expand with more detail about the technical work performed. Each H-E-C section should be 2-4 sentences.',
    appliesTo: ['hec'],
  },
  {
    id: 'RF008',
    category: 'structure',
    patterns: [
      /\b(will|going to|plan to|intend to)\b/i,
    ],
    impact: -20,
    description: 'Written in future tense instead of past tense (describing work not yet done)',
    suggestion: 'R&D documentation must describe completed activities. Rewrite in past tense.',
    appliesTo: ['hec', 'uncertainty'],
  },
  // Compliance Risks
  {
    id: 'RF009',
    category: 'compliance',
    patterns: [
      /\b(it was not known whether)\b/i,
    ],
    impact: 0, // Not a risk if present - this is checked separately
    description: 'Technical uncertainty statement format check',
    suggestion: 'Ensure uncertainty statements follow format: "It was not known whether X because Y"',
    appliesTo: ['uncertainty'],
  },
  {
    id: 'RF010',
    category: 'compliance',
    patterns: [
      /\b(support(s|ed|ing)?)\s+(the)?\s*(core|R&D)\s*(activity|work)\b/i,
    ],
    impact: 0, // Positive if found in dominant purpose
    description: 'Dominant purpose link to core activity',
    suggestion: 'Clearly explain how the supporting activity relates to the core R&D activity.',
    appliesTo: ['dominantPurpose'],
  },
  // Missing Technical Detail Risks
  {
    id: 'RF011',
    category: 'clarity',
    patterns: [
      /\b(software|system|application|platform)\b/i,
    ],
    impact: -5,
    description: 'Uses generic software terms without technical specificity',
    suggestion: 'Add specific technical details: technologies, algorithms, architectures, or methods used.',
    appliesTo: ['hec'],
  },
  {
    id: 'RF012',
    category: 'methodology',
    patterns: [
      /\b(no one knew|nobody knew|uncertain if|unsure whether)\b/i,
    ],
    impact: -15,
    description: 'Uncertainty statement lacks specificity about the knowledge gap',
    suggestion: 'Specify exactly what technical knowledge was missing and why it could not be determined from existing sources.',
    appliesTo: ['uncertainty'],
  },
]

// ============================================
// Strength Pattern Definitions
// ============================================

export interface StrengthPatternRule {
  /** Unique identifier */
  id: string
  /** Category of the strength */
  category: 'methodology' | 'documentation' | 'clarity' | 'technical' | 'compliance'
  /** Keywords or regex patterns that indicate this strength */
  patterns: (string | RegExp)[]
  /** Positive impact on score (+5 to +15) */
  impact: number
  /** Description of the positive aspect */
  description: string
  /** Which content types this rule applies to */
  appliesTo: ('hec' | 'uncertainty' | 'classification' | 'dominantPurpose')[]
}

/**
 * Patterns that indicate high-quality R&D documentation
 */
export const STRENGTH_PATTERNS: StrengthPatternRule[] = [
  // Technical Detail Strengths
  {
    id: 'SP001',
    category: 'technical',
    patterns: [
      /\b(algorithm|architecture|protocol|framework|methodology)\b/i,
      /\b(data structure|computational|processing|optimization)\b/i,
    ],
    impact: 10,
    description: 'Uses specific technical terminology',
    appliesTo: ['hec', 'uncertainty'],
  },
  {
    id: 'SP002',
    category: 'technical',
    patterns: [
      /\b(\d+%|\d+ms|\d+\s*(GB|MB|KB|seconds|minutes|iterations))\b/i,
      /\b(performance|latency|throughput|accuracy|precision)\s*[:\-]?\s*\d+/i,
    ],
    impact: 15,
    description: 'Includes quantitative technical metrics',
    appliesTo: ['hec'],
  },
  // Methodology Strengths
  {
    id: 'SP003',
    category: 'methodology',
    patterns: [
      /\b(systematic(ally)?|controlled|experimental|hypothesis|variable)\b/i,
      /\b(measured|evaluated|tested|analyzed|compared)\b/i,
    ],
    impact: 10,
    description: 'Demonstrates systematic experimental methodology',
    appliesTo: ['hec'],
  },
  {
    id: 'SP004',
    category: 'methodology',
    patterns: [
      /\b(prototype|proof of concept|benchmark|baseline)\b/i,
      /\b(iteration|iterative|successive|incremental)\b/i,
    ],
    impact: 8,
    description: 'Shows iterative development approach',
    appliesTo: ['hec'],
  },
  // Documentation Quality Strengths
  {
    id: 'SP005',
    category: 'documentation',
    patterns: [
      /\b(it was not known whether)\b/i,
    ],
    impact: 10,
    description: 'Follows ATO-recommended uncertainty statement format',
    appliesTo: ['uncertainty'],
  },
  {
    id: 'SP006',
    category: 'documentation',
    patterns: [
      /\b(because|due to|as a result of|consequently)\b/i,
    ],
    impact: 5,
    description: 'Provides causal explanations',
    appliesTo: ['hec', 'uncertainty', 'dominantPurpose'],
  },
  // Knowledge Generation Strengths
  {
    id: 'SP007',
    category: 'clarity',
    patterns: [
      /\b(discovered|determined|established|concluded|found that)\b/i,
      /\b(new knowledge|novel approach|innovative|breakthrough)\b/i,
    ],
    impact: 12,
    description: 'Demonstrates knowledge generation outcome',
    appliesTo: ['hec'],
  },
  {
    id: 'SP008',
    category: 'clarity',
    patterns: [
      /\b(technical challenge|technical uncertainty|technical limitation)\b/i,
      /\b(knowledge gap|unknown|could not be determined)\b/i,
    ],
    impact: 10,
    description: 'Clearly articulates technical uncertainty',
    appliesTo: ['hec', 'uncertainty'],
  },
]

// ============================================
// H-E-C Quality Checks
// ============================================

export interface HecQualityCheck {
  /** Unique identifier */
  id: string
  /** Which H-E-C field this applies to */
  field: 'hypothesis' | 'experiment' | 'observation' | 'evaluation' | 'conclusion'
  /** What to check for */
  check: 'minLength' | 'maxLength' | 'containsPattern' | 'notContainsPattern' | 'pastTense'
  /** Value for the check (length in chars, or pattern) */
  value: number | string | RegExp
  /** Impact if check fails */
  failImpact: number
  /** Description */
  description: string
}

/**
 * Quality checks specific to H-E-C documentation
 */
export const HEC_QUALITY_CHECKS: HecQualityCheck[] = [
  // Hypothesis checks
  {
    id: 'HEC001',
    field: 'hypothesis',
    check: 'minLength',
    value: 100,
    failImpact: -10,
    description: 'Hypothesis should be at least 100 characters',
  },
  {
    id: 'HEC002',
    field: 'hypothesis',
    check: 'containsPattern',
    value: /\b(whether|if|could|would)\b/i,
    failImpact: -5,
    description: 'Hypothesis should express uncertainty (whether, if, could, would)',
  },
  // Experiment checks
  {
    id: 'HEC003',
    field: 'experiment',
    check: 'minLength',
    value: 150,
    failImpact: -10,
    description: 'Experiment should be at least 150 characters',
  },
  {
    id: 'HEC004',
    field: 'experiment',
    check: 'containsPattern',
    value: /\b(developed|created|built|implemented|designed|tested)\b/i,
    failImpact: -5,
    description: 'Experiment should describe actions taken (developed, created, built, etc.)',
  },
  // Conclusion checks
  {
    id: 'HEC005',
    field: 'conclusion',
    check: 'minLength',
    value: 100,
    failImpact: -10,
    description: 'Conclusion should be at least 100 characters',
  },
  {
    id: 'HEC006',
    field: 'conclusion',
    check: 'containsPattern',
    value: /\b(demonstrated|proved|showed|confirmed|revealed|established)\b/i,
    failImpact: -5,
    description: 'Conclusion should describe outcomes (demonstrated, proved, showed, etc.)',
  },
  // Observation checks
  {
    id: 'HEC007',
    field: 'observation',
    check: 'minLength',
    value: 80,
    failImpact: -5,
    description: 'Observation should be at least 80 characters',
  },
  // Evaluation checks
  {
    id: 'HEC008',
    field: 'evaluation',
    check: 'minLength',
    value: 80,
    failImpact: -5,
    description: 'Evaluation should be at least 80 characters',
  },
  {
    id: 'HEC009',
    field: 'evaluation',
    check: 'containsPattern',
    value: /\b(compared|measured|assessed|evaluated|analyzed)\b/i,
    failImpact: -5,
    description: 'Evaluation should describe assessment methods',
  },
]
