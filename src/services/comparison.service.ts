import { Prisma } from '@prisma/client'
import { BaseService } from './base.service'

export interface ComparisonMetric {
  label: string
  current: number
  previous: number
  changePercent: number
}

export interface ComparisonResult {
  currentApplicationId: string
  previousApplicationId: string | null
  metrics: ComparisonMetric[]
  summary: {
    currentTotalExpenditure: number
    previousTotalExpenditure: number
    currentOffset: number
    previousOffset: number
    currentActivityCount: number
    previousActivityCount: number
  }
}

class ComparisonService extends BaseService {
  private calculateChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  private async totalExpenditure(applicationId: string): Promise<number> {
    const result = await this.prisma.expenditure.aggregate({
      where: { applicationId },
      _sum: { amountExGst: true },
    })

    return result._sum.amountExGst ? Number(result._sum.amountExGst) : 0
  }

  private async activityCount(applicationId: string): Promise<number> {
    const activities = await this.prisma.expenditure.findMany({
      where: { applicationId, activityId: { not: null } },
      select: { activityId: true },
      distinct: ['activityId'],
    })

    return activities.length
  }

  private async offsetAmount(applicationId: string): Promise<number> {
    const application = await this.prisma.incomeYearApplication.findUnique({
      where: { id: applicationId },
      select: { refundableOffset: true, nonRefundableOffset: true },
    })

    if (!application) return 0
    return Number(application.refundableOffset ?? application.nonRefundableOffset ?? 0)
  }

  async compare(applicationId: string): Promise<ComparisonResult> {
    const application = await this.prisma.incomeYearApplication.findUnique({
      where: { id: applicationId },
      select: { clientId: true, incomeYearEnd: true },
    })

    if (!application) {
      throw new Error('Application not found')
    }

    const previous = await this.prisma.incomeYearApplication.findFirst({
      where: {
        clientId: application.clientId,
        incomeYearEnd: { lt: application.incomeYearEnd },
      },
      orderBy: { incomeYearEnd: 'desc' },
      select: { id: true },
    })

    const currentTotal = await this.totalExpenditure(applicationId)
    const currentActivities = await this.activityCount(applicationId)
    const currentOffset = await this.offsetAmount(applicationId)

    if (!previous) {
      return {
        currentApplicationId: applicationId,
        previousApplicationId: null,
        metrics: [],
        summary: {
          currentTotalExpenditure: currentTotal,
          previousTotalExpenditure: 0,
          currentOffset,
          previousOffset: 0,
          currentActivityCount: currentActivities,
          previousActivityCount: 0,
        },
      }
    }

    const previousTotal = await this.totalExpenditure(previous.id)
    const previousActivities = await this.activityCount(previous.id)
    const previousOffset = await this.offsetAmount(previous.id)

    const metrics: ComparisonMetric[] = [
      {
        label: 'Total R&D Expenditure',
        current: currentTotal,
        previous: previousTotal,
        changePercent: this.calculateChange(currentTotal, previousTotal),
      },
      {
        label: 'Activity Count',
        current: currentActivities,
        previous: previousActivities,
        changePercent: this.calculateChange(currentActivities, previousActivities),
      },
      {
        label: 'Offset Amount',
        current: currentOffset,
        previous: previousOffset,
        changePercent: this.calculateChange(currentOffset, previousOffset),
      },
    ]

    return {
      currentApplicationId: applicationId,
      previousApplicationId: previous.id,
      metrics,
      summary: {
        currentTotalExpenditure: currentTotal,
        previousTotalExpenditure: previousTotal,
        currentOffset,
        previousOffset,
        currentActivityCount: currentActivities,
        previousActivityCount: previousActivities,
      },
    }
  }
}

export const comparisonService = new ComparisonService()
