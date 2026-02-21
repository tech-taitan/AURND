'use server'

import { comparisonService } from '@/services/comparison.service'
import { requireOrganisation } from '@/lib/auth'

export async function getApplicationComparison(applicationId: string) {
  await requireOrganisation()
  return comparisonService.compare(applicationId)
}
