import {
  ActivityType,
  IncorporationType,
  Prisma,
  PrismaClient,
  ProjectStatus,
  RegistrationStatus,
  UserRole,
} from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import 'dotenv/config'
import {
  exampleActivityForm,
  exampleApplicationForm,
  exampleClientForm,
  exampleExpenditureForm,
  exampleProjectForm,
} from '../data/seed-data'

function parseBoolean(value: string | undefined) {
  if (!value) return undefined
  const normalized = value.trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes'
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required')
}

// Default: no SSL locally (docker), SSL in production.
const databaseSsl =
  parseBoolean(process.env.DATABASE_SSL) ?? (process.env.NODE_ENV === 'production' ? true : false)

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseSsl ? { rejectUnauthorized: false } : false,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

function parseDate(value: string | undefined) {
  return value ? new Date(value) : undefined
}

function addMonths(date: Date, months: number) {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

function buildClientPayload(overrides: Partial<typeof exampleClientForm>) {
  const base = {
    ...exampleClientForm,
    ...overrides,
  }

  return {
    companyName: base.companyName,
    abn: base.abn,
    acn: base.acn,
    tfn: base.tfn,
    incorporationType: IncorporationType[base.incorporationType],
    isConsolidatedGroup: base.isConsolidatedGroup,
    headCompanyId: base.headCompanyId,
    aggregatedTurnover: base.aggregatedTurnover,
    isExemptControlled: base.isExemptControlled,
    contactName: base.contactName,
    contactEmail: base.contactEmail,
    contactPhone: base.contactPhone,
    address: base.address,
    incomeYearEndMonth: base.incomeYearEndMonth,
    incomeYearEndDay: base.incomeYearEndDay,
  }
}

async function upsertComplianceClient(params: {
  organisationId: string
  clientId: string
  clientOverrides: Partial<typeof exampleClientForm>
  applicationId: string
  applicationOverrides?: Partial<typeof exampleApplicationForm> & {
    registrationDeadline?: Date
  }
  projectId: string
  activityId: string
  activityOverrides?: Partial<typeof exampleActivityForm>
  expenditureId: string
  expenditureOverrides?: Partial<typeof exampleExpenditureForm>
}) {
  const clientPayload = buildClientPayload(params.clientOverrides)

  const client = await prisma.client.upsert({
    where: { id: params.clientId },
    update: clientPayload,
    create: {
      id: params.clientId,
      organisationId: params.organisationId,
      ...clientPayload,
    },
  })

  const incomeYearStart = new Date(
    params.applicationOverrides?.incomeYearStart ?? exampleApplicationForm.incomeYearStart
  )
  const incomeYearEnd = new Date(
    params.applicationOverrides?.incomeYearEnd ?? exampleApplicationForm.incomeYearEnd
  )
  const registrationDeadline =
    params.applicationOverrides?.registrationDeadline ?? addMonths(incomeYearEnd, 10)

  await prisma.incomeYearApplication.upsert({
    where: { id: params.applicationId },
    update: {
      clientId: client.id,
      incomeYearStart,
      incomeYearEnd,
      ausIndustryNumber:
        params.applicationOverrides?.ausIndustryNumber ?? exampleApplicationForm.ausIndustryNumber,
      registrationStatus: RegistrationStatus[
        params.applicationOverrides?.registrationStatus ?? exampleApplicationForm.registrationStatus
      ],
      registrationDate: parseDate(
        params.applicationOverrides?.registrationDate ?? exampleApplicationForm.registrationDate
      ),
      registrationDeadline,
    },
    create: {
      id: params.applicationId,
      clientId: client.id,
      incomeYearStart,
      incomeYearEnd,
      ausIndustryNumber:
        params.applicationOverrides?.ausIndustryNumber ?? exampleApplicationForm.ausIndustryNumber,
      registrationStatus: RegistrationStatus[
        params.applicationOverrides?.registrationStatus ?? exampleApplicationForm.registrationStatus
      ],
      registrationDate: parseDate(
        params.applicationOverrides?.registrationDate ?? exampleApplicationForm.registrationDate
      ),
      registrationDeadline,
    },
  })

  await prisma.rDProject.upsert({
    where: { id: params.projectId },
    update: {
      clientId: client.id,
      projectName: exampleProjectForm.projectName,
      projectCode: exampleProjectForm.projectCode,
      status: ProjectStatus[exampleProjectForm.status],
      projectDescription: exampleProjectForm.projectDescription,
      technicalHypothesis: exampleProjectForm.technicalHypothesis,
      methodology: exampleProjectForm.methodology,
      technicalUncertainty: exampleProjectForm.technicalUncertainty,
      expectedOutcome: exampleProjectForm.expectedOutcome,
      industryCode: exampleProjectForm.industryCode,
      fieldOfResearch: exampleProjectForm.fieldOfResearch,
      startDate: parseDate(exampleProjectForm.startDate),
      endDate: parseDate(exampleProjectForm.endDate),
    },
    create: {
      id: params.projectId,
      clientId: client.id,
      projectName: exampleProjectForm.projectName,
      projectCode: exampleProjectForm.projectCode,
      status: ProjectStatus[exampleProjectForm.status],
      projectDescription: exampleProjectForm.projectDescription,
      technicalHypothesis: exampleProjectForm.technicalHypothesis,
      methodology: exampleProjectForm.methodology,
      technicalUncertainty: exampleProjectForm.technicalUncertainty,
      expectedOutcome: exampleProjectForm.expectedOutcome,
      industryCode: exampleProjectForm.industryCode,
      fieldOfResearch: exampleProjectForm.fieldOfResearch,
      startDate: parseDate(exampleProjectForm.startDate),
      endDate: parseDate(exampleProjectForm.endDate),
    },
  })

  const activityData = {
    ...exampleActivityForm,
    ...params.activityOverrides,
  }

  await prisma.rDActivity.upsert({
    where: { id: params.activityId },
    update: {
      projectId: params.projectId,
      activityName: activityData.activityName,
      activityType: ActivityType[activityData.activityType],
      activityDescription: activityData.activityDescription,
      hypothesis: activityData.hypothesis ?? null,
      experiment: activityData.experiment ?? null,
      observation: activityData.observation ?? null,
      evaluation: activityData.evaluation ?? null,
      conclusion: activityData.conclusion ?? null,
      relatedCoreActivityId: activityData.relatedCoreActivityId ?? null,
      dominantPurpose: activityData.dominantPurpose ?? null,
      isOverseasActivity: activityData.isOverseasActivity,
      overseasFindingId: activityData.overseasFindingId ?? null,
      aiGeneratedFields: [],
      aiReviewHistory: null,
    },
    create: {
      id: params.activityId,
      projectId: params.projectId,
      activityName: activityData.activityName,
      activityType: ActivityType[activityData.activityType],
      activityDescription: activityData.activityDescription,
      hypothesis: activityData.hypothesis ?? null,
      experiment: activityData.experiment ?? null,
      observation: activityData.observation ?? null,
      evaluation: activityData.evaluation ?? null,
      conclusion: activityData.conclusion ?? null,
      relatedCoreActivityId: activityData.relatedCoreActivityId ?? null,
      dominantPurpose: activityData.dominantPurpose ?? null,
      isOverseasActivity: activityData.isOverseasActivity,
      overseasFindingId: activityData.overseasFindingId ?? null,
      aiGeneratedFields: [],
      aiReviewHistory: null,
    },
  })

  const expenditureData = {
    ...exampleExpenditureForm,
    ...params.expenditureOverrides,
  }

  await prisma.expenditure.upsert({
    where: { id: params.expenditureId },
    update: {
      applicationId: params.applicationId,
      projectId: params.projectId,
      activityId: params.activityId,
      expenditureType: expenditureData.expenditureType,
      amountExGst: expenditureData.amountExGst,
      gstAmount: expenditureData.gstAmount ?? '0',
      isAssociateExpense: expenditureData.isAssociateExpense,
      isPaid: expenditureData.isPaid,
      paymentDate: parseDate(expenditureData.paymentDate),
      isOverseasExpense: expenditureData.isOverseasExpense,
      description: expenditureData.description,
      invoiceNumber: expenditureData.invoiceNumber,
      invoiceDate: parseDate(expenditureData.invoiceDate),
      supplierName: expenditureData.supplierName,
      supplierAbn: expenditureData.supplierAbn,
      rspRegistrationNumber: expenditureData.rspRegistrationNumber,
      periodStart: parseDate(expenditureData.periodStart),
      periodEnd: parseDate(expenditureData.periodEnd),
      attachments: expenditureData.attachments,
    },
    create: {
      id: params.expenditureId,
      applicationId: params.applicationId,
      projectId: params.projectId,
      activityId: params.activityId,
      expenditureType: expenditureData.expenditureType,
      amountExGst: expenditureData.amountExGst,
      gstAmount: expenditureData.gstAmount ?? '0',
      isAssociateExpense: expenditureData.isAssociateExpense,
      isPaid: expenditureData.isPaid,
      paymentDate: parseDate(expenditureData.paymentDate),
      isOverseasExpense: expenditureData.isOverseasExpense,
      description: expenditureData.description,
      invoiceNumber: expenditureData.invoiceNumber,
      invoiceDate: parseDate(expenditureData.invoiceDate),
      supplierName: expenditureData.supplierName,
      supplierAbn: expenditureData.supplierAbn,
      rspRegistrationNumber: expenditureData.rspRegistrationNumber,
      periodStart: parseDate(expenditureData.periodStart),
      periodEnd: parseDate(expenditureData.periodEnd),
      attachments: expenditureData.attachments,
    },
  })
}

async function main() {
  const organisationId = process.env.ORGANISATION_ID ?? 'default-org'
  const organisationName = process.env.ORGANISATION_NAME ?? 'Default Organisation'

  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@example.com'
  const adminName = process.env.ADMIN_NAME ?? 'Admin User'
  const resetAdminPassword = parseBoolean(process.env.RESET_ADMIN_PASSWORD) ?? false

  const adminPassword =
    process.env.ADMIN_PASSWORD ?? (process.env.NODE_ENV === 'production' ? undefined : 'Admin123!')

  if (process.env.NODE_ENV === 'production' && !adminPassword) {
    throw new Error('ADMIN_PASSWORD is required in production')
  }
  if (resetAdminPassword && !adminPassword) {
    throw new Error('RESET_ADMIN_PASSWORD=true requires ADMIN_PASSWORD to be set')
  }

  const org = await prisma.organisation.upsert({
    where: { id: organisationId },
    update: { name: organisationName },
    create: {
      id: organisationId,
      name: organisationName,
    },
  })
  console.log('Organisation:', org.name)

  const userUpdate: Prisma.UserUpdateInput = {
    name: adminName,
    role: UserRole.ADMIN,
    organisation: { connect: { id: org.id } },
  }
  if (resetAdminPassword && adminPassword) {
    userUpdate.hashedPassword = await bcrypt.hash(adminPassword, 12)
  }

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: userUpdate,
    create: {
      email: adminEmail,
      name: adminName,
      role: UserRole.ADMIN,
      hashedPassword: adminPassword ? await bcrypt.hash(adminPassword, 12) : undefined,
      organisation: { connect: { id: org.id } },
    },
  })

  console.log('Admin user upserted:', admin.email)
  if (resetAdminPassword) {
    console.log('Password was reset (RESET_ADMIN_PASSWORD=true).')
  }

  const complianceSeedClients = [
    {
      clientId: 'compliance-client-entity',
      applicationId: 'compliance-application-entity',
      projectId: 'compliance-project-entity',
      activityId: 'compliance-activity-entity',
      expenditureId: 'compliance-expenditure-entity',
      clientOverrides: {
        companyName: 'Entity Eligibility Test Pty Ltd',
        abn: '11111111111',
        acn: '111111111',
        isExemptControlled: true,
      },
    },
    {
      clientId: 'compliance-client-activity',
      applicationId: 'compliance-application-activity',
      projectId: 'compliance-project-activity',
      activityId: 'compliance-activity-activity',
      expenditureId: 'compliance-expenditure-activity',
      clientOverrides: {
        companyName: 'Activity Eligibility Test Pty Ltd',
        abn: '22222222222',
        acn: '222222222',
      },
      activityOverrides: {
        activityDescription: 'Short description to trigger quality warning.',
        hypothesis: '',
        experiment: '',
        observation: '',
        conclusion: '',
      },
    },
    {
      clientId: 'compliance-client-expenditure',
      applicationId: 'compliance-application-expenditure',
      projectId: 'compliance-project-expenditure',
      activityId: 'compliance-activity-expenditure',
      expenditureId: 'compliance-expenditure-expenditure',
      clientOverrides: {
        companyName: 'Expenditure Threshold Test Pty Ltd',
        abn: '33333333333',
        acn: '333333333',
      },
      expenditureOverrides: {
        expenditureType: 'OTHER',
        amountExGst: '10000',
      },
    },
    {
      clientId: 'compliance-client-deadline',
      applicationId: 'compliance-application-deadline',
      projectId: 'compliance-project-deadline',
      activityId: 'compliance-activity-deadline',
      expenditureId: 'compliance-expenditure-deadline',
      clientOverrides: {
        companyName: 'Registration Deadline Test Pty Ltd',
        abn: '44444444444',
        acn: '444444444',
      },
      applicationOverrides: {
        incomeYearStart: '2023-07-01',
        incomeYearEnd: '2024-06-30',
        registrationStatus: 'DRAFT',
      },
    },
    {
      clientId: 'compliance-client-documentation',
      applicationId: 'compliance-application-documentation',
      projectId: 'compliance-project-documentation',
      activityId: 'compliance-activity-documentation',
      expenditureId: 'compliance-expenditure-documentation',
      clientOverrides: {
        companyName: 'Documentation Completeness Test Pty Ltd',
        abn: '55555555555',
        acn: '555555555',
      },
      activityOverrides: {
        hypothesis: undefined,
        experiment: undefined,
        observation: undefined,
        conclusion: undefined,
        isOverseasActivity: true,
        overseasFindingId: undefined,
        activityDescription: 'Overseas activity missing HEC and finding.',
      },
    },
  ]

  for (const seedClient of complianceSeedClients) {
    await upsertComplianceClient({
      organisationId: org.id,
      clientId: seedClient.clientId,
      clientOverrides: seedClient.clientOverrides,
      applicationId: seedClient.applicationId,
      applicationOverrides: seedClient.applicationOverrides,
      projectId: seedClient.projectId,
      activityId: seedClient.activityId,
      activityOverrides: seedClient.activityOverrides,
      expenditureId: seedClient.expenditureId,
      expenditureOverrides: seedClient.expenditureOverrides,
    })
  }

  console.log('Seeded compliance test clients:', complianceSeedClients.length)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
