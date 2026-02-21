'use server'

import { revalidatePath } from 'next/cache'
import {
  timeAllocationService,
  TimeAllocationFormData,
  TimeAllocationWithRelations,
} from '@/services/time-allocation.service'
import { ActionResult } from '@/services/base.service'
import { requireOrganisation } from '@/lib/auth'
import { getTimeAllocationOrgId, getClientOrgId, getStaffOrgId, getActivityOrgId } from '@/lib/auth-utils'

export async function createTimeAllocation(
  formData: TimeAllocationFormData,
  clientId: string,
  staffId?: string,
  projectId?: string
): Promise<ActionResult<{ id: string }>> {
  const user = await requireOrganisation()

  const clientOrgId = await getClientOrgId(clientId)
  if (!clientOrgId || clientOrgId !== user.organisationId) {
    return { success: false, error: 'Client not found' }
  }

  const result = await timeAllocationService.create(formData)

  if (result.success) {
    revalidatePath(`/clients/${clientId}/staff`)
    if (staffId) {
      revalidatePath(`/clients/${clientId}/staff/${staffId}`)
    }
    if (projectId) {
      revalidatePath(`/clients/${clientId}/projects/${projectId}`)
    }
  }

  return result.success
    ? { success: true, data: { id: result.data.id } }
    : result
}

export async function updateTimeAllocation(
  id: string,
  formData: Partial<TimeAllocationFormData>,
  clientId: string,
  staffId?: string,
  projectId?: string
): Promise<ActionResult<{ id: string }>> {
  const user = await requireOrganisation()

  const orgId = await getTimeAllocationOrgId(id)
  if (!orgId || orgId !== user.organisationId) {
    return { success: false, error: 'Time allocation not found' }
  }

  const result = await timeAllocationService.update(id, formData)

  if (result.success) {
    revalidatePath(`/clients/${clientId}/staff`)
    if (staffId) {
      revalidatePath(`/clients/${clientId}/staff/${staffId}`)
    }
    if (projectId) {
      revalidatePath(`/clients/${clientId}/projects/${projectId}`)
    }
  }

  return result.success
    ? { success: true, data: { id: result.data.id } }
    : result
}

export async function deleteTimeAllocation(
  id: string,
  clientId: string,
  staffId?: string,
  projectId?: string
): Promise<ActionResult<void>> {
  const user = await requireOrganisation()

  const orgId = await getTimeAllocationOrgId(id)
  if (!orgId || orgId !== user.organisationId) {
    return { success: false, error: 'Time allocation not found' }
  }

  const result = await timeAllocationService.delete(id)

  if (result.success) {
    revalidatePath(`/clients/${clientId}/staff`)
    if (staffId) {
      revalidatePath(`/clients/${clientId}/staff/${staffId}`)
    }
    if (projectId) {
      revalidatePath(`/clients/${clientId}/projects/${projectId}`)
    }
  }

  return result
}

export async function getTimeAllocation(
  id: string
): Promise<TimeAllocationWithRelations | null> {
  const user = await requireOrganisation()

  const orgId = await getTimeAllocationOrgId(id)
  if (!orgId || orgId !== user.organisationId) {
    return null
  }

  return timeAllocationService.findById(id)
}

export async function getTimeAllocationsByStaff(
  staffMemberId: string
): Promise<TimeAllocationWithRelations[]> {
  const user = await requireOrganisation()

  const orgId = await getStaffOrgId(staffMemberId)
  if (!orgId || orgId !== user.organisationId) {
    return []
  }

  return timeAllocationService.listByStaff(staffMemberId)
}

export async function getTimeAllocationsByActivity(
  activityId: string
): Promise<TimeAllocationWithRelations[]> {
  const user = await requireOrganisation()

  const orgId = await getActivityOrgId(activityId)
  if (!orgId || orgId !== user.organisationId) {
    return []
  }

  return timeAllocationService.listByActivity(activityId)
}
