'use server'

import { revalidatePath } from 'next/cache'
import { submissionService, SubmissionUpdateInput } from '@/services/submission.service'
import { ActionResult } from '@/services/base.service'
import { requireOrganisation } from '@/lib/auth'

export async function getSubmissionTracking(applicationId: string) {
  await requireOrganisation()
  return submissionService.get(applicationId)
}

export async function updateSubmissionTracking(
  applicationId: string,
  clientId: string,
  input: SubmissionUpdateInput
): Promise<ActionResult<{ id: string }>> {
  await requireOrganisation()
  const result = await submissionService.update(applicationId, input)

  if (result.success) {
    revalidatePath(`/clients/${clientId}/applications/${applicationId}/submission`)
    revalidatePath(`/clients/${clientId}/applications/${applicationId}`)
  }

  return result.success
    ? { success: true, data: { id: result.data.id } }
    : result
}
