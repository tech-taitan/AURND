import prisma from '@/lib/db'
import { calculateRegistrationDeadline } from './tax-offset-calculator.service'

export interface DashboardStats {
  totalClients: number
  activeApplications: number
  totalExpenditure: number
  expectedOffset: number
}

export interface UpcomingDeadline {
  clientId: string
  clientName: string
  deadline: Date
  type: string
  daysRemaining: number
}

export interface RecentActivity {
  action: string
  entityType: string
  entityId: string
  clientName?: string
  timestamp: Date
}

class DashboardService {
  async getStats(organisationId: string): Promise<DashboardStats> {
    const [clientCount, applications] = await Promise.all([
      prisma.client.count({
        where: { organisationId },
      }),
      prisma.incomeYearApplication.findMany({
        where: {
          client: { organisationId },
          claimStatus: { not: 'COMPLETED' },
        },
        include: {
          expenditures: true,
        },
      }),
    ])

    const activeApplications = applications.length

    let totalExpenditure = 0
    let expectedOffset = 0

    for (const app of applications) {
      const appExpenditure = app.expenditures.reduce(
        (sum, exp) => sum + Number(exp.amountExGst),
        0
      )
      totalExpenditure += appExpenditure

      // Use cached offset if available, otherwise estimate
      if (app.refundableOffset) {
        expectedOffset += Number(app.refundableOffset)
      } else if (app.nonRefundableOffset) {
        expectedOffset += Number(app.nonRefundableOffset)
      } else {
        // Rough estimate: 43.5% for refundable (most common)
        expectedOffset += appExpenditure * 0.435
      }
    }

    return {
      totalClients: clientCount,
      activeApplications,
      totalExpenditure,
      expectedOffset,
    }
  }

  async getUpcomingDeadlines(
    organisationId: string,
    limit: number = 5
  ): Promise<UpcomingDeadline[]> {
    const now = new Date()

    // Get clients with their FY end dates
    const clients = await prisma.client.findMany({
      where: { organisationId },
      select: {
        id: true,
        companyName: true,
        incomeYearEndMonth: true,
        incomeYearEndDay: true,
      },
    })

    const deadlines: UpcomingDeadline[] = []

    for (const client of clients) {
      // Calculate next FY end date
      const currentYear = now.getFullYear()
      let fyEndDate = new Date(
        currentYear,
        client.incomeYearEndMonth - 1,
        client.incomeYearEndDay
      )

      // If FY end has passed this year, use next year
      if (fyEndDate < now) {
        fyEndDate = new Date(
          currentYear + 1,
          client.incomeYearEndMonth - 1,
          client.incomeYearEndDay
        )
      }

      const registrationDeadline = calculateRegistrationDeadline(fyEndDate)
      const daysRemaining = Math.ceil(
        (registrationDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Only include deadlines in the future and within 180 days
      if (daysRemaining > 0 && daysRemaining <= 180) {
        deadlines.push({
          clientId: client.id,
          clientName: client.companyName,
          deadline: registrationDeadline,
          type: 'Registration Deadline',
          daysRemaining,
        })
      }
    }

    // Sort by days remaining and limit
    return deadlines
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, limit)
  }

  async getRecentActivity(
    organisationId: string,
    limit: number = 5
  ): Promise<RecentActivity[]> {
    const logs = await prisma.auditLog.findMany({
      where: {
        userId: {
          in: (await prisma.user.findMany({
            where: { organisationId },
            select: { id: true },
          })).map(u => u.id),
        },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const activities: RecentActivity[] = []

    for (const log of logs) {
      let clientName: string | undefined

      // Try to get client name for client-related entities
      if (log.entityType === 'Client') {
        const client = await prisma.client.findUnique({
          where: { id: log.entityId },
          select: { companyName: true },
        })
        clientName = client?.companyName
      } else if (log.entityType === 'RDProject') {
        const project = await prisma.rDProject.findUnique({
          where: { id: log.entityId },
          include: { client: { select: { companyName: true } } },
        })
        clientName = project?.client.companyName
      }

      activities.push({
        action: this.formatAction(log.action, log.entityType),
        entityType: log.entityType,
        entityId: log.entityId,
        clientName,
        timestamp: log.createdAt,
      })
    }

    return activities
  }

  private formatAction(action: string, entityType: string): string {
    const actionMap: Record<string, Record<string, string>> = {
      CREATE: {
        Client: 'Client registered',
        RDProject: 'New project added',
        RDActivity: 'Activity created',
        Expenditure: 'Expenditure recorded',
        IncomeYearApplication: 'Application created',
      },
      UPDATE: {
        Client: 'Client updated',
        RDProject: 'Project updated',
        RDActivity: 'Activity updated',
        Expenditure: 'Expenditure updated',
        IncomeYearApplication: 'Application updated',
      },
      DELETE: {
        Client: 'Client removed',
        RDProject: 'Project deleted',
        RDActivity: 'Activity deleted',
        Expenditure: 'Expenditure deleted',
        IncomeYearApplication: 'Application deleted',
      },
    }

    return actionMap[action]?.[entityType] || `${entityType} ${action.toLowerCase()}`
  }

  formatTimeAgo(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 60) {
      return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`
    }
    if (diffHours < 24) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
    }
    if (diffDays === 1) {
      return 'Yesterday'
    }
    if (diffDays < 7) {
      return `${diffDays} days ago`
    }
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7)
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`
    }
    return date.toLocaleDateString('en-AU')
  }
}

export const dashboardService = new DashboardService()
