'use client'

/**
 * AI Review Wrapper Component
 *
 * Client-side wrapper that provides AI Review functionality for server components.
 * Combines the button and panel with state management.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AiReviewButton } from './ai-review-button'
import { AiReviewPanel } from './ai-review-panel'
import { saveAiSuggestions } from '@/actions/ai-review'
import type { AiReviewResult, AcceptedSuggestion } from '@/types/ai-review'

interface AiReviewWrapperProps {
  /** Project ID for the AI review */
  projectId: string
  /** Optional activity ID for activity-specific review */
  activityId?: string
  /** Additional CSS classes for the button */
  className?: string
}

export function AiReviewWrapper({
  projectId,
  activityId,
  className,
}: AiReviewWrapperProps) {
  const router = useRouter()
  const [reviewResult, setReviewResult] = useState<AiReviewResult | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleComplete = (result: AiReviewResult) => {
    setReviewResult(result)
    setIsPanelOpen(true)
    setError(null)
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
  }

  const handleSave = async (suggestions: AcceptedSuggestion[]) => {
    if (!activityId || suggestions.length === 0) return

    setIsSaving(true)
    try {
      const result = await saveAiSuggestions({ activityId, suggestions })
      if (result.success) {
        setIsPanelOpen(false)
        setReviewResult(null)
        router.refresh()
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save suggestions')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setIsPanelOpen(false)
  }

  return (
    <>
      <AiReviewButton
        projectId={projectId}
        activityId={activityId}
        onComplete={handleComplete}
        onError={handleError}
        className={className}
      />

      {error && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-4 font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <AiReviewPanel
        isOpen={isPanelOpen}
        onClose={handleClose}
        reviewResult={reviewResult}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </>
  )
}
