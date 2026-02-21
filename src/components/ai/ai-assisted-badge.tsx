'use client'

/**
 * AI-Assisted Badge Component
 *
 * Small indicator that shows when a field was AI-generated.
 */

import { cn } from '@/lib/utils'

interface AiAssistedBadgeProps {
  /** The field name to check */
  fieldName: string
  /** Array of AI-generated field names */
  aiGeneratedFields?: string[]
  /** Additional CSS classes */
  className?: string
}

// Small sparkle icon for the badge
function SmallSparkleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  )
}

export function AiAssistedBadge({
  fieldName,
  aiGeneratedFields,
  className,
}: AiAssistedBadgeProps) {
  // Don't render if field wasn't AI-generated
  if (!aiGeneratedFields?.includes(fieldName)) {
    return null
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded',
        className
      )}
      title="AI-assisted"
    >
      <SmallSparkleIcon />
      <span>AI</span>
    </span>
  )
}
