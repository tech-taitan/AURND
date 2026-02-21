import prisma from '@/lib/db'

/**
 * Verify that a client belongs to the given organisation.
 * Returns the client's organisationId, or null if not found.
 */
export async function getClientOrgId(clientId: string): Promise<string | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { organisationId: true },
  })
  return client?.organisationId ?? null
}

/**
 * Verify that a project belongs to the given organisation (via client).
 * Returns the organisationId, or null if not found.
 */
export async function getProjectOrgId(projectId: string): Promise<string | null> {
  const project = await prisma.rDProject.findUnique({
    where: { id: projectId },
    include: { client: { select: { organisationId: true } } },
  })
  return project?.client.organisationId ?? null
}

/**
 * Verify that an activity belongs to the given organisation (via project -> client).
 * Returns the organisationId, or null if not found.
 */
export async function getActivityOrgId(activityId: string): Promise<string | null> {
  const activity = await prisma.rDActivity.findUnique({
    where: { id: activityId },
    include: { project: { include: { client: { select: { organisationId: true } } } } },
  })
  return activity?.project.client.organisationId ?? null
}

/**
 * Verify that an application belongs to the given organisation (via client).
 * Returns the organisationId, or null if not found.
 */
export async function getApplicationOrgId(applicationId: string): Promise<string | null> {
  const application = await prisma.incomeYearApplication.findUnique({
    where: { id: applicationId },
    include: { client: { select: { organisationId: true } } },
  })
  return application?.client.organisationId ?? null
}

/**
 * Verify that an expenditure belongs to the given organisation (via application -> client).
 * Returns the organisationId, or null if not found.
 */
export async function getExpenditureOrgId(expenditureId: string): Promise<string | null> {
  const expenditure = await prisma.expenditure.findUnique({
    where: { id: expenditureId },
    include: { application: { include: { client: { select: { organisationId: true } } } } },
  })
  return expenditure?.application.client.organisationId ?? null
}

/**
 * Verify that a staff member belongs to the given organisation (via client).
 * Returns the organisationId, or null if not found.
 */
export async function getStaffOrgId(staffMemberId: string): Promise<string | null> {
  const staff = await prisma.staffMember.findUnique({
    where: { id: staffMemberId },
    include: { client: { select: { organisationId: true } } },
  })
  return staff?.client.organisationId ?? null
}

/**
 * Verify that a time allocation belongs to the given organisation (via staffMember -> client).
 * Returns the organisationId, or null if not found.
 */
export async function getTimeAllocationOrgId(timeAllocationId: string): Promise<string | null> {
  const allocation = await prisma.timeAllocation.findUnique({
    where: { id: timeAllocationId },
    include: { staffMember: { include: { client: { select: { organisationId: true } } } } },
  })
  return allocation?.staffMember.client.organisationId ?? null
}
