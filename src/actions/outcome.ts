'use server'

import { revalidatePath } from 'next/cache'
import { outcomeService, OutcomeLetterInput } from '@/services/outcome.service'
import { ActionResult } from '@/services/base.service'
import { requireOrganisation } from '@/lib/auth'

export async function generateOutcomeLetter(
  applicationId: string,
  clientId: string,
  input: OutcomeLetterInput
): Promise<ActionResult<{ id: string }>> {
  await requireOrganisation()
  const result = await outcomeService.generateConfirmationLetter(applicationId, input)

  if (result.success) {
    revalidatePath(`/clients/${clientId}/applications/${applicationId}/outcome`)
    revalidatePath(`/clients/${clientId}/applications/${applicationId}`)
    revalidatePath(`/clients/${clientId}/applications/${applicationId}/documents`)
  }

  return result.success
    ? { success: true, data: { id: result.data.id } }
    : result
}
