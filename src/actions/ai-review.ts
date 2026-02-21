'use server'

/**
 * AI Review Server Actions
 *
 * Handles saving accepted AI suggestions to the database.
 */

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { AcceptedSuggestion } from '@/types/ai-review'
import type { ActivityType } from '@prisma/client'

interface SaveSuggestionsInput {
  activityId: string
  suggestions: AcceptedSuggestion[]
}

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Map field names to database columns
 */
const FIELD_MAPPINGS: Record<string, string> = {
  hypothesis: 'hypothesis',
  experiment: 'experiment',
  observation: 'observation',
  evaluation: 'evaluation',
  conclusion: 'conclusion',
  technicalUncertainty: 'technicalUncertainty',
  activityType: 'activityType',
  anzsicCode: 'anzsicCode',
  forCode: 'forCode',
  dominantPurpose: 'dominantPurpose',
}

/**
 * Validate activity type value
 */
function isValidActivityType(value: string): value is ActivityType {
  return ['CORE', 'SUPPORTING_DIRECT', 'SUPPORTING_DOMINANT_PURPOSE'].includes(value)
}

/**
 * Save accepted AI suggestions to an activity
 */
export async function saveAiSuggestions(
  input: SaveSuggestionsInput
): Promise<ActionResult<{ id: string }>> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return { success: false, error: 'Unauthorized' }
  }

  const organisationId = session.user.organisationId
  if (!organisationId) {
    return { success: false, error: 'No organisation associated with user' }
  }

  try {
    const { activityId, suggestions } = input

    // Verify activity exists and user has access
    const activity = await prisma.rDActivity.findFirst({
      where: {
        id: activityId,
        project: {
          client: {
            organisationId,
          },
        },
      },
      include: {
        project: {
          select: {
            id: true,
            clientId: true,
          },
        },
      },
    })

    if (!activity) {
      return { success: false, error: 'Activity not found or access denied' }
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    const aiGeneratedFields: string[] = [...(activity.aiGeneratedFields || [])]

    for (const suggestion of suggestions) {
      const dbField = FIELD_MAPPINGS[suggestion.fieldName]
      if (!dbField) {
        console.warn(`Unknown field: ${suggestion.fieldName}`)
        continue
      }

      // Special handling for activityType (enum)
      if (dbField === 'activityType') {
        if (!isValidActivityType(suggestion.value)) {
          console.warn(`Invalid activity type: ${suggestion.value}`)
          continue
        }
        updateData[dbField] = suggestion.value
      } else {
        updateData[dbField] = suggestion.value
      }

      // Track AI-generated fields (don't add duplicates)
      if (!aiGeneratedFields.includes(suggestion.fieldName)) {
        aiGeneratedFields.push(suggestion.fieldName)
      }
    }

    // Update aiGeneratedFields
    updateData.aiGeneratedFields = aiGeneratedFields

    // Store AI review history
    const existingHistory = (activity.aiReviewHistory as unknown[]) || []
    const newHistoryEntry = {
      timestamp: new Date().toISOString(),
      userId: session.user.id,
      suggestionsAccepted: suggestions.length,
      fields: suggestions.map((s) => s.fieldName),
    }
    updateData.aiReviewHistory = [...existingHistory, newHistoryEntry]

    // Update the activity
    await prisma.rDActivity.update({
      where: { id: activityId },
      data: updateData,
    })

    // Revalidate relevant paths
    revalidatePath(`/projects/${activity.project.id}`)
    revalidatePath(`/projects/${activity.project.id}/activities/${activityId}`)
    revalidatePath(`/clients/${activity.project.clientId}`)

    return { success: true, data: { id: activityId } }
  } catch (error) {
    console.error('Failed to save AI suggestions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save suggestions',
    }
  }
}
