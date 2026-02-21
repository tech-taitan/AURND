import { IncomeYearApplication, Prisma } from '@prisma/client'
import { BaseService, ActionResult } from './base.service'
import {
  calculateRegistrationDeadline,
  calculateTaxOffset,
} from './tax-offset-calculator.service'

export interface ApplicationFormData {
  incomeYearStart: Date
  incomeYearEnd: Date
  ausIndustryNumber?: string
  registrationStatus?:
    | 'NOT_STARTED'
    | 'DRAFT'
    | 'SUBMITTED'
    | 'REGISTERED'
    | 'REJECTED'
  registrationDate?: Date
}

export type ApplicationWithRelations = Prisma.IncomeYearApplicationGetPayload<{
  include: {
    client: {
      select: {
        id: true
        companyName: true
      }
    }
  }
}>

class ApplicationService extends BaseService {
  async create(
    clientId: string,
    data: ApplicationFormData,
    userId?: string
  ): Promise<ActionResult<IncomeYearApplication>> {
    try {
      const client = await this.prisma.client.findUnique({
        where: { id: clientId },
        select: { aggregatedTurnover: true },
      })

      if (!client) {
        return { success: false, error: 'Client not found' }
      }

      const registrationDeadline = calculateRegistrationDeadline(data.incomeYearEnd)
      const aggregatedTurnover = client.aggregatedTurnover
        ? Number(client.aggregatedTurnover)
        : 0

      const application = await this.prisma.incomeYearApplication.create({
        data: {
          clientId,
          incomeYearStart: data.incomeYearStart,
          incomeYearEnd: data.incomeYearEnd,
          ausIndustryNumber: data.ausIndustryNumber || null,
          registrationStatus: data.registrationStatus || 'NOT_STARTED',
          registrationDate: data.registrationDate || null,
          registrationDeadline,
          offsetType: aggregatedTurnover < 20_000_000 ? 'REFUNDABLE' : 'NON_REFUNDABLE',
        },
      })

      await this.auditLog('CREATE', 'IncomeYearApplication', application.id, userId, null, application)

      return { success: true, data: application }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  async update(
    id: string,
    data: Partial<ApplicationFormData>,
    userId?: string
  ): Promise<ActionResult<IncomeYearApplication>> {
    try {
      const existing = await this.prisma.incomeYearApplication.findUnique({ where: { id } })
      if (!existing) {
        return { success: false, error: 'Application not found' }
      }

      const registrationDeadline = data.incomeYearEnd
        ? calculateRegistrationDeadline(data.incomeYearEnd)
        : existing.registrationDeadline

      const application = await this.prisma.incomeYearApplication.update({
        where: { id },
        data: {
          ...(data.incomeYearStart && { incomeYearStart: data.incomeYearStart }),
          ...(data.incomeYearEnd && { incomeYearEnd: data.incomeYearEnd }),
          ...(data.ausIndustryNumber !== undefined && {
            ausIndustryNumber: data.ausIndustryNumber || null,
          }),
          ...(data.registrationStatus && { registrationStatus: data.registrationStatus }),
          ...(data.registrationDate !== undefined && {
            registrationDate: data.registrationDate || null,
          }),
          registrationDeadline,
        },
      })

      await this.auditLog('UPDATE', 'IncomeYearApplication', id, userId, existing, application)

      return { success: true, data: application }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  async delete(id: string, userId?: string): Promise<ActionResult<void>> {
    try {
      const existing = await this.prisma.incomeYearApplication.findUnique({
        where: { id },
        include: { _count: { select: { expenditures: true } } },
      })

      if (!existing) {
        return { success: false, error: 'Application not found' }
      }

      if (existing._count.expenditures > 0) {
        return {
          success: false,
          error: 'Cannot delete application with existing expenditures',
        }
      }

      await this.prisma.incomeYearApplication.delete({ where: { id } })
      await this.auditLog('DELETE', 'IncomeYearApplication', id, userId, existing, null)

      return { success: true, data: undefined }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  async calculateAndUpdate(applicationId: string): Promise<ActionResult<IncomeYearApplication>> {
    try {
      const application = await this.prisma.incomeYearApplication.findUnique({
        where: { id: applicationId },
        include: { client: true },
      })

      if (!application) {
        return { success: false, error: 'Application not found' }
      }

      const totals = await this.prisma.expenditure.aggregate({
        where: { applicationId },
        _sum: { amountExGst: true },
      })

      const notionalDeductions = totals._sum.amountExGst
        ? Number(totals._sum.amountExGst)
        : 0

      const aggregatedTurnover = application.client.aggregatedTurnover
        ? Number(application.client.aggregatedTurnover)
        : 0

      const offset = calculateTaxOffset({
        notionalDeductions,
        aggregatedTurnover,
        totalExpenditure: notionalDeductions,
      })

      const updated = await this.prisma.incomeYearApplication.update({
        where: { id: applicationId },
        data: {
          totalNotionalDeduction: new Prisma.Decimal(notionalDeductions),
          refundableOffset:
            offset.offsetType === 'REFUNDABLE'
              ? new Prisma.Decimal(offset.totalOffset)
              : null,
          nonRefundableOffset:
            offset.offsetType === 'NON_REFUNDABLE'
              ? new Prisma.Decimal(offset.totalOffset)
              : null,
          offsetType: offset.offsetType,
        },
      })

      return { success: true, data: updated }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  async findById(id: string): Promise<ApplicationWithRelations | null> {
    return this.prisma.incomeYearApplication.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    })
  }

  async findByIdForOrganisation(
    id: string,
    organisationId: string
  ): Promise<ApplicationWithRelations | null> {
    return this.prisma.incomeYearApplication.findFirst({
      where: {
        id,
        client: { organisationId },
      },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    })
  }

  async listByClient(clientId: string): Promise<IncomeYearApplication[]> {
    return this.prisma.incomeYearApplication.findMany({
      where: { clientId },
      orderBy: { incomeYearEnd: 'desc' },
    })
  }

  async listByClientForOrganisation(
    clientId: string,
    organisationId: string
  ): Promise<IncomeYearApplication[]> {
    return this.prisma.incomeYearApplication.findMany({
      where: {
        clientId,
        client: { organisationId },
      },
      orderBy: { incomeYearEnd: 'desc' },
    })
  }
}

export const applicationService = new ApplicationService()
