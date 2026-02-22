"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { useGuestMode } from "@/components/providers/guest-mode-provider"
import { ClientForm } from "@/components/clients/client-form"
import type { ClientFormData } from "@/schemas/client.schema"

export default function GuestEditClientPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params)
  const router = useRouter()
  const { guestService, refreshData } = useGuestMode()

  const clientResult = guestService.getClient(clientId)
  if (!clientResult.success) {
    router.push("/guest/clients")
    return null
  }

  const client = clientResult.data

  const handleSubmit = async (data: ClientFormData) => {
    const result = guestService.updateClient(clientId, {
      companyName: data.companyName,
      abn: data.abn,
      acn: data.acn,
      incorporationType: data.incorporationType,
      isConsolidatedGroup: data.isConsolidatedGroup,
      isExemptControlled: data.isExemptControlled,
      aggregatedTurnover: data.aggregatedTurnover,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      address: data.address,
      incomeYearEndMonth: data.incomeYearEndMonth,
      incomeYearEndDay: data.incomeYearEndDay,
    })

    if (!result.success) {
      throw new Error(result.error)
    }

    refreshData()
    router.push(`/guest/clients/${clientId}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Client</h1>
        <p className="text-muted-foreground">
          Update details for {client.companyName}
        </p>
      </div>
      <ClientForm
        initialData={{
          companyName: client.companyName,
          abn: client.abn,
          acn: client.acn,
          incorporationType: client.incorporationType as "AUSTRALIAN_LAW" | "FOREIGN_RESIDENT" | "FOREIGN_PERMANENT_ESTABLISHMENT",
          isConsolidatedGroup: client.isConsolidatedGroup,
          isExemptControlled: client.isExemptControlled,
          aggregatedTurnover: client.aggregatedTurnover,
          contactName: client.contactName,
          contactEmail: client.contactEmail,
          contactPhone: client.contactPhone,
          address: client.address,
          incomeYearEndMonth: client.incomeYearEndMonth,
          incomeYearEndDay: client.incomeYearEndDay,
        }}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
