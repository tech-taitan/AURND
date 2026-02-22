import { ComplianceCheckType, ComplianceStatus, Prisma } from '@prisma/client'
import { BaseService } from './base.service'
import { activityService } from './activity.service'
import { meetsMinimumThreshold } from './tax-offset-calculator.service'

export interface ComplianceSummary {
  riskScore: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  checks: Prisma.ComplianceCheckGetPayload<Prisma.ComplianceCheckDefaultArgs>[]
}

export interface ComplianceCategoryClient {
  clientId: string
  clientName: string
  applicationId: string
  status: ComplianceStatus
}

export interface ComplianceCategoryOverview {
  type: ComplianceCheckType
  name: string
  description: string
  clients: ComplianceCategoryClient[]
  counts: {
    pass: number
    warning: number
    fail: number
    notApplicable: number
  }
}

export interface ComplianceOverview {
  summary: {
    pass: number
    warning: number
    fail: number
  }
  categories: ComplianceCategoryOverview[]
}

const COMPLIANCE_CATEGORIES: Array<Pick<ComplianceCategoryOverview, 'type' | 'name' | 'description'>> = [
  {
    type: 'ENTITY_ELIGIBILITY',
    name: 'Entity Eligibility',
    description: 'Check if entities meet R&D Tax Incentive eligibility criteria',
  },
  {
    type: 'ACTIVITY_ELIGIBILITY',
    name: 'Activity Eligibility',
    description: 'Verify R&D activities meet core and supporting activity requirements',
  },
  {
    type: 'EXPENDITURE_THRESHOLD',
    name: 'Expenditure Threshold',
    description: 'Ensure minimum $20,000 threshold is met for non-RSP expenditure',
  },
  {
    type: 'REGISTRATION_DEADLINE',
    name: 'Registration Deadline',
    description: 'Track 10-month registration deadline compliance',
  },
  {
    type: 'DOCUMENTATION_COMPLETENESS',
    name: 'Documentation Completeness',
    description: 'Verify all required documentation is in place',
  },
  {
    type: 'EXPENDITURE_CONSISTENCY',
    name: 'Expenditure Consistency',
    description: 'Check reported expenditures align with supporting records',
  },
  {
    type: 'ASSOCIATE_PAYMENT',
    name: 'Associate Payment',
    description: 'Confirm associate expenditure is paid before claiming',
  },
  {
    type: 'OVERSEAS_FINDING',
    name: 'Overseas Finding',
    description: 'Verify overseas activities have the required finding ID',
  },
]

const STATUS_RANK: Record<ComplianceStatus, number> = {
  FAIL: 3,
  WARNING: 2,
  PASS: 1,
  NOT_APPLICABLE: 0,
}

class ComplianceService extends BaseService {
  private scoreRisk(checks: Prisma.ComplianceCheckGetPayload<Prisma.ComplianceCheckDefaultArgs>[]) {
    let score = 0
    for (const check of checks) {
      if (check.status === 'FAIL') score += 30
      if (check.status === 'WARNING') score += 10
    }

    const riskLevel: ComplianceSummary['riskLevel'] =
      score >= 60 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW'

    return { score, riskLevel }
  }

  async run(applicationId: string): Promise<ComplianceSummary> {
    const application = await this.prisma.incomeYearApplication.findUnique({
      where: { id: applicationId },
      include: {
        client: true,
        expenditures: true,
      },
    })

    if (!application) {
      throw new Error('Application not found')
    }

    const checks: Prisma.ComplianceCheckGetPayload<Prisma.ComplianceCheckDefaultArgs>[] = []

    // Entity eligibility
    if (application.client.isExemptControlled) {
      checks.push({
        id: 'temp',
        applicationId,
        checkType: 'ENTITY_ELIGIBILITY',
        status: 'WARNING',
        message: 'Client is controlled by an exempt entity',
        details: { isExemptControlled: true },
        checkedAt: new Date(),
      })
    } else {
      checks.push({
        id: 'temp',
        applicationId,
        checkType: 'ENTITY_ELIGIBILITY',
        status: 'PASS',
        message: 'Entity eligibility check passed',
        details: null,
        checkedAt: new Date(),
      })
    }

    // Registration deadline
    const deadline = application.registrationDeadline
    const now = new Date()
    if (deadline < now && application.registrationStatus !== 'REGISTERED') {
      checks.push({
        id: 'temp',
        applicationId,
        checkType: 'REGISTRATION_DEADLINE',
        status: 'FAIL',
        message: 'Registration deadline has passed',
        details: { deadline: deadline.toISOString() },
        checkedAt: new Date(),
      })
    } else {
      checks.push({
        id: 'temp',
        applicationId,
        checkType: 'REGISTRATION_DEADLINE',
        status: 'PASS',
        message: 'Registration deadline within timeframe',
        details: { deadline: deadline.toISOString() },
        checkedAt: new Date(),
      })
    }

    // Expenditure threshold
    const rspAmount = application.expenditures
      .filter((exp) => exp.expenditureType === 'RSP')
      .reduce((sum, exp) => sum + Number(exp.amountExGst), 0)
    const crcAmount = application.expenditures
      .filter((exp) => exp.expenditureType === 'CRC_CONTRIBUTION')
      .reduce((sum, exp) => sum + Number(exp.amountExGst), 0)
    const totalNotional = application.expenditures.reduce(
      (sum, exp) => sum + Number(exp.amountExGst),
      0
    )
    const threshold = meetsMinimumThreshold(totalNotional, rspAmount, crcAmount)
    checks.push({
      id: 'temp',
      applicationId,
      checkType: 'EXPENDITURE_THRESHOLD',
      status: threshold.eligible ? 'PASS' : 'FAIL',
      message: threshold.message,
      details: { totalNotional, rspAmount, crcAmount },
      checkedAt: new Date(),
    })

    // Associate payment check
    const unpaidAssociate = application.expenditures.filter(
      (exp) => exp.expenditureType === 'ASSOCIATE_PAID' && !exp.isPaid
    )
    if (unpaidAssociate.length > 0) {
      checks.push({
        id: 'temp',
        applicationId,
        checkType: 'ASSOCIATE_PAYMENT',
        status: 'FAIL',
        message: 'Unpaid associate expenditure detected',
        details: { count: unpaidAssociate.length },
        checkedAt: new Date(),
      })
    } else {
      checks.push({
        id: 'temp',
        applicationId,
        checkType: 'ASSOCIATE_PAYMENT',
        status: 'PASS',
        message: 'No unpaid associate expenditure',
        details: null,
        checkedAt: new Date(),
      })
    }

    // Overseas finding
    const overseasActivities = await this.prisma.rDActivity.findMany({
      where: { project: { clientId: application.clientId }, isOverseasActivity: true },
    })
    const missingFinding = overseasActivities.filter((a) => !a.overseasFindingId)
    checks.push({
      id: 'temp',
      applicationId,
      checkType: 'OVERSEAS_FINDING',
      status: missingFinding.length > 0 ? 'WARNING' : 'PASS',
      message:
        missingFinding.length > 0
          ? 'Overseas activities missing finding ID'
          : 'All overseas activities have finding ID',
      details: { missingCount: missingFinding.length },
      checkedAt: new Date(),
    })

    // Documentation completeness (HEC)
    const activities = await this.prisma.rDActivity.findMany({
      where: { project: { clientId: application.clientId } },
    })
    const invalidActivities = activities.filter((activity) => {
      const validation = activityService.validateHECFramework(activity)
      return !validation.isValid
    })
    checks.push({
      id: 'temp',
      applicationId,
      checkType: 'DOCUMENTATION_COMPLETENESS',
      status: invalidActivities.length > 0 ? 'WARNING' : 'PASS',
      message:
        invalidActivities.length > 0
          ? 'Some activities have incomplete H-E-C documentation'
          : 'H-E-C documentation complete',
      details: { incompleteCount: invalidActivities.length },
      checkedAt: new Date(),
    })

    // Activity eligibility
    const coreActivities = activities.filter((a) => a.activityType === 'CORE')
    const supportingActivities = activities.filter(
      (a) => a.activityType === 'SUPPORTING_DIRECT' || a.activityType === 'SUPPORTING_DOMINANT_PURPOSE'
    )
    const unlinkedSupporting = supportingActivities.filter((a) => !a.relatedCoreActivityId)

    if (activities.length === 0) {
      checks.push({
        id: 'temp',
        applicationId,
        checkType: 'ACTIVITY_ELIGIBILITY',
        status: 'FAIL',
        message: 'No R&D activities registered',
        details: { total: 0 },
        checkedAt: new Date(),
      })
    } else if (coreActivities.length === 0) {
      checks.push({
        id: 'temp',
        applicationId,
        checkType: 'ACTIVITY_ELIGIBILITY',
        status: 'FAIL',
        message: 'No core R&D activities found — at least one is required',
        details: { total: activities.length, core: 0, supporting: supportingActivities.length },
        checkedAt: new Date(),
      })
    } else if (unlinkedSupporting.length > 0) {
      checks.push({
        id: 'temp',
        applicationId,
        checkType: 'ACTIVITY_ELIGIBILITY',
        status: 'WARNING',
        message: `${unlinkedSupporting.length} supporting activit${unlinkedSupporting.length === 1 ? 'y is' : 'ies are'} not linked to a core activity`,
        details: {
          core: coreActivities.length,
          supporting: supportingActivities.length,
          unlinked: unlinkedSupporting.length,
        },
        checkedAt: new Date(),
      })
    } else {
      checks.push({
        id: 'temp',
        applicationId,
        checkType: 'ACTIVITY_ELIGIBILITY',
        status: 'PASS',
        message: 'All activities meet eligibility requirements',
        details: { core: coreActivities.length, supporting: supportingActivities.length },
        checkedAt: new Date(),
      })
    }

    // Expenditure consistency
    const expendituresWithNegativeGst = application.expenditures.filter(
      (exp) => Number(exp.gstAmount) < 0
    )
    const expendituresWithoutProject = application.expenditures.filter(
      (exp) => !exp.projectId
    )
    const calculatedTotal = application.expenditures.reduce(
      (sum, exp) => sum + Number(exp.amountExGst),
      0
    )
    const cachedTotal = application.totalNotionalDeduction
      ? Number(application.totalNotionalDeduction)
      : null

    const consistencyIssues: string[] = []
    if (expendituresWithNegativeGst.length > 0) {
      consistencyIssues.push(`${expendituresWithNegativeGst.length} expenditure(s) with negative GST`)
    }
    if (expendituresWithoutProject.length > 0) {
      consistencyIssues.push(`${expendituresWithoutProject.length} expenditure(s) not linked to a project`)
    }
    if (cachedTotal !== null && Math.abs(calculatedTotal - cachedTotal) > 0.01) {
      consistencyIssues.push('Cached total does not match sum of expenditures')
    }

    if (consistencyIssues.length > 0) {
      checks.push({
        id: 'temp',
        applicationId,
        checkType: 'EXPENDITURE_CONSISTENCY',
        status: expendituresWithNegativeGst.length > 0 ? 'FAIL' : 'WARNING',
        message: consistencyIssues.join('; '),
        details: {
          negativeGst: expendituresWithNegativeGst.length,
          unlinkedProject: expendituresWithoutProject.length,
          calculatedTotal,
          cachedTotal,
        },
        checkedAt: new Date(),
      })
    } else {
      checks.push({
        id: 'temp',
        applicationId,
        checkType: 'EXPENDITURE_CONSISTENCY',
        status: 'PASS',
        message: 'Expenditures are consistent',
        details: { totalExpenditure: calculatedTotal, count: application.expenditures.length },
        checkedAt: new Date(),
      })
    }

    // Persist checks
    await this.prisma.complianceCheck.deleteMany({ where: { applicationId } })
    const created = await Promise.all(
      checks.map((check) =>
        this.prisma.complianceCheck.create({
          data: {
            applicationId,
            checkType: check.checkType as ComplianceCheckType,
            status: check.status as ComplianceStatus,
            message: check.message,
            details: check.details ?? undefined,
          },
        })
      )
    )

    const risk = this.scoreRisk(created)

    return {
      riskScore: risk.score,
      riskLevel: risk.riskLevel,
      checks: created,
    }
  }

  async getOverview(
    organisationId: string,
    clientId?: string
  ): Promise<ComplianceOverview> {
    const applications = await this.prisma.incomeYearApplication.findMany({
      where: {
        client: {
          organisationId,
          ...(clientId ? { id: clientId } : {}),
        },
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

    if (applications.length === 0) {
      return {
        summary: { pass: 0, warning: 0, fail: 0 },
        categories: COMPLIANCE_CATEGORIES.map((category) => ({
          ...category,
          clients: [],
          counts: { pass: 0, warning: 0, fail: 0, notApplicable: 0 },
        })),
      }
    }

    const applicationIds = applications.map((application) => application.id)

    let checks = await this.prisma.complianceCheck.findMany({
      where: { applicationId: { in: applicationIds } },
      include: {
        application: {
          include: {
            client: {
              select: {
                id: true,
                companyName: true,
              },
            },
          },
        },
      },
      orderBy: { checkedAt: 'desc' },
    })

    if (checks.length === 0) {
      for (const application of applications) {
        await this.run(application.id)
      }

      checks = await this.prisma.complianceCheck.findMany({
        where: { applicationId: { in: applicationIds } },
        include: {
          application: {
            include: {
              client: {
                select: {
                  id: true,
                  companyName: true,
                },
              },
            },
          },
        },
        orderBy: { checkedAt: 'desc' },
      })
    }

    const categoriesMap = new Map<ComplianceCheckType, Map<string, ComplianceCategoryClient>>()
    for (const category of COMPLIANCE_CATEGORIES) {
      categoriesMap.set(category.type, new Map())
    }

    for (const check of checks) {
      const categoryClients = categoriesMap.get(check.checkType)
      if (!categoryClients) continue

      const client = check.application.client
      const existing = categoryClients.get(client.id)
      const candidate: ComplianceCategoryClient = {
        clientId: client.id,
        clientName: client.companyName,
        applicationId: check.applicationId,
        status: check.status,
      }

      if (!existing || STATUS_RANK[candidate.status] > STATUS_RANK[existing.status]) {
        categoryClients.set(client.id, candidate)
      }
    }

    const categories = COMPLIANCE_CATEGORIES.map((category) => {
      const clients = Array.from(categoriesMap.get(category.type)?.values() ?? [])
      const counts = clients.reduce(
        (acc, client) => {
          if (client.status === 'PASS') acc.pass += 1
          else if (client.status === 'WARNING') acc.warning += 1
          else if (client.status === 'FAIL') acc.fail += 1
          else acc.notApplicable += 1
          return acc
        },
        { pass: 0, warning: 0, fail: 0, notApplicable: 0 }
      )

      return {
        ...category,
        clients,
        counts,
      }
    })

    const summary = categories.reduce(
      (acc, category) => {
        acc.pass += category.counts.pass
        acc.warning += category.counts.warning
        acc.fail += category.counts.fail
        return acc
      },
      { pass: 0, warning: 0, fail: 0 }
    )

    return { summary, categories }
  }
}

export const complianceService = new ComplianceService()