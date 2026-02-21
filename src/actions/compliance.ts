'use server'

import { complianceService } from '@/services/compliance.service'
import { requireOrganisation } from '@/lib/auth'

export async function runCompliance(applicationId: string) {
  await requireOrganisation()
  return complianceService.run(applicationId)
}

export async function getComplianceOverview(clientId?: string) {
  const user = await requireOrganisation()
  return complianceService.getOverview(user.organisationId!, clientId)
}
