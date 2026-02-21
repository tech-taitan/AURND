'use server'

import { revalidatePath } from 'next/cache'
import { documentService } from '@/services/document.service'
import { ActionResult } from '@/services/base.service'
import { GeneratedDocument } from '@prisma/client'
import { requireOrganisation } from '@/lib/auth'

export async function generateActivityDescription(
  applicationId: string,
  clientId: string
): Promise<ActionResult<{ id: string }>> {
  await requireOrganisation()
  const result = await documentService.generateActivityDescription(applicationId)

  if (result.success) {
    revalidatePath(`/clients/${clientId}/applications/${applicationId}/documents`)
    revalidatePath(`/clients/${clientId}/applications/${applicationId}`)
  }

  return result.success
    ? { success: true, data: { id: result.data.id } }
    : result
}

export async function getDocuments(applicationId: string): Promise<GeneratedDocument[]> {
  await requireOrganisation()
  return documentService.listByApplication(applicationId)
}
