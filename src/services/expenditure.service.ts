import { Expenditure, ExpenditureType, Prisma } from '@prisma/client'
import { BaseService, ActionResult } from './base.service'

export interface ExpenditureFormData {
  projectId?: string
  activityId?: string
  expenditureType: ExpenditureType
  amountExGst: string | number
  gstAmount?: string | number
  isAssociateExpense: boolean
  isPaid: boolean
  paymentDate?: string
  isOverseasExpense: boolean
  description: string
  invoiceNumber?: string
  invoiceDate?: string
  supplierName?: string
  supplierAbn?: string
  rspRegistrationNumber?: string
  periodStart?: string
  periodEnd?: string
  attachments?: Array<{
    fileName: string
    url: string
    mimeType: string
    size: number
  }>
}

export type ExpenditureWithRelations = Prisma.ExpenditureGetPayload<{
  include: {
    project: { select: { id: true; projectName: true } }
    activity: { select: { id: true; activityName: true } }
    application: {
      select: {
        id: true
        incomeYearStart: true
        incomeYearEnd: true
        client: { select: { id: true; companyName: true } }
      }
    }
  }
}>

class ExpenditureService extends BaseService {
  private toNumber(value?: string | number): number | null {
    if (value === undefined || value === null || value === '') return null
    const parsed = typeof value === 'number' ? value : Number(value)
    return Number.isNaN(parsed) ? null : parsed
  }

  private async validateProjectAndActivity(
    applicationId: string,
    projectId?: string,
    activityId?: string
  ): Promise<ActionResult<void>> {
    const application = await this.prisma.incomeYearApplication.findUnique({
      where: { id: applicationId },
      select: { clientId: true },
    })

    if (!application) {
      return { success: false, error: 'Application not found' }
    }

    if (projectId) {
      const project = await this.prisma.rDProject.findUnique({
        where: { id: projectId },
        select: { clientId: true },
      })

      if (!project || project.clientId !== application.clientId) {
        return { success: false, error: 'Project does not belong to this client' }
      }
    }

    if (activityId) {
      const activity = await this.prisma.rDActivity.findUnique({
        where: { id: activityId },
        select: { projectId: true },
      })

      if (!activity) {
        return { success: false, error: 'Activity not found' }
      }

      if (projectId && activity.projectId !== projectId) {
        return { success: false, error: 'Activity does not belong to the selected project' }
      }
    }

    return { success: true, data: undefined }
  }

  async create(
    applicationId: string,
    data: ExpenditureFormData,
    userId?: string
  ): Promise<ActionResult<Expenditure>> {
    try {
      const validation = await this.validateProjectAndActivity(
        applicationId,
        data.projectId,
        data.activityId
      )

      if (!validation.success) {
        return validation
      }

      if (data.expenditureType === 'RSP' && !data.rspRegistrationNumber) {
        return { success: false, error: 'RSP registration number is required' }
      }

      if (data.expenditureType === 'ASSOCIATE_PAID' && !data.isPaid) {
        return { success: false, error: 'Associate expenditure is only claimable when paid' }
      }

      const amountExGst = this.toNumber(data.amountExGst)
      if (!amountExGst || amountExGst <= 0) {
        return { success: false, error: 'Amount (Ex GST) must be greater than zero' }
      }

      const expenditure = await this.prisma.expenditure.create({
        data: {
          applicationId,
          projectId: data.projectId || null,
          activityId: data.activityId || null,
          expenditureType: data.expenditureType,
          amountExGst: new Prisma.Decimal(amountExGst),
          gstAmount: new Prisma.Decimal(this.toNumber(data.gstAmount) || 0),
          isAssociateExpense: data.isAssociateExpense,
          isPaid: data.isPaid,
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : null,
          isOverseasExpense: data.isOverseasExpense,
          description: data.description,
          invoiceNumber: data.invoiceNumber || null,
          invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
          supplierName: data.supplierName || null,
          supplierAbn: data.supplierAbn || null,
          rspRegistrationNumber: data.rspRegistrationNumber || null,
          periodStart: data.periodStart ? new Date(data.periodStart) : null,
          periodEnd: data.periodEnd ? new Date(data.periodEnd) : null,
          attachments: data.attachments || Prisma.JsonNull,
        },
      })

      await this.auditLog('CREATE', 'Expenditure', expenditure.id, userId, null, expenditure)

      return { success: true, data: expenditure }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  async update(
    id: string,
    data: Partial<ExpenditureFormData>,
    userId?: string
  ): Promise<ActionResult<Expenditure>> {
    try {
      const existing = await this.prisma.expenditure.findUnique({ where: { id } })
      if (!existing) {
        return { success: false, error: 'Expenditure not found' }
      }

      const validation = await this.validateProjectAndActivity(
        existing.applicationId,
        data.projectId ?? existing.projectId ?? undefined,
        data.activityId ?? existing.activityId ?? undefined
      )

      if (!validation.success) {
        return validation
      }

      if (data.expenditureType === 'RSP' && !data.rspRegistrationNumber) {
        return { success: false, error: 'RSP registration number is required' }
      }

      if (data.expenditureType === 'ASSOCIATE_PAID' && data.isPaid === false) {
        return { success: false, error: 'Associate expenditure is only claimable when paid' }
      }

      const amountExGst =
        data.amountExGst !== undefined ? this.toNumber(data.amountExGst) : null

      const expenditure = await this.prisma.expenditure.update({
        where: { id },
        data: {
          ...(data.projectId !== undefined && { projectId: data.projectId || null }),
          ...(data.activityId !== undefined && { activityId: data.activityId || null }),
          ...(data.expenditureType && { expenditureType: data.expenditureType }),
          ...(amountExGst !== null && { amountExGst: new Prisma.Decimal(amountExGst) }),
          ...(data.gstAmount !== undefined && {
            gstAmount: new Prisma.Decimal(this.toNumber(data.gstAmount) || 0),
          }),
          ...(data.isAssociateExpense !== undefined && { isAssociateExpense: data.isAssociateExpense }),
          ...(data.isPaid !== undefined && { isPaid: data.isPaid }),
          ...(data.paymentDate !== undefined && {
            paymentDate: data.paymentDate ? new Date(data.paymentDate) : null,
          }),
          ...(data.isOverseasExpense !== undefined && { isOverseasExpense: data.isOverseasExpense }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.invoiceNumber !== undefined && { invoiceNumber: data.invoiceNumber || null }),
          ...(data.invoiceDate !== undefined && {
            invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
          }),
          ...(data.supplierName !== undefined && { supplierName: data.supplierName || null }),
          ...(data.supplierAbn !== undefined && { supplierAbn: data.supplierAbn || null }),
          ...(data.rspRegistrationNumber !== undefined && {
            rspRegistrationNumber: data.rspRegistrationNumber || null,
          }),
          ...(data.periodStart !== undefined && {
            periodStart: data.periodStart ? new Date(data.periodStart) : null,
          }),
          ...(data.periodEnd !== undefined && {
            periodEnd: data.periodEnd ? new Date(data.periodEnd) : null,
          }),
          ...(data.attachments !== undefined && { attachments: data.attachments || Prisma.JsonNull }),
        },
      })

      await this.auditLog('UPDATE', 'Expenditure', id, userId, existing, expenditure)

      return { success: true, data: expenditure }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  async findById(id: string): Promise<ExpenditureWithRelations | null> {
    return this.prisma.expenditure.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, projectName: true } },
        activity: { select: { id: true, activityName: true } },
        application: {
          select: {
            id: true,
            incomeYearStart: true,
            incomeYearEnd: true,
            client: { select: { id: true, companyName: true } },
          },
        },
      },
    })
  }

  async listByApplication(applicationId: string): Promise<ExpenditureWithRelations[]> {
    return this.prisma.expenditure.findMany({
      where: { applicationId },
      include: {
        project: { select: { id: true, projectName: true } },
        activity: { select: { id: true, activityName: true } },
        application: {
          select: {
            id: true,
            incomeYearStart: true,
            incomeYearEnd: true,
            client: { select: { id: true, companyName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async listByClient(clientId: string): Promise<ExpenditureWithRelations[]> {
    return this.prisma.expenditure.findMany({
      where: { application: { clientId } },
      include: {
        project: { select: { id: true, projectName: true } },
        activity: { select: { id: true, activityName: true } },
        application: {
          select: {
            id: true,
            incomeYearStart: true,
            incomeYearEnd: true,
            client: { select: { id: true, companyName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async delete(id: string, userId?: string): Promise<ActionResult<void>> {
    try {
      const existing = await this.prisma.expenditure.findUnique({ where: { id } })
      if (!existing) {
        return { success: false, error: 'Expenditure not found' }
      }

      await this.prisma.expenditure.delete({ where: { id } })
      await this.auditLog('DELETE', 'Expenditure', id, userId, existing, null)

      return { success: true, data: undefined }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }
}

export const expenditureService = new ExpenditureService()
