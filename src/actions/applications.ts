'use server'

import { revalidatePath } from 'next/cache'
import {
  applicationService,
  ApplicationWithRelations,
  ApplicationFormData,
} from '@/services/application.service'
import { ActionResult } from '@/services/base.service'
import { requireOrganisation } from '@/lib/auth'
import { getClientOrgId, getApplicationOrgId } from '@/lib/auth-utils'

export async function createApplication(
  clientId: string,
  formData: ApplicationFormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requireOrganisation()

  const clientOrgId = await getClientOrgId(clientId)
  if (!clientOrgId || clientOrgId !== user.organisationId) {
    return { success: false, error: 'Client not found' }
  }

  const result = await applicationService.create(clientId, formData)

  if (result.success) {
    revalidatePath(`/clients/${clientId}`)
    revalidatePath(`/clients/${clientId}/applications`)
  }

  return result.success
    ? { success: true, data: { id: result.data.id } }
    : result
}

export async function updateApplication(
  id: string,
  formData: Partial<ApplicationFormData>,
  clientId: string
): Promise<ActionResult<{ id: string }>> {
  const user = await requireOrganisation()

  const orgId = await getApplicationOrgId(id)
  if (!orgId || orgId !== user.organisationId) {
    return { success: false, error: 'Application not found' }
  }

  const result = await applicationService.update(id, formData)

  if (result.success) {
    revalidatePath(`/clients/${clientId}`)
    revalidatePath(`/clients/${clientId}/applications/${id}`)
  }

  return result.success
    ? { success: true, data: { id: result.data.id } }
    : result
}

export async function deleteApplication(
  id: string,
  clientId: string
): Promise<ActionResult<void>> {
  const user = await requireOrganisation()

  const orgId = await getApplicationOrgId(id)
  if (!orgId || orgId !== user.organisationId) {
    return { success: false, error: 'Application not found' }
  }

  const result = await applicationService.delete(id)

  if (result.success) {
    revalidatePath(`/clients/${clientId}`)
    revalidatePath(`/clients/${clientId}/applications`)
  }

  return result
}

export async function calculateApplication(
  id: string,
  clientId: string
): Promise<ActionResult<{ id: string }>> {
  const user = await requireOrganisation()

  const orgId = await getApplicationOrgId(id)
  if (!orgId || orgId !== user.organisationId) {
    return { success: false, error: 'Application not found' }
  }

  const result = await applicationService.calculateAndUpdate(id)

  if (result.success) {
    revalidatePath(`/clients/${clientId}/applications/${id}`)
    revalidatePath(`/clients/${clientId}`)
  }

  return result.success
    ? { success: true, data: { id: result.data.id } }
    : result
}

export async function getApplication(id: string): Promise<ApplicationWithRelations | null> {
  const user = await requireOrganisation()
  return applicationService.findByIdForOrganisation(id, user.organisationId!)
}

export async function getApplicationsByClient(clientId: string) {
  const user = await requireOrganisation()
  return applicationService.listByClientForOrganisation(clientId, user.organisationId!)
}
