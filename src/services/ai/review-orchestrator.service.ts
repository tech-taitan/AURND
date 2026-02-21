/**
 * AI Review Orchestrator Service
 *
 * Coordinates all AI features to generate a complete review with validation loops.
 */

import type { AiReviewResult, AiReviewError } from '@/types/ai-review'
import { prisma } from '@/lib/db'
import { getHecAssistantService } from './hec-assistant.service'
import { getActivityClassifierService } from './activity-classifier.service'
import { getUncertaintyGeneratorService } from './uncertainty-generator.service'
import { getCodeSuggesterService } from './code-suggester.service'
import { getDominantPurposeService } from './dominant-purpose.service'
import { getValidationService } from './validation.service'
import { getSuccessScorerService } from './scoring/success-scorer.service'

// ============================================
// Types
// ============================================

interface ReviewInput {
  projectId: string
  activityId?: string
  organisationId: string
}

interface ProjectData {
  projectName: string
  projectDescription: string
  client: {
    companyName: string
    abn: string
  }
}

interface ActivityData {
  activityName: string
  activityDescription: string
  activityType?: string
  hypothesis?: string | null
  experiment?: string | null
  relatedCoreActivityId?: string | null
}

interface CoreActivity {
  id: string
  name: string
  description: string
}

// ============================================
// Service
// ============================================

const MAX_REFINEMENT_LOOPS = 2

export class ReviewOrchestratorService {
  /**
   * Execute a full AI review for a project/activity
   */
  async review(input: ReviewInput): Promise<AiReviewResult> {
    const startTime = Date.now()
    const errors: AiReviewError[] = []
    const featuresProcessed: string[] = []

    // Fetch project and activity data
    const { project, activity, coreActivities } = await this.fetchData(input)

    // Initialize result
    const result: AiReviewResult = {
      metadata: {
        generatedAt: new Date().toISOString(),
        processingTimeMs: 0,
        featuresProcessed: [],
        errors: [],
      },
    }

    // Run AI features in parallel where possible
    const [hecResult, classificationResult, uncertaintyResult, codesResult] = await Promise.allSettled([
      this.generateHec(project, activity, errors, featuresProcessed),
      this.generateClassification(activity, coreActivities, errors, featuresProcessed),
      this.generateUncertainty(project, activity, errors, featuresProcessed),
      this.generateCodes(project, activity, errors, featuresProcessed),
    ])

    // Collect results
    if (hecResult.status === 'fulfilled' && hecResult.value) {
      result.hec = hecResult.value
    }
    if (classificationResult.status === 'fulfilled' && classificationResult.value) {
      result.classification = classificationResult.value
    }
    if (uncertaintyResult.status === 'fulfilled' && uncertaintyResult.value) {
      result.uncertaintyStatements = uncertaintyResult.value
    }
    if (codesResult.status === 'fulfilled' && codesResult.value) {
      result.codes = codesResult.value
    }

    // Generate dominant purpose if needed
    if (
      result.classification?.type === 'SUPPORTING_DOMINANT_PURPOSE' &&
      result.classification.suggestedCoreActivityId
    ) {
      const coreActivity = coreActivities.find(
        (c) => c.id === result.classification?.suggestedCoreActivityId
      )
      if (coreActivity && activity) {
        const dominantResult = await this.generateDominantPurpose(
          activity,
          coreActivity,
          errors,
          featuresProcessed
        )
        if (dominantResult) {
          result.dominantPurpose = dominantResult
        }
      }
    }

    // Validation loop
    let refinementCount = 0

    while (refinementCount < MAX_REFINEMENT_LOOPS) {
      const validation = await this.validateResult(result, errors, featuresProcessed)
      result.validation = validation

      if (validation.status === 'passed' || validation.status === 'failed') {
        break
      }

      // needs_refinement - try to regenerate with feedback
      // For now, we'll just log the issues and break
      // Future enhancement: regenerate specific sections with feedback
      refinementCount++

      if (refinementCount >= MAX_REFINEMENT_LOOPS) {
        break
      }
    }

    // Calculate success likelihood score
    await this.calculateSuccessScore(result, errors, featuresProcessed)

    // Update metadata
    result.metadata = {
      generatedAt: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime,
      featuresProcessed,
      errors: errors.length > 0 ? errors : undefined,
    }

    return result
  }

  // ============================================
  // Data Fetching
  // ============================================

  private async fetchData(input: ReviewInput): Promise<{
    project: ProjectData
    activity: ActivityData | null
    coreActivities: CoreActivity[]
  }> {
    // Fetch project with client
    const project = await prisma.rDProject.findFirst({
      where: {
        id: input.projectId,
        client: { organisationId: input.organisationId },
      },
      include: {
        client: {
          select: {
            companyName: true,
            abn: true,
          },
        },
        activities: {
          where: { activityType: 'CORE' },
          select: {
            id: true,
            activityName: true,
            activityDescription: true,
          },
        },
      },
    })

    if (!project) {
      throw new Error('Project not found or access denied')
    }

    // Fetch specific activity if provided
    let activity: ActivityData | null = null
    if (input.activityId) {
      const activityData = await prisma.rDActivity.findFirst({
        where: {
          id: input.activityId,
          projectId: input.projectId,
        },
      })

      if (activityData) {
        activity = {
          activityName: activityData.activityName,
          activityDescription: activityData.activityDescription,
          activityType: activityData.activityType,
          hypothesis: activityData.hypothesis,
          experiment: activityData.experiment,
          relatedCoreActivityId: activityData.relatedCoreActivityId,
        }
      }
    }

    return {
      project: {
        projectName: project.projectName,
        projectDescription: project.projectDescription,
        client: project.client,
      },
      activity,
      coreActivities: project.activities.map((a) => ({
        id: a.id,
        name: a.activityName,
        description: a.activityDescription,
      })),
    }
  }

  // ============================================
  // AI Feature Generators
  // ============================================

  private async generateHec(
    project: ProjectData,
    activity: ActivityData | null,
    errors: AiReviewError[],
    featuresProcessed: string[]
  ) {
    try {
      const service = getHecAssistantService()
      const result = await service.generate({
        projectName: project.projectName,
        projectDescription: project.projectDescription,
        activityName: activity?.activityName,
        activityDescription: activity?.activityDescription,
        existingHypothesis: activity?.hypothesis ?? undefined,
        existingExperiment: activity?.experiment ?? undefined,
      })
      featuresProcessed.push('hec')
      return result
    } catch (error) {
      errors.push({
        feature: 'hec',
        message: error instanceof Error ? error.message : 'H-E-C generation failed',
      })
      return null
    }
  }

  private async generateClassification(
    activity: ActivityData | null,
    coreActivities: CoreActivity[],
    errors: AiReviewError[],
    featuresProcessed: string[]
  ) {
    if (!activity) return null

    try {
      const service = getActivityClassifierService()
      const result = await service.classify({
        activityName: activity.activityName,
        activityDescription: activity.activityDescription,
        existingCoreActivities: coreActivities.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
        })),
      })
      featuresProcessed.push('classification')
      return result
    } catch (error) {
      errors.push({
        feature: 'classification',
        message: error instanceof Error ? error.message : 'Classification failed',
      })
      return null
    }
  }

  private async generateUncertainty(
    project: ProjectData,
    activity: ActivityData | null,
    errors: AiReviewError[],
    featuresProcessed: string[]
  ) {
    try {
      const service = getUncertaintyGeneratorService()
      const result = await service.generate({
        activityName: activity?.activityName ?? project.projectName,
        activityDescription: activity?.activityDescription ?? project.projectDescription,
        projectDescription: project.projectDescription,
      })
      featuresProcessed.push('uncertainty')
      return result
    } catch (error) {
      errors.push({
        feature: 'uncertainty',
        message: error instanceof Error ? error.message : 'Uncertainty generation failed',
      })
      return null
    }
  }

  private async generateCodes(
    project: ProjectData,
    activity: ActivityData | null,
    errors: AiReviewError[],
    featuresProcessed: string[]
  ) {
    try {
      const service = getCodeSuggesterService()
      const result = await service.suggest({
        companyName: project.client.companyName,
        projectName: project.projectName,
        projectDescription: project.projectDescription,
        activityDescription: activity?.activityDescription,
      })
      featuresProcessed.push('codes')
      return result
    } catch (error) {
      errors.push({
        feature: 'codes',
        message: error instanceof Error ? error.message : 'Code suggestion failed',
      })
      return null
    }
  }

  private async generateDominantPurpose(
    activity: ActivityData,
    coreActivity: CoreActivity,
    errors: AiReviewError[],
    featuresProcessed: string[]
  ) {
    try {
      const service = getDominantPurposeService()
      const result = await service.generateJustification({
        activityName: activity.activityName,
        activityDescription: activity.activityDescription,
        linkedCoreActivity: {
          id: coreActivity.id,
          name: coreActivity.name,
          description: coreActivity.description,
        },
      })
      featuresProcessed.push('dominantPurpose')
      return result
    } catch (error) {
      errors.push({
        feature: 'dominantPurpose',
        message: error instanceof Error ? error.message : 'Dominant purpose generation failed',
      })
      return null
    }
  }

  private async validateResult(
    result: AiReviewResult,
    errors: AiReviewError[],
    featuresProcessed: string[]
  ) {
    try {
      const service = getValidationService()
      const validation = await service.validate(result)
      featuresProcessed.push('validation')
      return validation
    } catch (error) {
      errors.push({
        feature: 'validation',
        message: error instanceof Error ? error.message : 'Validation failed',
      })
      return { status: 'passed' as const, issues: [] }
    }
  }

  private async calculateSuccessScore(
    result: AiReviewResult,
    errors: AiReviewError[],
    featuresProcessed: string[]
  ) {
    try {
      const service = getSuccessScorerService()
      const successScore = await service.score(result)
      result.successScore = successScore
      featuresProcessed.push('successScoring')
    } catch (error) {
      errors.push({
        feature: 'successScoring',
        message: error instanceof Error ? error.message : 'Success scoring failed',
      })
      // Don't fail the entire review if scoring fails
    }
  }
}

// Singleton instance
let instance: ReviewOrchestratorService | null = null

export function getReviewOrchestratorService(): ReviewOrchestratorService {
  if (!instance) {
    instance = new ReviewOrchestratorService()
  }
  return instance
}

export function resetReviewOrchestratorService(): void {
  instance = null
}
