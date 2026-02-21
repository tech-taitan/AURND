'use client'

/**
 * AI Review Panel Component
 *
 * Displays all AI suggestions in a dialog, organized by category.
 */

import { useState, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AiSuggestionCard } from './ai-suggestion-card'
import { SuccessScoreDisplay } from './success-score-display'
import { RiskFactorsBreakdown } from './risk-factors-breakdown'
import type {
  AiReviewResult,
  SuggestionStatus,
  AcceptedSuggestion,
} from '@/types/ai-review'

interface SuggestionState {
  fieldName: string
  value: string
  status: SuggestionStatus
  wasEdited: boolean
}

interface AiReviewPanelProps {
  /** Whether the panel is open */
  isOpen: boolean
  /** Called when panel should close */
  onClose: () => void
  /** The AI review result to display */
  reviewResult: AiReviewResult | null
  /** Called when user saves accepted suggestions */
  onSave: (suggestions: AcceptedSuggestion[]) => void
  /** Whether save is in progress */
  isSaving?: boolean
}

export function AiReviewPanel({
  isOpen,
  onClose,
  reviewResult,
  onSave,
  isSaving = false,
}: AiReviewPanelProps) {
  // Track the review result we've initialized for
  const [initializedFor, setInitializedFor] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Map<string, SuggestionState>>(new Map())

  // Build initial suggestions from review result
  const buildInitialSuggestions = useCallback((result: AiReviewResult): Map<string, SuggestionState> => {
    const newSuggestions = new Map<string, SuggestionState>()

    // H-E-C suggestions
    if (result.hec) {
      const hecFields = ['hypothesis', 'experiment', 'observation', 'evaluation', 'conclusion'] as const
      hecFields.forEach((field) => {
        if (result.hec?.[field]) {
          newSuggestions.set(field, {
            fieldName: field,
            value: result.hec[field],
            status: 'pending',
            wasEdited: false,
          })
        }
      })
    }

    // Classification
    if (result.classification) {
      newSuggestions.set('activityType', {
        fieldName: 'activityType',
        value: result.classification.type,
        status: 'pending',
        wasEdited: false,
      })
    }

    // Uncertainty statements (use first one)
    if (result.uncertaintyStatements?.[0]) {
      newSuggestions.set('technicalUncertainty', {
        fieldName: 'technicalUncertainty',
        value: result.uncertaintyStatements[0].statement,
        status: 'pending',
        wasEdited: false,
      })
    }

    // Codes
    if (result.codes?.anzsicCodes?.[0]) {
      newSuggestions.set('anzsicCode', {
        fieldName: 'anzsicCode',
        value: result.codes.anzsicCodes[0].code,
        status: 'pending',
        wasEdited: false,
      })
    }
    if (result.codes?.forCodes?.[0]) {
      newSuggestions.set('forCode', {
        fieldName: 'forCode',
        value: result.codes.forCodes[0].code,
        status: 'pending',
        wasEdited: false,
      })
    }

    // Dominant purpose
    if (result.dominantPurpose) {
      newSuggestions.set('dominantPurpose', {
        fieldName: 'dominantPurpose',
        value: result.dominantPurpose.justification,
        status: 'pending',
        wasEdited: false,
      })
    }

    return newSuggestions
  }, [])

  // Create a unique key for each review result based on timestamp
  const reviewKey = useMemo(
    () => reviewResult?.metadata.generatedAt ?? null,
    [reviewResult?.metadata.generatedAt]
  )

  // Reset suggestions when panel opens with a new review result
  // Using the "store previous value in state" pattern to avoid effect-based setState
  if (isOpen && reviewResult && reviewKey !== initializedFor) {
    setSuggestions(buildInitialSuggestions(reviewResult))
    setInitializedFor(reviewKey)
  }

  const updateSuggestion = (fieldName: string, value: string, status: SuggestionStatus, wasEdited: boolean) => {
    setSuggestions((prev) => {
      const next = new Map(prev)
      const existing = next.get(fieldName)
      if (existing) {
        next.set(fieldName, { ...existing, value, status, wasEdited })
      }
      return next
    })
  }

  const handleAcceptAll = () => {
    setSuggestions((prev) => {
      const next = new Map(prev)
      next.forEach((suggestion, key) => {
        if (suggestion.status === 'pending') {
          next.set(key, { ...suggestion, status: 'accepted' })
        }
      })
      return next
    })
  }

  const handleSave = () => {
    const accepted: AcceptedSuggestion[] = []
    suggestions.forEach((suggestion) => {
      if (suggestion.status === 'accepted' || suggestion.status === 'edited') {
        accepted.push({
          fieldName: suggestion.fieldName,
          value: suggestion.value,
          wasEdited: suggestion.wasEdited,
        })
      }
    })
    onSave(accepted)
  }

  // Count statistics
  const total = suggestions.size
  const accepted = Array.from(suggestions.values()).filter(
    (s) => s.status === 'accepted' || s.status === 'edited'
  ).length
  const pending = Array.from(suggestions.values()).filter((s) => s.status === 'pending').length

  if (!reviewResult) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            AI Review Suggestions
            {reviewResult.validation && (
              <Badge
                variant="outline"
                className={
                  reviewResult.validation.status === 'passed'
                    ? 'bg-green-100 text-green-800'
                    : reviewResult.validation.status === 'needs_refinement'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }
              >
                {reviewResult.validation.status}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Review AI-generated suggestions and accept, edit, or skip each one.
            {reviewResult.metadata.processingTimeMs && (
              <span className="text-xs ml-2">
                (Generated in {(reviewResult.metadata.processingTimeMs / 1000).toFixed(1)}s)
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="flex items-center gap-4 py-2 border-b">
          <Button size="sm" onClick={handleAcceptAll} disabled={pending === 0}>
            Accept All ({pending})
          </Button>
          <span className="text-sm text-muted-foreground">
            {accepted} of {total} accepted
          </span>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Success Score Section */}
          {reviewResult.successScore && (
            <section>
              <SuccessScoreDisplay successScore={reviewResult.successScore} />
              <RiskFactorsBreakdown
                breakdown={reviewResult.successScore.breakdown}
                className="mt-3"
              />
            </section>
          )}

          {/* H-E-C Section */}
          {reviewResult.hec && (
            <section>
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                H-E-C Documentation
              </h3>
              <div className="space-y-3">
                {(['hypothesis', 'experiment', 'observation', 'evaluation', 'conclusion'] as const).map(
                  (field) =>
                    reviewResult.hec?.[field] && (
                      <AiSuggestionCard
                        key={field}
                        fieldLabel={field.charAt(0).toUpperCase() + field.slice(1)}
                        suggestion={reviewResult.hec[field]}
                        confidence={85}
                        onAccept={(value) => updateSuggestion(field, value, 'accepted', false)}
                        onEdit={(value) => updateSuggestion(field, value, 'edited', true)}
                        onSkip={() => updateSuggestion(field, reviewResult.hec![field], 'skipped', false)}
                        disabled={suggestions.get(field)?.status !== 'pending'}
                      />
                    )
                )}
              </div>
            </section>
          )}

          {/* Classification Section */}
          {reviewResult.classification && (
            <section>
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                Activity Classification
              </h3>
              <AiSuggestionCard
                fieldLabel="Activity Type"
                suggestion={reviewResult.classification.type}
                confidence={reviewResult.classification.confidence}
                reasoning={reviewResult.classification.reasoning}
                onAccept={(value) => updateSuggestion('activityType', value, 'accepted', false)}
                onEdit={(value) => updateSuggestion('activityType', value, 'edited', true)}
                onSkip={() =>
                  updateSuggestion('activityType', reviewResult.classification!.type, 'skipped', false)
                }
                disabled={suggestions.get('activityType')?.status !== 'pending'}
              />
            </section>
          )}

          {/* Uncertainty Section */}
          {reviewResult.uncertaintyStatements && reviewResult.uncertaintyStatements.length > 0 && (
            <section>
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                Technical Uncertainty
              </h3>
              <div className="space-y-3">
                {reviewResult.uncertaintyStatements.map((statement, index) => (
                  <AiSuggestionCard
                    key={index}
                    fieldLabel={`Uncertainty Statement ${index + 1}`}
                    suggestion={statement.statement}
                    confidence={statement.confidence}
                    onAccept={(value) =>
                      index === 0 && updateSuggestion('technicalUncertainty', value, 'accepted', false)
                    }
                    onEdit={(value) =>
                      index === 0 && updateSuggestion('technicalUncertainty', value, 'edited', true)
                    }
                    onSkip={() =>
                      index === 0 &&
                      updateSuggestion('technicalUncertainty', statement.statement, 'skipped', false)
                    }
                    disabled={index !== 0 || suggestions.get('technicalUncertainty')?.status !== 'pending'}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Codes Section */}
          {reviewResult.codes && (
            <section>
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                Classification Codes
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {reviewResult.codes.anzsicCodes?.slice(0, 3).map((code, index) => (
                  <AiSuggestionCard
                    key={`anzsic-${index}`}
                    fieldLabel={`ANZSIC Code ${index + 1}`}
                    suggestion={`${code.code} - ${code.description}`}
                    confidence={code.confidence}
                    reasoning={code.rationale}
                    onAccept={() =>
                      index === 0 && updateSuggestion('anzsicCode', code.code, 'accepted', false)
                    }
                    onEdit={(value) =>
                      index === 0 && updateSuggestion('anzsicCode', value, 'edited', true)
                    }
                    onSkip={() =>
                      index === 0 && updateSuggestion('anzsicCode', code.code, 'skipped', false)
                    }
                    disabled={index !== 0 || suggestions.get('anzsicCode')?.status !== 'pending'}
                  />
                ))}
                {reviewResult.codes.forCodes?.slice(0, 3).map((code, index) => (
                  <AiSuggestionCard
                    key={`for-${index}`}
                    fieldLabel={`FOR Code ${index + 1}`}
                    suggestion={`${code.code} - ${code.description}`}
                    confidence={code.confidence}
                    reasoning={code.rationale}
                    onAccept={() =>
                      index === 0 && updateSuggestion('forCode', code.code, 'accepted', false)
                    }
                    onEdit={(value) => index === 0 && updateSuggestion('forCode', value, 'edited', true)}
                    onSkip={() =>
                      index === 0 && updateSuggestion('forCode', code.code, 'skipped', false)
                    }
                    disabled={index !== 0 || suggestions.get('forCode')?.status !== 'pending'}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Dominant Purpose Section */}
          {reviewResult.dominantPurpose && (
            <section>
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                Dominant Purpose Justification
              </h3>
              <AiSuggestionCard
                fieldLabel="Justification"
                suggestion={reviewResult.dominantPurpose.justification}
                confidence={80}
                onAccept={(value) => updateSuggestion('dominantPurpose', value, 'accepted', false)}
                onEdit={(value) => updateSuggestion('dominantPurpose', value, 'edited', true)}
                onSkip={() =>
                  updateSuggestion(
                    'dominantPurpose',
                    reviewResult.dominantPurpose!.justification,
                    'skipped',
                    false
                  )
                }
                disabled={suggestions.get('dominantPurpose')?.status !== 'pending'}
              />
            </section>
          )}

          {/* Errors Section */}
          {reviewResult.metadata.errors && reviewResult.metadata.errors.length > 0 && (
            <section>
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-red-600">
                Errors
              </h3>
              <div className="space-y-2">
                {reviewResult.metadata.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    <strong>{error.feature}:</strong> {error.message}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={accepted === 0 || isSaving}>
            {isSaving ? 'Saving...' : `Save ${accepted} Suggestion${accepted !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
