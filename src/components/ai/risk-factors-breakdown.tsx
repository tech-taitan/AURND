'use client'

/**
 * Risk Factors Breakdown Component
 *
 * Displays the breakdown of factors affecting the success score.
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { SuccessScoreBreakdown } from '@/types/ai-review'

interface RiskFactorsBreakdownProps {
  /** The breakdown of factors affecting the score */
  breakdown: SuccessScoreBreakdown
  /** Additional CSS classes */
  className?: string
}

/**
 * Chevron icon component
 */
function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

/**
 * Warning icon for risk factors
 */
function WarningIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-red-500"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}

/**
 * Check icon for strength factors
 */
function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-green-500"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  )
}

export function RiskFactorsBreakdown({ breakdown, className }: RiskFactorsBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const { riskFactors, strengthFactors } = breakdown
  const hasFactors = riskFactors.length > 0 || strengthFactors.length > 0

  if (!hasFactors) {
    return null
  }

  // Sort by absolute impact (most impactful first)
  const sortedRisks = [...riskFactors].sort((a, b) => a.impact - b.impact)
  const sortedStrengths = [...strengthFactors].sort((a, b) => b.impact - a.impact)

  return (
    <div className={cn('border rounded-lg', className)}>
      {/* Header - clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
      >
        <span className="font-medium text-sm">
          What&apos;s affecting your score?
          <span className="text-muted-foreground ml-2">
            ({riskFactors.length} issues, {strengthFactors.length} strengths)
          </span>
        </span>
        <ChevronIcon isOpen={isExpanded} />
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t p-3 space-y-4">
          {/* Risk factors */}
          {sortedRisks.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
                <WarningIcon />
                Issues to Address
              </h4>
              <ul className="space-y-2">
                {sortedRisks.map((risk, index) => (
                  <li key={index} className="bg-red-50 rounded p-2">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                        {risk.impact}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-red-800">{risk.description}</p>
                        {risk.suggestion && (
                          <p className="text-xs text-red-600 mt-1">
                            <strong>Fix:</strong> {risk.suggestion}
                          </p>
                        )}
                        <span className="text-xs text-red-500 capitalize">{risk.category}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Strength factors */}
          {sortedStrengths.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                <CheckIcon />
                Strengths
              </h4>
              <ul className="space-y-2">
                {sortedStrengths.map((strength, index) => (
                  <li key={index} className="bg-green-50 rounded p-2">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                        +{strength.impact}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-800">{strength.description}</p>
                        <span className="text-xs text-green-500 capitalize">{strength.category}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
