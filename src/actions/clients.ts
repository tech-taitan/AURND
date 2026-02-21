'use server'

import { revalidatePath } from 'next/cache'
import { clientService, ClientFormData } from '@/services/client.service'
import { ActionResult } from '@/services/base.service'
import { Client } from '@prisma/client'
import { requireOrganisation } from '@/lib/auth'
import { logger } from '@/lib/logger'

export async function createClient(
  formData: ClientFormData
): Promise<ActionResult<Client>> {
  const user = await requireOrganisation()
  
  const result = await clientService.create(user.organisationId!, formData, user.id)

  if (result.success) {
    revalidatePath('/clients')
    revalidatePath('/')
  }

  return result
}

export async function updateClient(
  id: string,
  formData: Partial<ClientFormData>
): Promise<ActionResult<Client>> {
  const user = await requireOrganisation()
  
  // Verify ownership
  const isOwner = await clientService.verifyOwnership(id, user.organisationId!)
  if (!isOwner) {
    logger.warn('Unauthorized client update attempt', { clientId: id, userId: user.id })
    return { success: false, error: 'Client not found' }
  }
  
  const result = await clientService.update(id, formData, user.id, user.organisationId!)

  if (result.success) {
    revalidatePath('/clients')
    revalidatePath(`/clients/${id}`)
    revalidatePath('/')
  }

  return result
}

export async function deleteClient(id: string): Promise<ActionResult<void>> {
  const user = await requireOrganisation()
  
  // Verify ownership
  const isOwner = await clientService.verifyOwnership(id, user.organisationId!)
  if (!isOwner) {
    logger.warn('Unauthorized client delete attempt', { clientId: id, userId: user.id })
    return { success: false, error: 'Client not found' }
  }
  
  const result = await clientService.delete(id, user.id, user.organisationId!)

  if (result.success) {
    revalidatePath('/clients')
    revalidatePath('/')
  }

  return result
}

export async function getClient(id: string) {
  const user = await requireOrganisation()
  
  // Verify ownership
  const isOwner = await clientService.verifyOwnership(id, user.organisationId!)
  if (!isOwner) {
    return null
  }
  
  return clientService.findById(id)
}

export async function getClientStats(clientId: string) {
  const user = await requireOrganisation()
  
  // Verify ownership
  const isOwner = await clientService.verifyOwnership(clientId, user.organisationId!)
  if (!isOwner) {
    return {
      activeProjects: 0,
      totalApplications: 0,
      pendingApplications: 0,
      totalExpenditure: 0,
    }
  }
  
  return clientService.getClientStats(clientId)
}

export async function searchClients(search?: string, page?: number, limit?: number) {
  const user = await requireOrganisation()
  
  return clientService.list({
    organisationId: user.organisationId!,
    search,
    page,
    limit,
  })
}
