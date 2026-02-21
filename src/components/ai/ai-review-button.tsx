'use client'

/**
 * AI Review Button Component
 *
 * Triggers an AI review for a project/activity and shows loading state.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AiReviewResult, SuccessScore } from '@/types/ai-review'

// Simple sparkle icon (inline SVG to avoid dependency)
function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  )
}

// Simple loader icon
function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

interface AiReviewButtonProps {
  /** Project ID to review */
  projectId: string
  /** Optional activity ID for activity-specific review */
  activityId?: string
  /** Callback when review completes successfully */
  onComplete: (result: AiReviewResult) => void
  /** Callback when review fails */
  onError?: (error: string) => void
  /** Optional last score to display as badge */
  lastScore?: SuccessScore
  /** Additional CSS classes */
  className?: string
}

/**
 * Get badge color based on risk level
 */
function getScoreBadgeColor(riskLevel: SuccessScore['riskLevel']) {
  switch (riskLevel) {
    case 'low':
      return 'bg-green-100 text-green-700 border-green-200'
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'high':
      return 'bg-red-100 text-red-700 border-red-200'
  }
}

export function AiReviewButton({
  projectId,
  activityId,
  onComplete,
  onError,
  lastScore,
  className,
}: AiReviewButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/projects/${projectId}/ai-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activityId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'AI review failed')
      }

      onComplete(data.data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI review failed'
      console.error('AI Review error:', message)
      onError?.(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleClick}
        disabled={isLoading}
        variant="outline"
        className={className}
      >
        {isLoading ? (
          <>
            <LoaderIcon className="h-4 w-4 animate-spin" />
            <span>Analyzing...</span>
          </>
        ) : (
          <>
            <SparklesIcon className="h-4 w-4" />
            <span>AI Review</span>
          </>
        )}
      </Button>

      {/* Score badge from last review */}
      {lastScore && !isLoading && (
        <span
          className={cn(
            'px-2 py-1 text-xs font-medium rounded-full border',
            getScoreBadgeColor(lastScore.riskLevel)
          )}
          title={`Last AI Review: ${lastScore.overallScore}% success likelihood`}
        >
          {lastScore.overallScore}%
        </span>
      )}
    </div>
  )
}
