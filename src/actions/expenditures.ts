'use server'

import { revalidatePath } from 'next/cache'
import {
  expenditureService,
  ExpenditureFormData,
  ExpenditureWithRelations,
} from '@/services/expenditure.service'
import { ActionResult } from '@/services/base.service'
import { requireOrganisation } from '@/lib/auth'
import { getExpenditureOrgId, getApplicationOrgId, getClientOrgId } from '@/lib/auth-utils'

export async function createExpenditure(
  applicationId: string,
  formData: ExpenditureFormData,
  clientId: string
): Promise<ActionResult<{ id: string }>> {
  const user = await requireOrganisation()

  const orgId = await getApplicationOrgId(applicationId)
  if (!orgId || orgId !== user.organisationId) {
    return { success: false, error: 'Application not found' }
  }

  const result = await expenditureService.create(applicationId, formData)

  if (result.success) {
    revalidatePath(`/clients/${clientId}/applications/${applicationId}/expenditures`)
    revalidatePath(`/clients/${clientId}/applications/${applicationId}`)
  }

  return result.success
    ? { success: true, data: { id: result.data.id } }
    : result
}

export async function updateExpenditure(
  id: string,
  formData: Partial<ExpenditureFormData>,
  clientId: string,
  applicationId: string
): Promise<ActionResult<{ id: string }>> {
  const user = await requireOrganisation()

  const orgId = await getExpenditureOrgId(id)
  if (!orgId || orgId !== user.organisationId) {
    return { success: false, error: 'Expenditure not found' }
  }

  const result = await expenditureService.update(id, formData)

  if (result.success) {
    revalidatePath(`/clients/${clientId}/applications/${applicationId}/expenditures`)
    revalidatePath(`/clients/${clientId}/applications/${applicationId}`)
  }

  return result.success
    ? { success: true, data: { id: result.data.id } }
    : result
}

export async function deleteExpenditure(
  id: string,
  clientId: string,
  applicationId: string
): Promise<ActionResult<void>> {
  const user = await requireOrganisation()

  const orgId = await getExpenditureOrgId(id)
  if (!orgId || orgId !== user.organisationId) {
    return { success: false, error: 'Expenditure not found' }
  }

  const result = await expenditureService.delete(id)

  if (result.success) {
    revalidatePath(`/clients/${clientId}/applications/${applicationId}/expenditures`)
    revalidatePath(`/clients/${clientId}/applications/${applicationId}`)
  }

  return result
}

export async function getExpenditure(id: string): Promise<ExpenditureWithRelations | null> {
  const user = await requireOrganisation()

  const orgId = await getExpenditureOrgId(id)
  if (!orgId || orgId !== user.organisationId) {
    return null
  }

  return expenditureService.findById(id)
}

export async function getExpendituresByApplication(
  applicationId: string
): Promise<ExpenditureWithRelations[]> {
  const user = await requireOrganisation()

  const orgId = await getApplicationOrgId(applicationId)
  if (!orgId || orgId !== user.organisationId) {
    return []
  }

  return expenditureService.listByApplication(applicationId)
}

export async function getExpendituresByClient(
  clientId: string
): Promise<ExpenditureWithRelations[]> {
  const user = await requireOrganisation()

  const clientOrgId = await getClientOrgId(clientId)
  if (!clientOrgId || clientOrgId !== user.organisationId) {
    return []
  }

  return expenditureService.listByClient(clientId)
}
