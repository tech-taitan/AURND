"use client"

import { useRouter } from "next/navigation"
import { useGuestMode } from "@/components/providers/guest-mode-provider"
import { ClientForm } from "@/components/clients/client-form"
import type { ClientFormData } from "@/schemas/client.schema"

export default function GuestNewClientPage() {
  const router = useRouter()
  const { guestService, refreshData } = useGuestMode()

  const handleSubmit = async (data: ClientFormData) => {
    const result = guestService.createClient({
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
    router.push(`/guest/clients/${result.data.id}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add New Client</h1>
        <p className="text-muted-foreground">
          Register a new R&D Tax Incentive client
        </p>
      </div>
      <ClientForm onSubmit={handleSubmit} />
    </div>
  )
}
