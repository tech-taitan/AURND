"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { useGuestMode } from "@/components/providers/guest-mode-provider"
import { ApplicationForm } from "@/components/applications/application-form"
import type { ApplicationFormData } from "@/schemas/application.schema"

export default function GuestNewApplicationPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = use(params)
  const router = useRouter()
  const { guestService, refreshData } = useGuestMode()

  const handleSubmit = async (data: ApplicationFormData) => {
    const result = guestService.createApplication(clientId, {
      incomeYearStart: data.incomeYearStart.toISOString(),
      incomeYearEnd: data.incomeYearEnd.toISOString(),
      ausIndustryNumber: data.ausIndustryNumber || undefined,
      registrationStatus: data.registrationStatus,
      registrationDate: data.registrationDate?.toISOString(),
    })

    if (!result.success) throw new Error(result.error)
    refreshData()
    router.push(`/guest/clients/${clientId}/applications/${result.data.id}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Application</h1>
        <p className="text-muted-foreground">Create an income year application</p>
      </div>
      <ApplicationForm onSubmit={handleSubmit} />
    </div>
  )
}
