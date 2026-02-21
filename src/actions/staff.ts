'use server'

import { revalidatePath } from 'next/cache'
import { staffService, StaffFormData, StaffWithRelations, StaffWithCounts } from '@/services/staff.service'
import { ActionResult } from '@/services/base.service'
import { requireOrganisation } from '@/lib/auth'
import { getStaffOrgId, getClientOrgId } from '@/lib/auth-utils'

export async function createStaff(
  clientId: string,
  formData: StaffFormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requireOrganisation()

  const clientOrgId = await getClientOrgId(clientId)
  if (!clientOrgId || clientOrgId !== user.organisationId) {
    return { success: false, error: 'Client not found' }
  }

  const result = await staffService.create(clientId, formData)

  if (result.success) {
    revalidatePath(`/clients/${clientId}/staff`)
    revalidatePath(`/clients/${clientId}`)
  }

  return result.success
    ? { success: true, data: { id: result.data.id } }
    : result
}

export async function updateStaff(
  id: string,
  formData: Partial<StaffFormData>,
  clientId: string
): Promise<ActionResult<{ id: string }>> {
  const user = await requireOrganisation()

  const orgId = await getStaffOrgId(id)
  if (!orgId || orgId !== user.organisationId) {
    return { success: false, error: 'Staff member not found' }
  }

  const result = await staffService.update(id, formData)

  if (result.success) {
    revalidatePath(`/clients/${clientId}/staff`)
    revalidatePath(`/clients/${clientId}/staff/${id}`)
    revalidatePath(`/clients/${clientId}`)
  }

  return result.success
    ? { success: true, data: { id: result.data.id } }
    : result
}

export async function deleteStaff(
  id: string,
  clientId: string
): Promise<ActionResult<void>> {
  const user = await requireOrganisation()

  const orgId = await getStaffOrgId(id)
  if (!orgId || orgId !== user.organisationId) {
    return { success: false, error: 'Staff member not found' }
  }

  const result = await staffService.delete(id)

  if (result.success) {
    revalidatePath(`/clients/${clientId}/staff`)
    revalidatePath(`/clients/${clientId}`)
  }

  return result
}

export async function getStaff(id: string): Promise<StaffWithRelations | null> {
  const user = await requireOrganisation()

  const orgId = await getStaffOrgId(id)
  if (!orgId || orgId !== user.organisationId) {
    return null
  }

  return staffService.findById(id)
}

export async function getStaffByClient(clientId: string): Promise<StaffWithCounts[]> {
  const user = await requireOrganisation()

  const clientOrgId = await getClientOrgId(clientId)
  if (!clientOrgId || clientOrgId !== user.organisationId) {
    return []
  }

  return staffService.listByClient(clientId)
}
