'use client'

/**
 * AI Suggestion Card Component
 *
 * Displays a single AI suggestion with accept/edit/skip actions.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface AiSuggestionCardProps {
  /** Label for the field */
  fieldLabel: string
  /** Current value (if any) */
  currentValue?: string
  /** AI-suggested value */
  suggestion: string
  /** Confidence score (0-100) */
  confidence: number
  /** Reasoning for the suggestion */
  reasoning?: string
  /** Called when user accepts the suggestion */
  onAccept: (value: string) => void
  /** Called when user edits and saves */
  onEdit: (value: string) => void
  /** Called when user skips this suggestion */
  onSkip: () => void
  /** Whether this card is disabled */
  disabled?: boolean
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'bg-green-100 text-green-800 border-green-200'
  if (confidence >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  return 'bg-red-100 text-red-800 border-red-200'
}

export function AiSuggestionCard({
  fieldLabel,
  currentValue,
  suggestion,
  confidence,
  reasoning,
  onAccept,
  onEdit,
  onSkip,
  disabled = false,
}: AiSuggestionCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedValue, setEditedValue] = useState(suggestion)
  const [isExpanded, setIsExpanded] = useState(false)

  const handleAccept = () => {
    onAccept(suggestion)
  }

  const handleStartEdit = () => {
    setEditedValue(suggestion)
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    onEdit(editedValue)
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditedValue(suggestion)
    setIsEditing(false)
  }

  return (
    <Card className={cn('p-4', disabled && 'opacity-50')}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-sm">{fieldLabel}</h4>
        <Badge variant="outline" className={cn('text-xs', getConfidenceColor(confidence))}>
          {confidence}% confident
        </Badge>
      </div>

      {/* Current value (if exists) */}
      {currentValue && (
        <div className="mb-2">
          <p className="text-xs text-muted-foreground mb-1">Current:</p>
          <p className="text-sm text-muted-foreground italic line-clamp-2">{currentValue}</p>
        </div>
      )}

      {/* Suggestion or Edit mode */}
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editedValue}
            onChange={(e) => setEditedValue(e.target.value)}
            rows={4}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveEdit} disabled={disabled}>
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancelEdit} disabled={disabled}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-1">AI Suggestion:</p>
          <p className="text-sm whitespace-pre-wrap">{suggestion}</p>
        </div>
      )}

      {/* Reasoning (expandable) */}
      {reasoning && !isEditing && (
        <div className="mb-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <span>{isExpanded ? '▼' : '▶'}</span>
            <span>Why this suggestion?</span>
          </button>
          {isExpanded && (
            <p className="text-xs text-muted-foreground mt-1 pl-4 border-l-2 border-muted">
              {reasoning}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      {!isEditing && (
        <div className="flex gap-2 pt-2 border-t">
          <Button
            size="sm"
            onClick={handleAccept}
            disabled={disabled}
            className="bg-green-600 hover:bg-green-700"
          >
            Accept
          </Button>
          <Button size="sm" variant="outline" onClick={handleStartEdit} disabled={disabled}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={onSkip} disabled={disabled}>
            Skip
          </Button>
        </div>
      )}
    </Card>
  )
}
