'use server'

import { revalidatePath } from 'next/cache'
import {
  activityService,
  ActivityFormData,
  ActivityWithRelations,
  HECValidationResult,
} from '@/services/activity.service'
import { RDActivity } from '@prisma/client'
import { ActionResult } from '@/services/base.service'
import { requireOrganisation } from '@/lib/auth'
import { getActivityOrgId, getProjectOrgId, getClientOrgId } from '@/lib/auth-utils'

export async function createActivity(
  projectId: string,
  formData: ActivityFormData,
  clientId: string
): Promise<ActionResult<{ id: string }>> {
  const user = await requireOrganisation()

  const orgId = await getProjectOrgId(projectId)
  if (!orgId || orgId !== user.organisationId) {
    return { success: false, error: 'Project not found' }
  }

  const result = await activityService.create(projectId, formData)

  if (result.success) {
    revalidatePath(`/clients/${clientId}/projects/${projectId}`)
    revalidatePath(`/clients/${clientId}/projects/${projectId}/activities`)
  }

  return result.success
    ? { success: true, data: { id: result.data.id } }
    : result
}

export async function updateActivity(
  id: string,
  formData: Partial<ActivityFormData>,
  projectId: string,
  clientId: string
): Promise<ActionResult<{ id: string }>> {
  const user = await requireOrganisation()

  const orgId = await getActivityOrgId(id)
  if (!orgId || orgId !== user.organisationId) {
    return { success: false, error: 'Activity not found' }
  }

  const result = await activityService.update(id, formData)

  if (result.success) {
    revalidatePath(`/clients/${clientId}/projects/${projectId}`)
    revalidatePath(`/clients/${clientId}/projects/${projectId}/activities`)
    revalidatePath(`/clients/${clientId}/projects/${projectId}/activities/${id}`)
  }

  return result.success
    ? { success: true, data: { id: result.data.id } }
    : result
}

export async function deleteActivity(
  id: string,
  projectId: string,
  clientId: string
): Promise<ActionResult<void>> {
  const user = await requireOrganisation()

  const orgId = await getActivityOrgId(id)
  if (!orgId || orgId !== user.organisationId) {
    return { success: false, error: 'Activity not found' }
  }

  const result = await activityService.delete(id)

  if (result.success) {
    revalidatePath(`/clients/${clientId}/projects/${projectId}`)
    revalidatePath(`/clients/${clientId}/projects/${projectId}/activities`)
  }

  return result
}

export async function getActivity(id: string): Promise<ActivityWithRelations | null> {
  const user = await requireOrganisation()

  const orgId = await getActivityOrgId(id)
  if (!orgId || orgId !== user.organisationId) {
    return null
  }

  return activityService.findById(id)
}

export async function getActivitiesByProject(projectId: string): Promise<RDActivity[]> {
  const user = await requireOrganisation()

  const orgId = await getProjectOrgId(projectId)
  if (!orgId || orgId !== user.organisationId) {
    return []
  }

  return activityService.listByProject(projectId)
}

export async function getActivitiesByClient(clientId: string) {
  const user = await requireOrganisation()

  const clientOrgId = await getClientOrgId(clientId)
  if (!clientOrgId || clientOrgId !== user.organisationId) {
    return []
  }

  return activityService.listByClient(clientId)
}

export async function getCoreActivities(projectId: string): Promise<RDActivity[]> {
  const user = await requireOrganisation()

  const orgId = await getProjectOrgId(projectId)
  if (!orgId || orgId !== user.organisationId) {
    return []
  }

  return activityService.getCoreActivities(projectId)
}

export async function getActivityStats(projectId: string) {
  const user = await requireOrganisation()

  const orgId = await getProjectOrgId(projectId)
  if (!orgId || orgId !== user.organisationId) {
    return null
  }

  return activityService.getActivityStats(projectId)
}

export async function validateActivityHEC(activity: RDActivity): Promise<HECValidationResult> {
  return activityService.validateHECFramework(activity)
}
