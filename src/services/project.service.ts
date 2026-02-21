import { RDProject, ProjectStatus, Prisma } from '@prisma/client'
import { BaseService, ActionResult } from './base.service'

export interface ProjectFormData {
  projectName: string
  projectCode?: string
  status: ProjectStatus
  projectDescription: string
  technicalHypothesis?: string
  methodology?: string
  technicalUncertainty?: string
  expectedOutcome?: string
  industryCode?: string
  fieldOfResearch?: string
  startDate?: string
  endDate?: string
}

export type ProjectWithActivities = Prisma.RDProjectGetPayload<{
  include: {
    activities: true
    expenditures: true
    client: {
      select: {
        id: true
        companyName: true
        abn: true
      }
    }
  }
}>

export type ProjectWithCounts = Prisma.RDProjectGetPayload<{
  include: {
    _count: {
      select: {
        activities: true
        expenditures: true
      }
    }
  }
}>

class ProjectService extends BaseService {
  async create(
    clientId: string,
    data: ProjectFormData,
    userId?: string
  ): Promise<ActionResult<RDProject>> {
    try {
      // Verify client exists
      const client = await this.prisma.client.findUnique({
        where: { id: clientId },
      })

      if (!client) {
        return { success: false, error: 'Client not found' }
      }

      const project = await this.prisma.rDProject.create({
        data: {
          clientId,
          projectName: data.projectName,
          projectCode: data.projectCode || null,
          status: data.status,
          projectDescription: data.projectDescription,
          technicalHypothesis: data.technicalHypothesis || null,
          methodology: data.methodology || null,
          technicalUncertainty: data.technicalUncertainty || null,
          expectedOutcome: data.expectedOutcome || null,
          industryCode: data.industryCode || null,
          fieldOfResearch: data.fieldOfResearch || null,
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
        },
      })

      await this.auditLog('CREATE', 'RDProject', project.id, userId, null, project)

      return { success: true, data: project }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  async findById(id: string): Promise<ProjectWithActivities | null> {
    return this.prisma.rDProject.findUnique({
      where: { id },
      include: {
        activities: {
          orderBy: { createdAt: 'asc' },
        },
        expenditures: {
          orderBy: { createdAt: 'desc' },
        },
        client: {
          select: {
            id: true,
            companyName: true,
            abn: true,
          },
        },
      },
    })
  }

  async listByClient(clientId: string): Promise<ProjectWithCounts[]> {
    return this.prisma.rDProject.findMany({
      where: { clientId },
      include: {
        _count: {
          select: {
            activities: true,
            expenditures: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async listAll(organisationId: string): Promise<(ProjectWithCounts & { client: { companyName: string } })[]> {
    return this.prisma.rDProject.findMany({
      where: {
        client: { organisationId },
      },
      include: {
        client: {
          select: {
            companyName: true,
          },
        },
        _count: {
          select: {
            activities: true,
            expenditures: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async update(
    id: string,
    data: Partial<ProjectFormData>,
    userId?: string
  ): Promise<ActionResult<RDProject>> {
    try {
      const existing = await this.prisma.rDProject.findUnique({ where: { id } })
      if (!existing) {
        return { success: false, error: 'Project not found' }
      }

      const project = await this.prisma.rDProject.update({
        where: { id },
        data: {
          ...(data.projectName && { projectName: data.projectName }),
          ...(data.projectCode !== undefined && { projectCode: data.projectCode || null }),
          ...(data.status && { status: data.status }),
          ...(data.projectDescription && { projectDescription: data.projectDescription }),
          ...(data.technicalHypothesis !== undefined && {
            technicalHypothesis: data.technicalHypothesis || null,
          }),
          ...(data.methodology !== undefined && { methodology: data.methodology || null }),
          ...(data.technicalUncertainty !== undefined && {
            technicalUncertainty: data.technicalUncertainty || null,
          }),
          ...(data.expectedOutcome !== undefined && {
            expectedOutcome: data.expectedOutcome || null,
          }),
          ...(data.industryCode !== undefined && { industryCode: data.industryCode || null }),
          ...(data.fieldOfResearch !== undefined && {
            fieldOfResearch: data.fieldOfResearch || null,
          }),
          ...(data.startDate !== undefined && {
            startDate: data.startDate ? new Date(data.startDate) : null,
          }),
          ...(data.endDate !== undefined && {
            endDate: data.endDate ? new Date(data.endDate) : null,
          }),
        },
      })

      await this.auditLog('UPDATE', 'RDProject', id, userId, existing, project)

      return { success: true, data: project }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  async updateStatus(
    id: string,
    status: ProjectStatus,
    userId?: string
  ): Promise<ActionResult<RDProject>> {
    return this.update(id, { status }, userId)
  }

  async delete(id: string, userId?: string): Promise<ActionResult<void>> {
    try {
      const existing = await this.prisma.rDProject.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              activities: true,
              expenditures: true,
            },
          },
        },
      })

      if (!existing) {
        return { success: false, error: 'Project not found' }
      }

      if (existing._count.activities > 0 || existing._count.expenditures > 0) {
        return {
          success: false,
          error: 'Cannot delete project with existing activities or expenditures',
        }
      }

      await this.prisma.rDProject.delete({ where: { id } })
      await this.auditLog('DELETE', 'RDProject', id, userId, existing, null)

      return { success: true, data: undefined }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  async calculateProjectExpenditure(projectId: string): Promise<number> {
    const result = await this.prisma.expenditure.aggregate({
      where: { projectId },
      _sum: { amountExGst: true },
    })

    return result._sum.amountExGst ? Number(result._sum.amountExGst) : 0
  }

  async getProjectStats(projectId: string): Promise<{
    coreActivities: number
    supportingActivities: number
    totalExpenditure: number
    staffAllocated: number
  }> {
    const [activities, expenditure, timeAllocations] = await Promise.all([
      this.prisma.rDActivity.groupBy({
        by: ['activityType'],
        where: { projectId },
        _count: true,
      }),
      this.calculateProjectExpenditure(projectId),
      this.prisma.timeAllocation.findMany({
        where: { activity: { projectId } },
        select: { staffMemberId: true },
        distinct: ['staffMemberId'],
      }),
    ])

    const coreActivities =
      activities.find((a) => a.activityType === 'CORE')?._count || 0
    const supportingActivities = activities
      .filter((a) => a.activityType !== 'CORE')
      .reduce((sum, a) => sum + a._count, 0)

    return {
      coreActivities,
      supportingActivities,
      totalExpenditure: expenditure,
      staffAllocated: timeAllocations.length,
    }
  }
}

export const projectService = new ProjectService()
