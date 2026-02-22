import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma before importing the service
vi.mock('@/lib/db', () => ({
  default: {
    incomeYearApplication: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    complianceCheck: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    rDActivity: {
      findMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}))

import prisma from '@/lib/db'
import { complianceService } from '@/services/compliance.service'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any

describe('ComplianceService', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: create returns input with an id
    mockPrisma.complianceCheck.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: `check-${Date.now()}-${Math.random()}`,
      applicationId: data.applicationId,
      checkType: data.checkType,
      status: data.status,
      message: data.message,
      details: data.details ?? null,
      checkedAt: new Date(),
    }))

    mockPrisma.complianceCheck.deleteMany.mockResolvedValue({ count: 0 })
  })

  describe('run', () => {
    const baseApplication = {
      id: 'app-1',
      clientId: 'client-1',
      incomeYearStart: new Date('2024-07-01'),
      incomeYearEnd: new Date('2025-06-30'),
      registrationDeadline: new Date('2026-04-30'),
      registrationStatus: 'NOT_STARTED',
      totalNotionalDeduction: null,
      refundableOffset: null,
      nonRefundableOffset: null,
      offsetType: 'REFUNDABLE',
      ausIndustryNumber: null,
      registrationDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      client: {
        id: 'client-1',
        companyName: 'Test Company',
        isExemptControlled: false,
        organisationId: 'org-1',
        abn: '12345678901',
        acn: null,
        tfnEncrypted: null,
        contactName: 'Test',
        contactEmail: 'test@test.com',
        contactPhone: null,
        incorporationType: 'COMPANY',
        aggregatedTurnover: '15000000',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      expenditures: [],
    }

    it('should throw if application not found', async () => {
      mockPrisma.incomeYearApplication.findUnique.mockResolvedValue(null)
      await expect(complianceService.run('missing')).rejects.toThrow('Application not found')
    })

    it('should pass entity eligibility for non-exempt entities', async () => {
      mockPrisma.incomeYearApplication.findUnique.mockResolvedValue(baseApplication as never)
      mockPrisma.rDActivity.findMany.mockResolvedValue([])

      const result = await complianceService.run('app-1')

      const entityCheck = result.checks.find((c) => c.checkType === 'ENTITY_ELIGIBILITY')
      expect(entityCheck?.status).toBe('PASS')
    })

    it('should warn for exempt controlled entities', async () => {
      const exemptApp = {
        ...baseApplication,
        client: { ...baseApplication.client, isExemptControlled: true },
      }
      mockPrisma.incomeYearApplication.findUnique.mockResolvedValue(exemptApp as never)
      mockPrisma.rDActivity.findMany.mockResolvedValue([])

      const result = await complianceService.run('app-1')

      const entityCheck = result.checks.find((c) => c.checkType === 'ENTITY_ELIGIBILITY')
      expect(entityCheck?.status).toBe('WARNING')
    })

    it('should fail registration deadline when past due and not registered', async () => {
      const pastDeadlineApp = {
        ...baseApplication,
        registrationDeadline: new Date('2020-01-01'),
        registrationStatus: 'NOT_STARTED',
      }
      mockPrisma.incomeYearApplication.findUnique.mockResolvedValue(pastDeadlineApp as never)
      mockPrisma.rDActivity.findMany.mockResolvedValue([])

      const result = await complianceService.run('app-1')

      const deadlineCheck = result.checks.find((c) => c.checkType === 'REGISTRATION_DEADLINE')
      expect(deadlineCheck?.status).toBe('FAIL')
    })

    it('should pass registration deadline when registered', async () => {
      const registeredApp = {
        ...baseApplication,
        registrationDeadline: new Date('2020-01-01'),
        registrationStatus: 'REGISTERED',
      }
      mockPrisma.incomeYearApplication.findUnique.mockResolvedValue(registeredApp as never)
      mockPrisma.rDActivity.findMany.mockResolvedValue([])

      const result = await complianceService.run('app-1')

      const deadlineCheck = result.checks.find((c) => c.checkType === 'REGISTRATION_DEADLINE')
      expect(deadlineCheck?.status).toBe('PASS')
    })

    it('should fail expenditure threshold when below $20k', async () => {
      const lowExpApp = {
        ...baseApplication,
        expenditures: [
          {
            id: 'exp-1',
            applicationId: 'app-1',
            expenditureType: 'SALARY',
            amountExGst: '15000',
            gstAmount: '0',
            isPaid: true,
            paymentDate: null,
            isAssociateExpense: false,
            isOverseasExpense: false,
            description: 'Test',
            projectId: null,
            activityId: null,
            rspNumber: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      }
      mockPrisma.incomeYearApplication.findUnique.mockResolvedValue(lowExpApp as never)
      mockPrisma.rDActivity.findMany.mockResolvedValue([])

      const result = await complianceService.run('app-1')

      const thresholdCheck = result.checks.find((c) => c.checkType === 'EXPENDITURE_THRESHOLD')
      expect(thresholdCheck?.status).toBe('FAIL')
    })

    it('should fail associate payment when unpaid', async () => {
      const unpaidApp = {
        ...baseApplication,
        expenditures: [
          {
            id: 'exp-1',
            applicationId: 'app-1',
            expenditureType: 'ASSOCIATE_PAID',
            amountExGst: '50000',
            gstAmount: '5000',
            isPaid: false,
            paymentDate: null,
            isAssociateExpense: true,
            isOverseasExpense: false,
            description: 'Unpaid associate',
            projectId: null,
            activityId: null,
            rspNumber: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      }
      mockPrisma.incomeYearApplication.findUnique.mockResolvedValue(unpaidApp as never)
      mockPrisma.rDActivity.findMany.mockResolvedValue([])

      const result = await complianceService.run('app-1')

      const associateCheck = result.checks.find((c) => c.checkType === 'ASSOCIATE_PAYMENT')
      expect(associateCheck?.status).toBe('FAIL')
    })

    it('should fail activity eligibility when no core activities exist', async () => {
      mockPrisma.incomeYearApplication.findUnique.mockResolvedValue(baseApplication as never)
      mockPrisma.rDActivity.findMany.mockResolvedValue([
        {
          id: 'act-1',
          activityType: 'SUPPORTING_DIRECT',
          activityName: 'Support',
          activityDescription: 'Description',
          relatedCoreActivityId: null,
          projectId: 'proj-1',
          hypothesis: null,
          experiment: null,
          observation: null,
          evaluation: null,
          conclusion: null,
          dominantPurpose: null,
          isOverseasActivity: false,
          overseasFindingId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as never)

      const result = await complianceService.run('app-1')

      const activityCheck = result.checks.find((c) => c.checkType === 'ACTIVITY_ELIGIBILITY')
      expect(activityCheck?.status).toBe('FAIL')
      expect(activityCheck?.message).toContain('No core R&D activities')
    })

    it('should warn activity eligibility when supporting activities are unlinked', async () => {
      mockPrisma.incomeYearApplication.findUnique.mockResolvedValue(baseApplication as never)
      mockPrisma.rDActivity.findMany.mockResolvedValue([
        {
          id: 'act-1',
          activityType: 'CORE',
          activityName: 'Core Activity',
          activityDescription: 'A sufficiently long description for testing purposes that passes quality checks',
          relatedCoreActivityId: null,
          projectId: 'proj-1',
          hypothesis: 'Test hypothesis with enough detail',
          experiment: 'Test experiment with enough detail',
          observation: 'Test observations',
          evaluation: null,
          conclusion: 'Test conclusions',
          dominantPurpose: null,
          isOverseasActivity: false,
          overseasFindingId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'act-2',
          activityType: 'SUPPORTING_DIRECT',
          activityName: 'Unlinked support',
          activityDescription: 'A sufficiently long description for testing purposes that passes quality checks',
          relatedCoreActivityId: null,
          projectId: 'proj-1',
          hypothesis: null,
          experiment: null,
          observation: null,
          evaluation: null,
          conclusion: null,
          dominantPurpose: null,
          isOverseasActivity: false,
          overseasFindingId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as never)

      const result = await complianceService.run('app-1')

      const activityCheck = result.checks.find((c) => c.checkType === 'ACTIVITY_ELIGIBILITY')
      expect(activityCheck?.status).toBe('WARNING')
      expect(activityCheck?.message).toContain('not linked to a core activity')
    })

    it('should pass activity eligibility when all activities are properly linked', async () => {
      mockPrisma.incomeYearApplication.findUnique.mockResolvedValue(baseApplication as never)
      mockPrisma.rDActivity.findMany.mockResolvedValue([
        {
          id: 'act-1',
          activityType: 'CORE',
          activityName: 'Core Activity',
          activityDescription: 'A sufficiently long description for testing purposes that passes quality checks',
          relatedCoreActivityId: null,
          projectId: 'proj-1',
          hypothesis: 'Test hypothesis with enough detail for the quality score',
          experiment: 'Test experiment with enough detail for the quality score',
          observation: 'Test observations',
          evaluation: null,
          conclusion: 'Test conclusions',
          dominantPurpose: null,
          isOverseasActivity: false,
          overseasFindingId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'act-2',
          activityType: 'SUPPORTING_DIRECT',
          activityName: 'Linked support',
          activityDescription: 'A sufficiently long description for testing purposes that passes quality checks',
          relatedCoreActivityId: 'act-1',
          projectId: 'proj-1',
          hypothesis: null,
          experiment: null,
          observation: null,
          evaluation: null,
          conclusion: null,
          dominantPurpose: null,
          isOverseasActivity: false,
          overseasFindingId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as never)

      const result = await complianceService.run('app-1')

      const activityCheck = result.checks.find((c) => c.checkType === 'ACTIVITY_ELIGIBILITY')
      expect(activityCheck?.status).toBe('PASS')
    })

    it('should pass expenditure consistency when expenditures are valid', async () => {
      const validExpApp = {
        ...baseApplication,
        expenditures: [
          {
            id: 'exp-1',
            applicationId: 'app-1',
            expenditureType: 'RSP',
            amountExGst: '50000',
            gstAmount: '5000',
            isPaid: true,
            paymentDate: null,
            isAssociateExpense: false,
            isOverseasExpense: false,
            description: 'Valid expenditure',
            projectId: 'proj-1',
            activityId: null,
            rspNumber: 'RSP001',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      }
      mockPrisma.incomeYearApplication.findUnique.mockResolvedValue(validExpApp as never)
      mockPrisma.rDActivity.findMany.mockResolvedValue([])

      const result = await complianceService.run('app-1')

      const consistencyCheck = result.checks.find((c) => c.checkType === 'EXPENDITURE_CONSISTENCY')
      expect(consistencyCheck?.status).toBe('PASS')
    })

    it('should fail expenditure consistency when GST is negative', async () => {
      const negativeGstApp = {
        ...baseApplication,
        expenditures: [
          {
            id: 'exp-1',
            applicationId: 'app-1',
            expenditureType: 'RSP',
            amountExGst: '50000',
            gstAmount: '-5000',
            isPaid: true,
            paymentDate: null,
            isAssociateExpense: false,
            isOverseasExpense: false,
            description: 'Negative GST',
            projectId: 'proj-1',
            activityId: null,
            rspNumber: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      }
      mockPrisma.incomeYearApplication.findUnique.mockResolvedValue(negativeGstApp as never)
      mockPrisma.rDActivity.findMany.mockResolvedValue([])

      const result = await complianceService.run('app-1')

      const consistencyCheck = result.checks.find((c) => c.checkType === 'EXPENDITURE_CONSISTENCY')
      expect(consistencyCheck?.status).toBe('FAIL')
    })

    it('should generate all 8 compliance check types', async () => {
      mockPrisma.incomeYearApplication.findUnique.mockResolvedValue(baseApplication as never)
      mockPrisma.rDActivity.findMany.mockResolvedValue([])

      const result = await complianceService.run('app-1')

      const checkTypes = result.checks.map((c) => c.checkType)
      expect(checkTypes).toContain('ENTITY_ELIGIBILITY')
      expect(checkTypes).toContain('REGISTRATION_DEADLINE')
      expect(checkTypes).toContain('EXPENDITURE_THRESHOLD')
      expect(checkTypes).toContain('ASSOCIATE_PAYMENT')
      expect(checkTypes).toContain('OVERSEAS_FINDING')
      expect(checkTypes).toContain('DOCUMENTATION_COMPLETENESS')
      expect(checkTypes).toContain('ACTIVITY_ELIGIBILITY')
      expect(checkTypes).toContain('EXPENDITURE_CONSISTENCY')
      expect(result.checks).toHaveLength(8)
    })

    it('should calculate risk score correctly', async () => {
      // 2 FAILs = 60 = HIGH
      const highRiskApp = {
        ...baseApplication,
        registrationDeadline: new Date('2020-01-01'),
        registrationStatus: 'NOT_STARTED',
        expenditures: [
          {
            id: 'exp-1',
            applicationId: 'app-1',
            expenditureType: 'ASSOCIATE_PAID',
            amountExGst: '5000',
            gstAmount: '0',
            isPaid: false,
            paymentDate: null,
            isAssociateExpense: true,
            isOverseasExpense: false,
            description: 'Unpaid',
            projectId: null,
            activityId: null,
            rspNumber: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      }
      mockPrisma.incomeYearApplication.findUnique.mockResolvedValue(highRiskApp as never)
      mockPrisma.rDActivity.findMany.mockResolvedValue([])

      const result = await complianceService.run('app-1')

      // Multiple FAILs should produce HIGH risk
      const failCount = result.checks.filter((c) => c.status === 'FAIL').length
      expect(failCount).toBeGreaterThanOrEqual(2)
      expect(result.riskLevel).toBe('HIGH')
    })
  })
})
