import { Client, IncorporationType, Prisma } from '@prisma/client'
import { BaseService, ActionResult } from './base.service'
import { encrypt, decrypt } from '@/lib/encryption'
import { logger } from '@/lib/logger'

export interface ClientFormData {
  companyName: string
  abn: string
  acn?: string
  tfn?: string
  incorporationType: IncorporationType
  isConsolidatedGroup: boolean
  headCompanyId?: string
  aggregatedTurnover?: number
  isExemptControlled: boolean
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  address?: {
    street?: string
    city?: string
    state?: string
    postcode?: string
    country?: string
  }
  incomeYearEndMonth: number
  incomeYearEndDay: number
}

export interface ClientSearchParams {
  organisationId: string
  search?: string
  page?: number
  limit?: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type ClientWithRelations = Prisma.ClientGetPayload<{
  include: {
    projects: true
    applications: true
    staffMembers: true
  }
}>

class ClientService extends BaseService {
  /**
   * Encrypt TFN before storing
   */
  private encryptTfn(tfn: string | undefined | null): string | null {
    if (!tfn) return null
    const cleaned = tfn.replace(/\s/g, '')
    if (!cleaned) return null
    try {
      return encrypt(cleaned)
    } catch (error) {
      logger.error('Failed to encrypt TFN', error)
      throw new Error('Failed to secure sensitive data')
    }
  }

  /**
   * Decrypt TFN when retrieving
   */
  private decryptTfn(encryptedTfn: string | null): string | null {
    if (!encryptedTfn) return null
    try {
      return decrypt(encryptedTfn)
    } catch (error) {
      logger.error('Failed to decrypt TFN', error)
      return null
    }
  }

  /**
   * Verify that the client belongs to the specified organisation
   */
  async verifyOwnership(clientId: string, organisationId: string): Promise<boolean> {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, organisationId },
      select: { id: true },
    })
    return !!client
  }

  async create(
    organisationId: string,
    data: ClientFormData,
    userId?: string
  ): Promise<ActionResult<Client>> {
    try {
      // Check for duplicate ABN within organisation
      const existing = await this.prisma.client.findFirst({
        where: {
          organisationId,
          abn: data.abn.replace(/\s/g, ''),
        },
      })

      if (existing) {
        return { success: false, error: 'A client with this ABN already exists' }
      }

      const client = await this.prisma.client.create({
        data: {
          organisationId,
          companyName: data.companyName,
          abn: data.abn.replace(/\s/g, ''),
          acn: data.acn?.replace(/\s/g, '') || null,
          tfn: this.encryptTfn(data.tfn),
          incorporationType: data.incorporationType,
          isConsolidatedGroup: data.isConsolidatedGroup,
          headCompanyId: data.headCompanyId || null,
          aggregatedTurnover: data.aggregatedTurnover
            ? new Prisma.Decimal(data.aggregatedTurnover)
            : null,
          isExemptControlled: data.isExemptControlled,
          contactName: data.contactName || null,
          contactEmail: data.contactEmail || null,
          contactPhone: data.contactPhone || null,
          address: data.address || null,
          incomeYearEndMonth: data.incomeYearEndMonth,
          incomeYearEndDay: data.incomeYearEndDay,
        },
      })

      await this.auditLog('CREATE', 'Client', client.id, userId, null, { ...client, tfn: '[ENCRYPTED]' })
      logger.info('Client created', { clientId: client.id, organisationId, userId })

      return { success: true, data: client }
    } catch (error) {
      logger.error('Failed to create client', error, { organisationId, userId })
      return { success: false, error: this.handleError(error) }
    }
  }

  async findById(id: string): Promise<ClientWithRelations | null> {
    return this.prisma.client.findUnique({
      where: { id },
      include: {
        projects: {
          orderBy: { createdAt: 'desc' },
        },
        applications: {
          orderBy: { incomeYearEnd: 'desc' },
        },
        staffMembers: {
          orderBy: { name: 'asc' },
        },
      },
    })
  }

  async findByAbn(organisationId: string, abn: string): Promise<Client | null> {
    return this.prisma.client.findFirst({
      where: {
        organisationId,
        abn: abn.replace(/\s/g, ''),
      },
    })
  }

  async list(params: ClientSearchParams): Promise<PaginatedResult<Client>> {
    const { organisationId, search, page = 1, limit = 10 } = params
    const skip = (page - 1) * limit

    const where: Prisma.ClientWhereInput = {
      organisationId,
      ...(search && {
        OR: [
          { companyName: { contains: search, mode: 'insensitive' } },
          { abn: { contains: search.replace(/\s/g, '') } },
          { contactName: { contains: search, mode: 'insensitive' } },
          { contactEmail: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { companyName: 'asc' },
        include: {
          _count: {
            select: {
              projects: true,
              applications: true,
            },
          },
        },
      }),
      this.prisma.client.count({ where }),
    ])

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async update(
    id: string,
    data: Partial<ClientFormData>,
    userId?: string,
    organisationId?: string
  ): Promise<ActionResult<Client>> {
    try {
      const existing = await this.prisma.client.findUnique({ where: { id } })
      if (!existing) {
        return { success: false, error: 'Client not found' }
      }

      // Verify ownership if organisationId provided
      if (organisationId && existing.organisationId !== organisationId) {
        logger.warn('Unauthorized client update attempt', { clientId: id, organisationId, userId })
        return { success: false, error: 'Unauthorized' }
      }

      const client = await this.prisma.client.update({
        where: { id },
        data: {
          ...(data.companyName && { companyName: data.companyName }),
          ...(data.abn && { abn: data.abn.replace(/\s/g, '') }),
          ...(data.acn !== undefined && { acn: data.acn?.replace(/\s/g, '') || null }),
          ...(data.tfn !== undefined && { tfn: this.encryptTfn(data.tfn) }),
          ...(data.incorporationType && { incorporationType: data.incorporationType }),
          ...(data.isConsolidatedGroup !== undefined && {
            isConsolidatedGroup: data.isConsolidatedGroup,
          }),
          ...(data.headCompanyId !== undefined && {
            headCompanyId: data.headCompanyId || null,
          }),
          ...(data.aggregatedTurnover !== undefined && {
            aggregatedTurnover: data.aggregatedTurnover
              ? new Prisma.Decimal(data.aggregatedTurnover)
              : null,
          }),
          ...(data.isExemptControlled !== undefined && {
            isExemptControlled: data.isExemptControlled,
          }),
          ...(data.contactName !== undefined && { contactName: data.contactName || null }),
          ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail || null }),
          ...(data.contactPhone !== undefined && { contactPhone: data.contactPhone || null }),
          ...(data.address !== undefined && { address: data.address || null }),
          ...(data.incomeYearEndMonth && { incomeYearEndMonth: data.incomeYearEndMonth }),
          ...(data.incomeYearEndDay && { incomeYearEndDay: data.incomeYearEndDay }),
        },
      })

      await this.auditLog('UPDATE', 'Client', id, userId, { ...existing, tfn: '[ENCRYPTED]' }, { ...client, tfn: '[ENCRYPTED]' })
      logger.info('Client updated', { clientId: id, userId })

      return { success: true, data: client }
    } catch (error) {
      logger.error('Failed to update client', error, { clientId: id, userId })
      return { success: false, error: this.handleError(error) }
    }
  }

  async delete(id: string, userId?: string, organisationId?: string): Promise<ActionResult<void>> {
    try {
      const existing = await this.prisma.client.findUnique({ where: { id } })
      if (!existing) {
        return { success: false, error: 'Client not found' }
      }

      // Verify ownership if organisationId provided
      if (organisationId && existing.organisationId !== organisationId) {
        logger.warn('Unauthorized client delete attempt', { clientId: id, organisationId, userId })
        return { success: false, error: 'Unauthorized' }
      }

      // Check for related records
      const relatedCount = await this.prisma.client.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              projects: true,
              applications: true,
            },
          },
        },
      })

      if (
        relatedCount &&
        (relatedCount._count.projects > 0 || relatedCount._count.applications > 0)
      ) {
        return {
          success: false,
          error:
            'Cannot delete client with existing projects or applications. Archive instead.',
        }
      }

      await this.prisma.client.delete({ where: { id } })
      await this.auditLog('DELETE', 'Client', id, userId, { ...existing, tfn: '[ENCRYPTED]' }, null)
      logger.info('Client deleted', { clientId: id, userId })

      return { success: true, data: undefined }
    } catch (error) {
      logger.error('Failed to delete client', error, { clientId: id, userId })
      return { success: false, error: this.handleError(error) }
    }
  }

  /**
   * Determine offset type based on aggregated turnover
   * < $20M = Refundable
   * >= $20M = Non-refundable
   */
  getOffsetType(aggregatedTurnover: number | null): 'REFUNDABLE' | 'NON_REFUNDABLE' {
    if (!aggregatedTurnover || aggregatedTurnover < 20_000_000) {
      return 'REFUNDABLE'
    }
    return 'NON_REFUNDABLE'
  }

  /**
   * Get summary statistics for a client
   */
  async getClientStats(clientId: string): Promise<{
    activeProjects: number
    totalApplications: number
    pendingApplications: number
    totalExpenditure: number
  }> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        projects: {
          where: { status: 'ACTIVE' },
        },
        applications: {
          include: {
            expenditures: true,
          },
        },
      },
    })

    if (!client) {
      return {
        activeProjects: 0,
        totalApplications: 0,
        pendingApplications: 0,
        totalExpenditure: 0,
      }
    }

    const totalExpenditure = client.applications.reduce((sum, app) => {
      return (
        sum +
        app.expenditures.reduce((expSum, exp) => {
          return expSum + Number(exp.amountExGst)
        }, 0)
      )
    }, 0)

    const pendingApplications = client.applications.filter(
      (app) => app.registrationStatus !== 'REGISTERED' && app.claimStatus !== 'COMPLETED'
    ).length

    return {
      activeProjects: client.projects.length,
      totalApplications: client.applications.length,
      pendingApplications,
      totalExpenditure,
    }
  }
}

export const clientService = new ClientService()
