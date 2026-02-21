'use client'

/**
 * AI Review Form Wrapper Component
 *
 * Client-side wrapper that provides AI Review functionality for forms.
 * Updates form fields when suggestions are accepted.
 */

import { useState } from 'react'
import { UseFormReturn, FieldValues, Path, PathValue } from 'react-hook-form'
import { AiReviewButton } from './ai-review-button'
import { AiReviewPanel } from './ai-review-panel'
import type { AiReviewResult, AcceptedSuggestion } from '@/types/ai-review'

interface AiReviewFormWrapperProps<TFormData extends FieldValues> {
  /** Project ID for the AI review */
  projectId: string
  /** Optional activity ID for activity-specific review */
  activityId?: string
  /** React Hook Form instance */
  form: UseFormReturn<TFormData>
  /** Additional CSS classes for the button */
  className?: string
}

// Map AI suggestion field names to form field names
const fieldNameMap: Record<string, string> = {
  hypothesis: 'hypothesis',
  experiment: 'experiment',
  observation: 'observation',
  evaluation: 'evaluation',
  conclusion: 'conclusion',
  activityType: 'activityType',
  technicalUncertainty: 'technicalUncertainty',
  dominantPurpose: 'dominantPurpose',
}

export function AiReviewFormWrapper<TFormData extends FieldValues>({
  projectId,
  activityId,
  form,
  className,
}: AiReviewFormWrapperProps<TFormData>) {
  const [reviewResult, setReviewResult] = useState<AiReviewResult | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleComplete = (result: AiReviewResult) => {
    setReviewResult(result)
    setIsPanelOpen(true)
    setError(null)
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
  }

  const handleSave = (suggestions: AcceptedSuggestion[]) => {
    // Update form fields with accepted suggestions
    suggestions.forEach((suggestion) => {
      const formFieldName = fieldNameMap[suggestion.fieldName] || suggestion.fieldName

      // Check if the field exists in the form
      if (formFieldName in (form.getValues() as Record<string, unknown>)) {
        form.setValue(
          formFieldName as Path<TFormData>,
          suggestion.value as PathValue<TFormData, Path<TFormData>>,
          { shouldDirty: true, shouldValidate: true }
        )
      }
    })

    setIsPanelOpen(false)
    setReviewResult(null)
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
        isSaving={false}
      />
    </>
  )
}
