'use server'

import { revalidatePath } from 'next/cache'
import { projectService, ProjectFormData, ProjectWithActivities, ProjectWithCounts } from '@/services/project.service'
import { ProjectStatus } from '@prisma/client'
import { ActionResult } from '@/services/base.service'
import { requireOrganisation } from '@/lib/auth'
import { getProjectOrgId, getClientOrgId } from '@/lib/auth-utils'

export async function createProject(
  clientId: string,
  formData: ProjectFormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requireOrganisation()

  const clientOrgId = await getClientOrgId(clientId)
  if (!clientOrgId || clientOrgId !== user.organisationId) {
    return { success: false, error: 'Client not found' }
  }

  const result = await projectService.create(clientId, formData)

  if (result.success) {
    revalidatePath(`/clients/${clientId}`)
    revalidatePath(`/clients/${clientId}/projects`)
    revalidatePath('/projects')
  }

  return result.success
    ? { success: true, data: { id: result.data.id } }
    : result
}

export async function updateProject(
  id: string,
  formData: Partial<ProjectFormData>,
  clientId: string
): Promise<ActionResult<{ id: string }>> {
  const user = await requireOrganisation()

  const orgId = await getProjectOrgId(id)
  if (!orgId || orgId !== user.organisationId) {
    return { success: false, error: 'Project not found' }
  }

  const result = await projectService.update(id, formData)

  if (result.success) {
    revalidatePath(`/clients/${clientId}`)
    revalidatePath(`/clients/${clientId}/projects`)
    revalidatePath(`/clients/${clientId}/projects/${id}`)
    revalidatePath('/projects')
  }

  return result.success
    ? { success: true, data: { id: result.data.id } }
    : result
}

export async function updateProjectStatus(
  id: string,
  status: ProjectStatus,
  clientId: string
): Promise<ActionResult<{ id: string }>> {
  const user = await requireOrganisation()

  const orgId = await getProjectOrgId(id)
  if (!orgId || orgId !== user.organisationId) {
    return { success: false, error: 'Project not found' }
  }

  const result = await projectService.updateStatus(id, status)

  if (result.success) {
    revalidatePath(`/clients/${clientId}`)
    revalidatePath(`/clients/${clientId}/projects/${id}`)
    revalidatePath('/projects')
  }

  return result.success
    ? { success: true, data: { id: result.data.id } }
    : result
}

export async function deleteProject(
  id: string,
  clientId: string
): Promise<ActionResult<void>> {
  const user = await requireOrganisation()

  const orgId = await getProjectOrgId(id)
  if (!orgId || orgId !== user.organisationId) {
    return { success: false, error: 'Project not found' }
  }

  const result = await projectService.delete(id)

  if (result.success) {
    revalidatePath(`/clients/${clientId}`)
    revalidatePath(`/clients/${clientId}/projects`)
    revalidatePath('/projects')
  }

  return result
}

export async function getProject(id: string): Promise<ProjectWithActivities | null> {
  const user = await requireOrganisation()

  const orgId = await getProjectOrgId(id)
  if (!orgId || orgId !== user.organisationId) {
    return null
  }

  return projectService.findById(id)
}

export async function getProjectsByClient(clientId: string): Promise<ProjectWithCounts[]> {
  const user = await requireOrganisation()

  const clientOrgId = await getClientOrgId(clientId)
  if (!clientOrgId || clientOrgId !== user.organisationId) {
    return []
  }

  return projectService.listByClient(clientId)
}

export async function getProjectStats(projectId: string) {
  const user = await requireOrganisation()

  const orgId = await getProjectOrgId(projectId)
  if (!orgId || orgId !== user.organisationId) {
    return null
  }

  return projectService.getProjectStats(projectId)
}

export async function getProjectExpenditure(projectId: string): Promise<number> {
  const user = await requireOrganisation()

  const orgId = await getProjectOrgId(projectId)
  if (!orgId || orgId !== user.organisationId) {
    return 0
  }

  return projectService.calculateProjectExpenditure(projectId)
}
