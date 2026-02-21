-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'PRACTITIONER', 'READONLY');

-- CreateEnum
CREATE TYPE "IncorporationType" AS ENUM ('AUSTRALIAN_LAW', 'FOREIGN_RESIDENT', 'FOREIGN_PERMANENT_ESTABLISHMENT');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CORE', 'SUPPORTING_DIRECT', 'SUPPORTING_DOMINANT_PURPOSE');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('NOT_STARTED', 'DRAFT', 'SUBMITTED', 'REGISTERED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'SUBMITTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "OffsetType" AS ENUM ('REFUNDABLE', 'NON_REFUNDABLE');

-- CreateEnum
CREATE TYPE "ExpenditureType" AS ENUM ('RSP', 'CONTRACT_NON_RSP', 'SALARY', 'OTHER', 'FEEDSTOCK_INPUT', 'ASSOCIATE_PAID', 'ASSET_DECLINE', 'BALANCING_ADJ', 'CRC_CONTRIBUTION');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('REGISTRATION_FORM', 'ACTIVITY_DESCRIPTION', 'EXPENDITURE_SUMMARY', 'RD_SCHEDULE', 'COMPLIANCE_REPORT', 'TIME_ALLOCATION_REPORT', 'FULL_APPLICATION_PACK', 'OUTCOME_CONFIRMATION');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED', 'RESPONDED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ComplianceCheckType" AS ENUM ('ENTITY_ELIGIBILITY', 'ACTIVITY_ELIGIBILITY', 'EXPENDITURE_THRESHOLD', 'REGISTRATION_DEADLINE', 'DOCUMENTATION_COMPLETENESS', 'EXPENDITURE_CONSISTENCY', 'ASSOCIATE_PAYMENT', 'OVERSEAS_FINDING');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('PASS', 'WARNING', 'FAIL', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "DeadlineType" AS ENUM ('REGISTRATION_10_MONTH', 'TAX_RETURN_LODGEMENT', 'INFORMATION_REQUEST', 'OBJECTION');

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abn" TEXT,
    "taxAgentNumber" TEXT,
    "address" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "hashedPassword" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'PRACTITIONER',
    "organisationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "abn" TEXT NOT NULL,
    "acn" TEXT,
    "tfn" TEXT,
    "incorporationType" "IncorporationType" NOT NULL DEFAULT 'AUSTRALIAN_LAW',
    "isConsolidatedGroup" BOOLEAN NOT NULL DEFAULT false,
    "headCompanyId" TEXT,
    "aggregatedTurnover" DECIMAL(15,2),
    "isExemptControlled" BOOLEAN NOT NULL DEFAULT false,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "address" JSONB,
    "incomeYearEndMonth" INTEGER NOT NULL DEFAULT 6,
    "incomeYearEndDay" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'assigned',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RDProject" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "projectCode" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "projectDescription" TEXT NOT NULL,
    "technicalHypothesis" TEXT,
    "methodology" TEXT,
    "technicalUncertainty" TEXT,
    "expectedOutcome" TEXT,
    "industryCode" TEXT,
    "fieldOfResearch" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RDProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RDActivity" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "activityName" TEXT NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "activityDescription" TEXT NOT NULL,
    "hypothesis" TEXT,
    "experiment" TEXT,
    "observation" TEXT,
    "evaluation" TEXT,
    "conclusion" TEXT,
    "relatedCoreActivityId" TEXT,
    "dominantPurpose" TEXT,
    "isOverseasActivity" BOOLEAN NOT NULL DEFAULT false,
    "overseasFindingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RDActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeYearApplication" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "incomeYearStart" TIMESTAMP(3) NOT NULL,
    "incomeYearEnd" TIMESTAMP(3) NOT NULL,
    "ausIndustryNumber" TEXT,
    "registrationStatus" "RegistrationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "registrationDate" TIMESTAMP(3),
    "registrationDeadline" TIMESTAMP(3) NOT NULL,
    "claimStatus" "ClaimStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "totalNotionalDeduction" DECIMAL(15,2),
    "refundableOffset" DECIMAL(15,2),
    "nonRefundableOffset" DECIMAL(15,2),
    "feedstockAdjustment" DECIMAL(15,2),
    "clawbackAdjustment" DECIMAL(15,2),
    "offsetType" "OffsetType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomeYearApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expenditure" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "projectId" TEXT,
    "activityId" TEXT,
    "expenditureType" "ExpenditureType" NOT NULL,
    "amountExGst" DECIMAL(15,2) NOT NULL,
    "gstAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "isAssociateExpense" BOOLEAN NOT NULL DEFAULT false,
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "paymentDate" TIMESTAMP(3),
    "isOverseasExpense" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "supplierName" TEXT,
    "supplierAbn" TEXT,
    "rspRegistrationNumber" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expenditure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffMember" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "employeeId" TEXT,
    "annualSalary" DECIMAL(15,2),
    "onCosts" DECIMAL(15,2),
    "hourlyRate" DECIMAL(10,2),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeAllocation" (
    "id" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "hoursAllocated" DECIMAL(10,2) NOT NULL,
    "percentageOfTime" DECIMAL(5,2),
    "calculatedCost" DECIMAL(15,2),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceCheck" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "checkType" "ComplianceCheckType" NOT NULL,
    "status" "ComplianceStatus" NOT NULL,
    "message" TEXT,
    "details" JSONB,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionTracking" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "externalReference" TEXT,
    "submittedAt" TIMESTAMP(3),
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "responseDraft" TEXT,

    CONSTRAINT "SubmissionTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionEvent" (
    "id" TEXT NOT NULL,
    "trackingId" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeadlineReminder" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "deadlineType" "DeadlineType" NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "reminderDate" TIMESTAMP(3) NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "DeadlineReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuidanceCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "lastSynced" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuidanceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuidanceItem" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "keywords" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuidanceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Client_organisationId_idx" ON "Client"("organisationId");

-- CreateIndex
CREATE INDEX "Client_abn_idx" ON "Client"("abn");

-- CreateIndex
CREATE UNIQUE INDEX "ClientAssignment_userId_clientId_key" ON "ClientAssignment"("userId", "clientId");

-- CreateIndex
CREATE INDEX "RDProject_clientId_idx" ON "RDProject"("clientId");

-- CreateIndex
CREATE INDEX "RDActivity_projectId_idx" ON "RDActivity"("projectId");

-- CreateIndex
CREATE INDEX "RDActivity_relatedCoreActivityId_idx" ON "RDActivity"("relatedCoreActivityId");

-- CreateIndex
CREATE INDEX "IncomeYearApplication_clientId_idx" ON "IncomeYearApplication"("clientId");

-- CreateIndex
CREATE INDEX "IncomeYearApplication_registrationDeadline_idx" ON "IncomeYearApplication"("registrationDeadline");

-- CreateIndex
CREATE UNIQUE INDEX "IncomeYearApplication_clientId_incomeYearEnd_key" ON "IncomeYearApplication"("clientId", "incomeYearEnd");

-- CreateIndex
CREATE INDEX "Expenditure_applicationId_idx" ON "Expenditure"("applicationId");

-- CreateIndex
CREATE INDEX "Expenditure_projectId_idx" ON "Expenditure"("projectId");

-- CreateIndex
CREATE INDEX "Expenditure_activityId_idx" ON "Expenditure"("activityId");

-- CreateIndex
CREATE INDEX "Expenditure_expenditureType_idx" ON "Expenditure"("expenditureType");

-- CreateIndex
CREATE INDEX "StaffMember_clientId_idx" ON "StaffMember"("clientId");

-- CreateIndex
CREATE INDEX "TimeAllocation_staffMemberId_idx" ON "TimeAllocation"("staffMemberId");

-- CreateIndex
CREATE INDEX "TimeAllocation_activityId_idx" ON "TimeAllocation"("activityId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_applicationId_idx" ON "GeneratedDocument"("applicationId");

-- CreateIndex
CREATE INDEX "ComplianceCheck_applicationId_idx" ON "ComplianceCheck"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionTracking_applicationId_key" ON "SubmissionTracking"("applicationId");

-- CreateIndex
CREATE INDEX "SubmissionEvent_trackingId_idx" ON "SubmissionEvent"("trackingId");

-- CreateIndex
CREATE INDEX "DeadlineReminder_applicationId_idx" ON "DeadlineReminder"("applicationId");

-- CreateIndex
CREATE INDEX "DeadlineReminder_reminderDate_idx" ON "DeadlineReminder"("reminderDate");

-- CreateIndex
CREATE INDEX "GuidanceItem_categoryId_idx" ON "GuidanceItem"("categoryId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAssignment" ADD CONSTRAINT "ClientAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAssignment" ADD CONSTRAINT "ClientAssignment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RDProject" ADD CONSTRAINT "RDProject_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RDActivity" ADD CONSTRAINT "RDActivity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "RDProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RDActivity" ADD CONSTRAINT "RDActivity_relatedCoreActivityId_fkey" FOREIGN KEY ("relatedCoreActivityId") REFERENCES "RDActivity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeYearApplication" ADD CONSTRAINT "IncomeYearApplication_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expenditure" ADD CONSTRAINT "Expenditure_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "IncomeYearApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expenditure" ADD CONSTRAINT "Expenditure_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "RDProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expenditure" ADD CONSTRAINT "Expenditure_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "RDActivity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeAllocation" ADD CONSTRAINT "TimeAllocation_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeAllocation" ADD CONSTRAINT "TimeAllocation_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "RDActivity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "IncomeYearApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceCheck" ADD CONSTRAINT "ComplianceCheck_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "IncomeYearApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionTracking" ADD CONSTRAINT "SubmissionTracking_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "IncomeYearApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionEvent" ADD CONSTRAINT "SubmissionEvent_trackingId_fkey" FOREIGN KEY ("trackingId") REFERENCES "SubmissionTracking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeadlineReminder" ADD CONSTRAINT "DeadlineReminder_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "IncomeYearApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuidanceItem" ADD CONSTRAINT "GuidanceItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "GuidanceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
