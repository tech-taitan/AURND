import { RDActivity, ActivityType, Prisma } from '@prisma/client'
import { BaseService, ActionResult } from './base.service'

export interface ActivityFormData {
  activityName: string
  activityType: ActivityType
  activityDescription: string
  hypothesis?: string
  experiment?: string
  observation?: string
  evaluation?: string
  conclusion?: string
  relatedCoreActivityId?: string
  dominantPurpose?: string
  isOverseasActivity: boolean
  overseasFindingId?: string
}

export type ActivityWithRelations = Prisma.RDActivityGetPayload<{
  include: {
    project: {
      select: {
        id: true
        projectName: true
        clientId: true
      }
    }
    relatedCoreActivity: {
      select: {
        id: true
        activityName: true
      }
    }
    supportingActivities: {
      select: {
        id: true
        activityName: true
        activityType: true
      }
    }
    timeAllocations: {
      include: {
        staffMember: {
          select: {
            id: true
            name: true
          }
        }
      }
    }
    expenditures: true
  }
}>

export interface HECValidationResult {
  isValid: boolean
  missingFields: string[]
  qualityScore: number // 1-10
  suggestions: string[]
}

class ActivityService extends BaseService {
  async create(
    projectId: string,
    data: ActivityFormData,
    userId?: string
  ): Promise<ActionResult<RDActivity>> {
    try {
      // Verify project exists
      const project = await this.prisma.rDProject.findUnique({
        where: { id: projectId },
      })

      if (!project) {
        return { success: false, error: 'Project not found' }
      }

      // Validate supporting activity has related core activity
      if (
        (data.activityType === 'SUPPORTING_DIRECT' ||
          data.activityType === 'SUPPORTING_DOMINANT_PURPOSE') &&
        !data.relatedCoreActivityId
      ) {
        return {
          success: false,
          error: 'Supporting activities must be linked to a core activity',
        }
      }

      // Validate related core activity exists and belongs to same project
      if (data.relatedCoreActivityId) {
        const coreActivity = await this.prisma.rDActivity.findUnique({
          where: { id: data.relatedCoreActivityId },
        })

        if (!coreActivity) {
          return { success: false, error: 'Related core activity not found' }
        }

        if (coreActivity.projectId !== projectId) {
          return {
            success: false,
            error: 'Related core activity must belong to the same project',
          }
        }

        if (coreActivity.activityType !== 'CORE') {
          return {
            success: false,
            error: 'Related activity must be a CORE activity',
          }
        }
      }

      const activity = await this.prisma.rDActivity.create({
        data: {
          projectId,
          activityName: data.activityName,
          activityType: data.activityType,
          activityDescription: data.activityDescription,
          hypothesis: data.hypothesis || null,
          experiment: data.experiment || null,
          observation: data.observation || null,
          evaluation: data.evaluation || null,
          conclusion: data.conclusion || null,
          relatedCoreActivityId: data.relatedCoreActivityId || null,
          dominantPurpose: data.dominantPurpose || null,
          isOverseasActivity: data.isOverseasActivity,
          overseasFindingId: data.overseasFindingId || null,
        },
      })

      await this.auditLog('CREATE', 'RDActivity', activity.id, userId, null, activity)

      return { success: true, data: activity }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  async findById(id: string): Promise<ActivityWithRelations | null> {
    return this.prisma.rDActivity.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            projectName: true,
            clientId: true,
          },
        },
        relatedCoreActivity: {
          select: {
            id: true,
            activityName: true,
          },
        },
        supportingActivities: {
          select: {
            id: true,
            activityName: true,
            activityType: true,
          },
        },
        timeAllocations: {
          include: {
            staffMember: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        expenditures: true,
      },
    })
  }

  async listByProject(projectId: string): Promise<RDActivity[]> {
    return this.prisma.rDActivity.findMany({
      where: { projectId },
      orderBy: [{ activityType: 'asc' }, { createdAt: 'asc' }],
    })
  }

  async listByClient(clientId: string): Promise<
    Array<{
      id: string
      activityName: string
      activityType: ActivityType
      project: { id: string; projectName: string }
    }>
  > {
    return this.prisma.rDActivity.findMany({
      where: {
        project: { clientId },
      },
      select: {
        id: true,
        activityName: true,
        activityType: true,
        project: {
          select: {
            id: true,
            projectName: true,
          },
        },
      },
      orderBy: [{ project: { projectName: 'asc' } }, { activityName: 'asc' }],
    })
  }

  async getCoreActivities(projectId: string): Promise<RDActivity[]> {
    return this.prisma.rDActivity.findMany({
      where: {
        projectId,
        activityType: 'CORE',
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  async update(
    id: string,
    data: Partial<ActivityFormData>,
    userId?: string
  ): Promise<ActionResult<RDActivity>> {
    try {
      const existing = await this.prisma.rDActivity.findUnique({ where: { id } })
      if (!existing) {
        return { success: false, error: 'Activity not found' }
      }

      // Validate type change constraints
      if (data.activityType && data.activityType !== existing.activityType) {
        // If changing from CORE to supporting, check no activities depend on it
        if (existing.activityType === 'CORE') {
          const dependents = await this.prisma.rDActivity.count({
            where: { relatedCoreActivityId: id },
          })
          if (dependents > 0) {
            return {
              success: false,
              error: `Cannot change to supporting type: ${dependents} activities depend on this core activity`,
            }
          }
        }

        // If changing to supporting, require related core activity
        if (
          (data.activityType === 'SUPPORTING_DIRECT' ||
            data.activityType === 'SUPPORTING_DOMINANT_PURPOSE') &&
          !data.relatedCoreActivityId &&
          !existing.relatedCoreActivityId
        ) {
          return {
            success: false,
            error: 'Supporting activities must be linked to a core activity',
          }
        }
      }

      const activity = await this.prisma.rDActivity.update({
        where: { id },
        data: {
          ...(data.activityName && { activityName: data.activityName }),
          ...(data.activityType && { activityType: data.activityType }),
          ...(data.activityDescription && {
            activityDescription: data.activityDescription,
          }),
          ...(data.hypothesis !== undefined && { hypothesis: data.hypothesis || null }),
          ...(data.experiment !== undefined && { experiment: data.experiment || null }),
          ...(data.observation !== undefined && { observation: data.observation || null }),
          ...(data.evaluation !== undefined && { evaluation: data.evaluation || null }),
          ...(data.conclusion !== undefined && { conclusion: data.conclusion || null }),
          ...(data.relatedCoreActivityId !== undefined && {
            relatedCoreActivityId: data.relatedCoreActivityId || null,
          }),
          ...(data.dominantPurpose !== undefined && {
            dominantPurpose: data.dominantPurpose || null,
          }),
          ...(data.isOverseasActivity !== undefined && {
            isOverseasActivity: data.isOverseasActivity,
          }),
          ...(data.overseasFindingId !== undefined && {
            overseasFindingId: data.overseasFindingId || null,
          }),
        },
      })

      await this.auditLog('UPDATE', 'RDActivity', id, userId, existing, activity)

      return { success: true, data: activity }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  async delete(id: string, userId?: string): Promise<ActionResult<void>> {
    try {
      const existing = await this.prisma.rDActivity.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              supportingActivities: true,
              timeAllocations: true,
              expenditures: true,
            },
          },
        },
      })

      if (!existing) {
        return { success: false, error: 'Activity not found' }
      }

      if (existing._count.supportingActivities > 0) {
        return {
          success: false,
          error: `Cannot delete: ${existing._count.supportingActivities} supporting activities depend on this activity`,
        }
      }

      if (existing._count.timeAllocations > 0 || existing._count.expenditures > 0) {
        return {
          success: false,
          error: 'Cannot delete activity with existing time allocations or expenditures',
        }
      }

      await this.prisma.rDActivity.delete({ where: { id } })
      await this.auditLog('DELETE', 'RDActivity', id, userId, existing, null)

      return { success: true, data: undefined }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  /**
   * Validate H-E-C (Hypothesis-Experiment-Conclusion) documentation
   * Returns validation result with quality assessment
   */
  validateHECFramework(activity: RDActivity): HECValidationResult {
    const missingFields: string[] = []
    const suggestions: string[] = []
    let qualityScore = 10

    // Core activities must have H-E-C documentation
    if (activity.activityType === 'CORE') {
      if (!activity.hypothesis) {
        missingFields.push('hypothesis')
        qualityScore -= 2
        suggestions.push('Add a hypothesis describing what you aimed to achieve')
      } else if (activity.hypothesis.length < 50) {
        qualityScore -= 1
        suggestions.push('Expand hypothesis with more detail about the technical objective')
      }

      if (!activity.experiment) {
        missingFields.push('experiment')
        qualityScore -= 2
        suggestions.push('Describe the experimental methodology used')
      } else if (activity.experiment.length < 50) {
        qualityScore -= 1
        suggestions.push('Add more detail about the experimental approach')
      }

      if (!activity.observation) {
        missingFields.push('observation')
        qualityScore -= 2
        suggestions.push('Document the observations from your experiments')
      }

      if (!activity.conclusion) {
        missingFields.push('conclusion')
        qualityScore -= 2
        suggestions.push('Add conclusions drawn from the experimental results')
      }
    }

    // Supporting activities with dominant purpose must have justification
    if (
      activity.activityType === 'SUPPORTING_DOMINANT_PURPOSE' &&
      !activity.dominantPurpose
    ) {
      missingFields.push('dominantPurpose')
      qualityScore -= 2
      suggestions.push('Provide justification for why R&D is the dominant purpose')
    }

    // Overseas activities must have finding ID
    if (activity.isOverseasActivity && !activity.overseasFindingId) {
      missingFields.push('overseasFindingId')
      qualityScore -= 1
      suggestions.push('Add the overseas finding ID from AusIndustry')
    }

    // Check description quality
    if (activity.activityDescription.length < 100) {
      qualityScore -= 1
      suggestions.push('Expand the activity description with more technical detail')
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
      qualityScore: Math.max(1, qualityScore),
      suggestions,
    }
  }

  /**
   * Get activity statistics for a project
   */
  async getActivityStats(projectId: string): Promise<{
    total: number
    core: number
    supportingDirect: number
    supportingDominant: number
    overseas: number
    avgQualityScore: number
  }> {
    const activities = await this.prisma.rDActivity.findMany({
      where: { projectId },
    })

    let totalQuality = 0
    let core = 0
    let supportingDirect = 0
    let supportingDominant = 0
    let overseas = 0

    for (const activity of activities) {
      const validation = this.validateHECFramework(activity)
      totalQuality += validation.qualityScore

      switch (activity.activityType) {
        case 'CORE':
          core++
          break
        case 'SUPPORTING_DIRECT':
          supportingDirect++
          break
        case 'SUPPORTING_DOMINANT_PURPOSE':
          supportingDominant++
          break
      }

      if (activity.isOverseasActivity) {
        overseas++
      }
    }

    return {
      total: activities.length,
      core,
      supportingDirect,
      supportingDominant,
      overseas,
      avgQualityScore: activities.length > 0 ? totalQuality / activities.length : 0,
    }
  }
}

export const activityService = new ActivityService()
