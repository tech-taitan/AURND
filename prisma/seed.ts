// Load environment variables BEFORE importing anything else
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

import {
  ActivityType,
  IncorporationType,
  PrismaClient,
  ProjectStatus,
  RegistrationStatus,
  UserRole,
} from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import {
  seedApplications,
  seedClients,
  seedProjects,
} from '../src/data/seed-data'

// Create PostgreSQL pool with connection URL from environment
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

function parseDate(value?: string) {
  return value ? new Date(value) : undefined
}

function addMonths(date: Date, months: number) {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

async function main() {
  console.log('Seeding database...')
  console.log('Using database:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'unknown')

  // Create test organisation
  const org = await prisma.organisation.upsert({
    where: { id: 'test-org-1' },
    update: {},
    create: {
      id: 'test-org-1',
      name: 'Test R&D Consulting Firm',
      abn: '12345678901',
      taxAgentNumber: 'TA123456',
      address: {
        street: '123 Test Street',
        city: 'Sydney',
        state: 'NSW',
        postcode: '2000',
        country: 'Australia'
      }
    }
  })

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      role: UserRole.ADMIN,
      organisationId: org.id
    }
  })

  const clientRecords = new Map<string, { id: string; companyName: string }>()

  for (const clientSeed of seedClients) {
    const record = await prisma.client.upsert({
      where: { id: clientSeed.id },
      update: {
        companyName: clientSeed.companyName,
        abn: clientSeed.abn,
        acn: clientSeed.acn,
        tfn: clientSeed.tfn,
        incorporationType: IncorporationType[clientSeed.incorporationType],
        isConsolidatedGroup: clientSeed.isConsolidatedGroup,
        headCompanyId: clientSeed.headCompanyId,
        aggregatedTurnover: clientSeed.aggregatedTurnover,
        isExemptControlled: clientSeed.isExemptControlled,
        contactName: clientSeed.contactName,
        contactEmail: clientSeed.contactEmail,
        contactPhone: clientSeed.contactPhone,
        address: clientSeed.address,
        incomeYearEndMonth: clientSeed.incomeYearEndMonth,
        incomeYearEndDay: clientSeed.incomeYearEndDay,
      },
      create: {
        id: clientSeed.id,
        organisationId: org.id,
        companyName: clientSeed.companyName,
        abn: clientSeed.abn,
        acn: clientSeed.acn,
        tfn: clientSeed.tfn,
        incorporationType: IncorporationType[clientSeed.incorporationType],
        isConsolidatedGroup: clientSeed.isConsolidatedGroup,
        headCompanyId: clientSeed.headCompanyId,
        aggregatedTurnover: clientSeed.aggregatedTurnover,
        isExemptControlled: clientSeed.isExemptControlled,
        contactName: clientSeed.contactName,
        contactEmail: clientSeed.contactEmail,
        contactPhone: clientSeed.contactPhone,
        address: clientSeed.address,
        incomeYearEndMonth: clientSeed.incomeYearEndMonth,
        incomeYearEndDay: clientSeed.incomeYearEndDay,
      },
    })
    clientRecords.set(clientSeed.id, {
      id: record.id,
      companyName: record.companyName,
    })
  }

  const applicationByClientId = new Map<string, { id: string }>()
  for (const applicationSeed of seedApplications) {
    const incomeYearStart = new Date(applicationSeed.incomeYearStart)
    const incomeYearEnd = new Date(applicationSeed.incomeYearEnd)
    const registrationDeadline = addMonths(incomeYearEnd, 10)

    const application = await prisma.incomeYearApplication.upsert({
      where: { id: applicationSeed.id },
      update: {
        clientId: applicationSeed.clientId,
        incomeYearStart,
        incomeYearEnd,
        ausIndustryNumber: applicationSeed.ausIndustryNumber,
        registrationStatus: RegistrationStatus[applicationSeed.registrationStatus],
        registrationDate: parseDate(applicationSeed.registrationDate),
        registrationDeadline,
      },
      create: {
        id: applicationSeed.id,
        clientId: applicationSeed.clientId,
        incomeYearStart,
        incomeYearEnd,
        ausIndustryNumber: applicationSeed.ausIndustryNumber,
        registrationStatus: RegistrationStatus[applicationSeed.registrationStatus],
        registrationDate: parseDate(applicationSeed.registrationDate),
        registrationDeadline,
      },
    })

    applicationByClientId.set(applicationSeed.clientId, { id: application.id })
  }

  const staffByClientId = new Map<string, { id: string }>()
  for (const clientSeed of seedClients) {
    const staffId = `seed-staff-${clientSeed.id}`
    const staff = await prisma.staffMember.upsert({
      where: { id: staffId },
      update: {
        clientId: clientSeed.id,
        name: `${clientSeed.companyName.split(' ')[0]} R&D Lead`,
        position: 'R&D Engineer',
        employeeId: `EMP-${clientSeed.id.slice(-2)}`,
        annualSalary: '120000',
        onCosts: '18000',
        hourlyRate: '95',
        startDate: parseDate('2025-07-01'),
        endDate: parseDate('2026-07-01'),
      },
      create: {
        id: staffId,
        clientId: clientSeed.id,
        name: `${clientSeed.companyName.split(' ')[0]} R&D Lead`,
        position: 'R&D Engineer',
        employeeId: `EMP-${clientSeed.id.slice(-2)}`,
        annualSalary: '120000',
        onCosts: '18000',
        hourlyRate: '95',
        startDate: parseDate('2025-07-01'),
        endDate: parseDate('2026-07-01'),
      },
    })
    staffByClientId.set(clientSeed.id, { id: staff.id })
  }

  let activityCount = 0
  let expenditureCount = 0

  for (const projectSeed of seedProjects) {
    const project = await prisma.rDProject.upsert({
      where: { id: projectSeed.id },
      update: {
        clientId: projectSeed.clientId,
        projectName: projectSeed.projectName,
        projectCode: projectSeed.projectCode,
        status: ProjectStatus[projectSeed.status],
        projectDescription: projectSeed.projectDescription,
        technicalHypothesis: projectSeed.technicalHypothesis,
        methodology: projectSeed.methodology,
        technicalUncertainty: projectSeed.technicalUncertainty,
        expectedOutcome: projectSeed.expectedOutcome,
        industryCode: projectSeed.industryCode,
        fieldOfResearch: projectSeed.fieldOfResearch,
        startDate: parseDate(projectSeed.startDate),
        endDate: parseDate(projectSeed.endDate),
      },
      create: {
        id: projectSeed.id,
        clientId: projectSeed.clientId,
        projectName: projectSeed.projectName,
        projectCode: projectSeed.projectCode,
        status: ProjectStatus[projectSeed.status],
        projectDescription: projectSeed.projectDescription,
        technicalHypothesis: projectSeed.technicalHypothesis,
        methodology: projectSeed.methodology,
        technicalUncertainty: projectSeed.technicalUncertainty,
        expectedOutcome: projectSeed.expectedOutcome,
        industryCode: projectSeed.industryCode,
        fieldOfResearch: projectSeed.fieldOfResearch,
        startDate: parseDate(projectSeed.startDate),
        endDate: parseDate(projectSeed.endDate),
      },
    })

    const coreActivityId = `seed-activity-core-${projectSeed.id}`
    const coreActivity = await prisma.rDActivity.upsert({
      where: { id: coreActivityId },
      update: {
        projectId: project.id,
        activityName: `${projectSeed.projectName} core experiments`,
        activityType: ActivityType.CORE,
        activityDescription: `Core R&D experiments for ${projectSeed.projectName}.`,
        hypothesis: `Testing whether ${projectSeed.projectName.toLowerCase()} meets performance targets.`,
        experiment: 'Controlled trials with instrumentation and repeatable conditions.',
        observation: 'Measurements captured across test runs and compared to baselines.',
        evaluation: 'Results evaluated against target thresholds and variability ranges.',
        conclusion: 'Findings documented to guide next iteration and scale-up.',
        technicalUncertainty: projectSeed.technicalUncertainty,
        anzsicCode: projectSeed.industryCode,
        forCode: projectSeed.fieldOfResearch,
        dominantPurpose: null,
        isOverseasActivity: false,
        overseasFindingId: null,
      },
      create: {
        id: coreActivityId,
        projectId: project.id,
        activityName: `${projectSeed.projectName} core experiments`,
        activityType: ActivityType.CORE,
        activityDescription: `Core R&D experiments for ${projectSeed.projectName}.`,
        hypothesis: `Testing whether ${projectSeed.projectName.toLowerCase()} meets performance targets.`,
        experiment: 'Controlled trials with instrumentation and repeatable conditions.',
        observation: 'Measurements captured across test runs and compared to baselines.',
        evaluation: 'Results evaluated against target thresholds and variability ranges.',
        conclusion: 'Findings documented to guide next iteration and scale-up.',
        technicalUncertainty: projectSeed.technicalUncertainty,
        anzsicCode: projectSeed.industryCode,
        forCode: projectSeed.fieldOfResearch,
        dominantPurpose: null,
        isOverseasActivity: false,
        overseasFindingId: null,
      },
    })

    activityCount += 1

    if (activityCount % 2 === 0) {
      await prisma.rDActivity.upsert({
        where: { id: `seed-activity-support-${projectSeed.id}` },
        update: {
          projectId: project.id,
          activityName: `${projectSeed.projectName} supporting analysis`,
          activityType: ActivityType.SUPPORTING_DIRECT,
          activityDescription: `Supporting analysis for ${projectSeed.projectName}.`,
          relatedCoreActivityId: coreActivity.id,
          dominantPurpose: null,
          isOverseasActivity: false,
          overseasFindingId: null,
        },
        create: {
          id: `seed-activity-support-${projectSeed.id}`,
          projectId: project.id,
          activityName: `${projectSeed.projectName} supporting analysis`,
          activityType: ActivityType.SUPPORTING_DIRECT,
          activityDescription: `Supporting analysis for ${projectSeed.projectName}.`,
          relatedCoreActivityId: coreActivity.id,
          dominantPurpose: null,
          isOverseasActivity: false,
          overseasFindingId: null,
        },
      })
    }

    const staff = staffByClientId.get(projectSeed.clientId)
    if (staff) {
      await prisma.timeAllocation.upsert({
        where: { id: `seed-time-${projectSeed.id}` },
        update: {
          staffMemberId: staff.id,
          activityId: coreActivity.id,
          periodStart: new Date('2025-09-01'),
          periodEnd: new Date('2025-09-30'),
          hoursAllocated: '120',
          percentageOfTime: '75',
          description: 'Core R&D work',
        },
        create: {
          id: `seed-time-${projectSeed.id}`,
          staffMemberId: staff.id,
          activityId: coreActivity.id,
          periodStart: new Date('2025-09-01'),
          periodEnd: new Date('2025-09-30'),
          hoursAllocated: '120',
          percentageOfTime: '75',
          description: 'Core R&D work',
        },
      })
    }

    const application = applicationByClientId.get(projectSeed.clientId)
    if (application) {
      expenditureCount += 1
      await prisma.expenditure.upsert({
        where: { id: `seed-expenditure-${projectSeed.id}` },
        update: {
          applicationId: application.id,
          projectId: project.id,
          activityId: coreActivity.id,
          expenditureType: 'RSP',
          amountExGst: `${25000 + expenditureCount * 500}`,
          gstAmount: '2500',
          isAssociateExpense: false,
          isPaid: true,
          paymentDate: parseDate('2025-10-01'),
          isOverseasExpense: false,
          description: `Research services for ${projectSeed.projectName}.`,
          invoiceNumber: `INV-${1000 + expenditureCount}`,
          invoiceDate: parseDate('2025-09-15'),
          supplierName: 'Lab Services Pty Ltd',
          supplierAbn: '98765432109',
          rspRegistrationNumber: `RSP-${1200 + expenditureCount}`,
          periodStart: parseDate('2025-09-01'),
          periodEnd: parseDate('2025-09-30'),
          attachments: [
            {
              fileName: 'invoice.pdf',
              url: 'https://example.com/invoice.pdf',
              mimeType: 'application/pdf',
              size: 102400,
            },
          ],
        },
        create: {
          id: `seed-expenditure-${projectSeed.id}`,
          applicationId: application.id,
          projectId: project.id,
          activityId: coreActivity.id,
          expenditureType: 'RSP',
          amountExGst: `${25000 + expenditureCount * 500}`,
          gstAmount: '2500',
          isAssociateExpense: false,
          isPaid: true,
          paymentDate: parseDate('2025-10-01'),
          isOverseasExpense: false,
          description: `Research services for ${projectSeed.projectName}.`,
          invoiceNumber: `INV-${1000 + expenditureCount}`,
          invoiceDate: parseDate('2025-09-15'),
          supplierName: 'Lab Services Pty Ltd',
          supplierAbn: '98765432109',
          rspRegistrationNumber: `RSP-${1200 + expenditureCount}`,
          periodStart: parseDate('2025-09-01'),
          periodEnd: parseDate('2025-09-30'),
          attachments: [
            {
              fileName: 'invoice.pdf',
              url: 'https://example.com/invoice.pdf',
              mimeType: 'application/pdf',
              size: 102400,
            },
          ],
        },
      })
    }
  }

  console.log('Seeding completed!')
  console.log(`Created organisation: ${org.name}`)
  console.log(`Created user: ${user.email}`)
  console.log(`Created clients: ${seedClients.length}`)
  console.log(`Created applications: ${seedApplications.length}`)
  console.log(`Created projects: ${seedProjects.length}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await pool.end()
    await prisma.$disconnect()
  })
