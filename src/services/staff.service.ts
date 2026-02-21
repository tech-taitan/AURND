import { Prisma, StaffMember } from '@prisma/client'
import { BaseService, ActionResult } from './base.service'

export interface StaffFormData {
  name: string
  position?: string
  employeeId?: string
  annualSalary?: string | number
  onCosts?: string | number
  hourlyRate?: string | number
  startDate?: string
  endDate?: string
}

export type StaffWithRelations = Prisma.StaffMemberGetPayload<{
  include: {
    timeAllocations: {
      include: {
        activity: {
          select: {
            id: true
            activityName: true
            project: {
              select: {
                id: true
                projectName: true
              }
            }
          }
        }
      }
    }
  }
}>

export type StaffWithCounts = Prisma.StaffMemberGetPayload<{
  include: {
    _count: {
      select: {
        timeAllocations: true
      }
    }
  }
}>

const DEFAULT_ANNUAL_HOURS = 1950

class StaffService extends BaseService {
  private toNumber(value?: string | number): number | null {
    if (value === undefined || value === null || value === '') return null
    const parsed = typeof value === 'number' ? value : Number(value)
    return Number.isNaN(parsed) ? null : parsed
  }

  private calculateHourlyRate(
    annualSalary?: string | number,
    onCosts?: string | number,
    hourlyRate?: string | number
  ): number | null {
    const explicitRate = this.toNumber(hourlyRate)
    if (explicitRate && explicitRate > 0) return explicitRate

    const salary = this.toNumber(annualSalary)
    if (!salary) return null

    const costs = this.toNumber(onCosts) || 0
    const total = salary + costs
    return total / DEFAULT_ANNUAL_HOURS
  }

  async create(
    clientId: string,
    data: StaffFormData,
    userId?: string
  ): Promise<ActionResult<StaffMember>> {
    try {
      const client = await this.prisma.client.findUnique({ where: { id: clientId } })
      if (!client) {
        return { success: false, error: 'Client not found' }
      }

      const hourlyRate = this.calculateHourlyRate(
        data.annualSalary,
        data.onCosts,
        data.hourlyRate
      )

      const staff = await this.prisma.staffMember.create({
        data: {
          clientId,
          name: data.name,
          position: data.position || null,
          employeeId: data.employeeId || null,
          annualSalary: this.toNumber(data.annualSalary)
            ? new Prisma.Decimal(this.toNumber(data.annualSalary)!)
            : null,
          onCosts: this.toNumber(data.onCosts)
            ? new Prisma.Decimal(this.toNumber(data.onCosts)!)
            : null,
          hourlyRate: hourlyRate ? new Prisma.Decimal(hourlyRate) : null,
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
        },
      })

      await this.auditLog('CREATE', 'StaffMember', staff.id, userId, null, staff)

      return { success: true, data: staff }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  async update(
    id: string,
    data: Partial<StaffFormData>,
    userId?: string
  ): Promise<ActionResult<StaffMember>> {
    try {
      const existing = await this.prisma.staffMember.findUnique({ where: { id } })
      if (!existing) {
        return { success: false, error: 'Staff member not found' }
      }

      const annualSalary =
        data.annualSalary !== undefined ? data.annualSalary : existing.annualSalary?.toNumber()
      const onCosts =
        data.onCosts !== undefined ? data.onCosts : existing.onCosts?.toNumber()
      const hourlyRate =
        data.hourlyRate !== undefined ? data.hourlyRate : existing.hourlyRate?.toNumber()

      const calculatedHourlyRate = this.calculateHourlyRate(
        annualSalary,
        onCosts,
        hourlyRate
      )

      const staff = await this.prisma.staffMember.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.position !== undefined && { position: data.position || null }),
          ...(data.employeeId !== undefined && { employeeId: data.employeeId || null }),
          ...(data.annualSalary !== undefined && {
            annualSalary: this.toNumber(data.annualSalary)
              ? new Prisma.Decimal(this.toNumber(data.annualSalary)!)
              : null,
          }),
          ...(data.onCosts !== undefined && {
            onCosts: this.toNumber(data.onCosts)
              ? new Prisma.Decimal(this.toNumber(data.onCosts)!)
              : null,
          }),
          ...(data.hourlyRate !== undefined || data.annualSalary !== undefined || data.onCosts !== undefined
            ? { hourlyRate: calculatedHourlyRate ? new Prisma.Decimal(calculatedHourlyRate) : null }
            : {}),
          ...(data.startDate !== undefined && {
            startDate: data.startDate ? new Date(data.startDate) : null,
          }),
          ...(data.endDate !== undefined && {
            endDate: data.endDate ? new Date(data.endDate) : null,
          }),
        },
      })

      await this.auditLog('UPDATE', 'StaffMember', id, userId, existing, staff)

      return { success: true, data: staff }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  async findById(id: string): Promise<StaffWithRelations | null> {
    return this.prisma.staffMember.findUnique({
      where: { id },
      include: {
        timeAllocations: {
          orderBy: { periodStart: 'desc' },
          include: {
            activity: {
              select: {
                id: true,
                activityName: true,
                project: { select: { id: true, projectName: true } },
              },
            },
          },
        },
      },
    })
  }

  async listByClient(clientId: string): Promise<StaffWithCounts[]> {
    return this.prisma.staffMember.findMany({
      where: { clientId },
      include: {
        _count: {
          select: {
            timeAllocations: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })
  }

  async delete(id: string, userId?: string): Promise<ActionResult<void>> {
    try {
      const existing = await this.prisma.staffMember.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              timeAllocations: true,
            },
          },
        },
      })

      if (!existing) {
        return { success: false, error: 'Staff member not found' }
      }

      if (existing._count.timeAllocations > 0) {
        return {
          success: false,
          error: 'Cannot delete staff with existing time allocations',
        }
      }

      await this.prisma.staffMember.delete({ where: { id } })
      await this.auditLog('DELETE', 'StaffMember', id, userId, existing, null)

      return { success: true, data: undefined }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }
}

export const staffService = new StaffService()
