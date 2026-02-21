import { Prisma, TimeAllocation } from '@prisma/client'
import { BaseService, ActionResult } from './base.service'

export interface TimeAllocationFormData {
  staffMemberId: string
  activityId: string
  periodStart: string
  periodEnd: string
  hoursAllocated: string | number
  percentageOfTime?: string | number
  description?: string
}

export type TimeAllocationWithRelations = Prisma.TimeAllocationGetPayload<{
  include: {
    staffMember: {
      select: {
        id: true
        name: true
        hourlyRate: true
      }
    }
    activity: {
      select: {
        id: true
        activityName: true
        project: {
          select: {
            id: true
            projectName: true
            clientId: true
          }
        }
      }
    }
  }
}>

class TimeAllocationService extends BaseService {
  private toNumber(value?: string | number): number | null {
    if (value === undefined || value === null || value === '') return null
    const parsed = typeof value === 'number' ? value : Number(value)
    return Number.isNaN(parsed) ? null : parsed
  }

  private async calculateCost(
    staffMemberId: string,
    hoursAllocated: string | number
  ): Promise<Prisma.Decimal | null> {
    const staff = await this.prisma.staffMember.findUnique({
      where: { id: staffMemberId },
    })

    if (!staff) return null

    const hours = this.toNumber(hoursAllocated)
    if (!hours) return null

    const hourlyRate = staff.hourlyRate?.toNumber()
    if (!hourlyRate) return null

    return new Prisma.Decimal(hours * hourlyRate)
  }

  async create(
    data: TimeAllocationFormData,
    userId?: string
  ): Promise<ActionResult<TimeAllocation>> {
    try {
      const staff = await this.prisma.staffMember.findUnique({
        where: { id: data.staffMemberId },
      })
      if (!staff) {
        return { success: false, error: 'Staff member not found' }
      }

      const activity = await this.prisma.rDActivity.findUnique({
        where: { id: data.activityId },
      })
      if (!activity) {
        return { success: false, error: 'Activity not found' }
      }

      const calculatedCost = await this.calculateCost(
        data.staffMemberId,
        data.hoursAllocated
      )

      const allocation = await this.prisma.timeAllocation.create({
        data: {
          staffMemberId: data.staffMemberId,
          activityId: data.activityId,
          periodStart: new Date(data.periodStart),
          periodEnd: new Date(data.periodEnd),
          hoursAllocated: new Prisma.Decimal(this.toNumber(data.hoursAllocated) || 0),
          percentageOfTime: this.toNumber(data.percentageOfTime)
            ? new Prisma.Decimal(this.toNumber(data.percentageOfTime)!)
            : null,
          calculatedCost,
          description: data.description || null,
        },
      })

      await this.auditLog('CREATE', 'TimeAllocation', allocation.id, userId, null, allocation)

      return { success: true, data: allocation }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  async update(
    id: string,
    data: Partial<TimeAllocationFormData>,
    userId?: string
  ): Promise<ActionResult<TimeAllocation>> {
    try {
      const existing = await this.prisma.timeAllocation.findUnique({ where: { id } })
      if (!existing) {
        return { success: false, error: 'Time allocation not found' }
      }

      const staffMemberId = data.staffMemberId || existing.staffMemberId
      const hoursAllocated = data.hoursAllocated ?? existing.hoursAllocated.toNumber()
      const calculatedCost =
        data.staffMemberId !== undefined || data.hoursAllocated !== undefined
          ? await this.calculateCost(staffMemberId, hoursAllocated)
          : existing.calculatedCost

      const allocation = await this.prisma.timeAllocation.update({
        where: { id },
        data: {
          ...(data.staffMemberId && { staffMemberId: data.staffMemberId }),
          ...(data.activityId && { activityId: data.activityId }),
          ...(data.periodStart && { periodStart: new Date(data.periodStart) }),
          ...(data.periodEnd && { periodEnd: new Date(data.periodEnd) }),
          ...(data.hoursAllocated !== undefined && {
            hoursAllocated: new Prisma.Decimal(this.toNumber(data.hoursAllocated) || 0),
          }),
          ...(data.percentageOfTime !== undefined && {
            percentageOfTime: this.toNumber(data.percentageOfTime)
              ? new Prisma.Decimal(this.toNumber(data.percentageOfTime)!)
              : null,
          }),
          ...(data.description !== undefined && { description: data.description || null }),
          ...(calculatedCost !== undefined && { calculatedCost }),
        },
      })

      await this.auditLog('UPDATE', 'TimeAllocation', id, userId, existing, allocation)

      return { success: true, data: allocation }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  async findById(id: string): Promise<TimeAllocationWithRelations | null> {
    return this.prisma.timeAllocation.findUnique({
      where: { id },
      include: {
        staffMember: {
          select: {
            id: true,
            name: true,
            hourlyRate: true,
          },
        },
        activity: {
          select: {
            id: true,
            activityName: true,
            project: {
              select: {
                id: true,
                projectName: true,
                clientId: true,
              },
            },
          },
        },
      },
    })
  }

  async listByStaff(staffMemberId: string): Promise<TimeAllocationWithRelations[]> {
    return this.prisma.timeAllocation.findMany({
      where: { staffMemberId },
      include: {
        staffMember: {
          select: {
            id: true,
            name: true,
            hourlyRate: true,
          },
        },
        activity: {
          select: {
            id: true,
            activityName: true,
            project: { select: { id: true, projectName: true, clientId: true } },
          },
        },
      },
      orderBy: { periodStart: 'desc' },
    })
  }

  async listByActivity(activityId: string): Promise<TimeAllocationWithRelations[]> {
    return this.prisma.timeAllocation.findMany({
      where: { activityId },
      include: {
        staffMember: {
          select: {
            id: true,
            name: true,
            hourlyRate: true,
          },
        },
        activity: {
          select: {
            id: true,
            activityName: true,
            project: { select: { id: true, projectName: true, clientId: true } },
          },
        },
      },
      orderBy: { periodStart: 'desc' },
    })
  }

  async delete(id: string, userId?: string): Promise<ActionResult<void>> {
    try {
      const existing = await this.prisma.timeAllocation.findUnique({ where: { id } })
      if (!existing) {
        return { success: false, error: 'Time allocation not found' }
      }

      await this.prisma.timeAllocation.delete({ where: { id } })
      await this.auditLog('DELETE', 'TimeAllocation', id, userId, existing, null)

      return { success: true, data: undefined }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }
}

export const timeAllocationService = new TimeAllocationService()
