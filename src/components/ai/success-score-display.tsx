'use client'

/**
 * Success Score Display Component
 *
 * Displays the success likelihood score with a circular progress indicator.
 */

import { cn } from '@/lib/utils'
import type { SuccessScore } from '@/types/ai-review'

interface SuccessScoreDisplayProps {
  /** The success score to display */
  successScore: SuccessScore
  /** Additional CSS classes */
  className?: string
}

/**
 * Get colors based on risk level
 */
function getRiskColors(riskLevel: SuccessScore['riskLevel']) {
  switch (riskLevel) {
    case 'low':
      return {
        bg: 'bg-green-50',
        text: 'text-green-700',
        stroke: 'stroke-green-500',
        label: 'Low Risk',
        description: 'Your documentation appears well-aligned with ATO requirements.',
      }
    case 'medium':
      return {
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        stroke: 'stroke-yellow-500',
        label: 'Medium Risk',
        description: 'Some improvements recommended before submission.',
      }
    case 'high':
      return {
        bg: 'bg-red-50',
        text: 'text-red-700',
        stroke: 'stroke-red-500',
        label: 'High Risk',
        description: 'Significant issues detected. Review recommended changes.',
      }
  }
}

/**
 * Circular progress indicator component
 */
function CircularProgress({
  percentage,
  strokeColor,
  size = 120,
}: {
  percentage: number
  strokeColor: string
  size?: number
}) {
  const radius = (size - 12) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          className={strokeColor}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transition: 'stroke-dashoffset 0.5s ease-in-out',
          }}
        />
      </svg>
      {/* Percentage text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">{percentage}</span>
        <span className="text-xs text-muted-foreground">%</span>
      </div>
    </div>
  )
}

export function SuccessScoreDisplay({ successScore, className }: SuccessScoreDisplayProps) {
  const colors = getRiskColors(successScore.riskLevel)

  return (
    <div className={cn('rounded-lg border p-4', colors.bg, className)}>
      <div className="flex items-start gap-4">
        {/* Circular progress */}
        <CircularProgress percentage={successScore.overallScore} strokeColor={colors.stroke} />

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">ATO Success Likelihood</h3>
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-xs font-medium',
                colors.bg,
                colors.text
              )}
            >
              {colors.label}
            </span>
          </div>

          <p className="text-sm text-muted-foreground mb-2">{colors.description}</p>

          {successScore.overallAssessment && (
            <p className="text-sm">{successScore.overallAssessment}</p>
          )}
        </div>
      </div>
    </div>
  )
}
