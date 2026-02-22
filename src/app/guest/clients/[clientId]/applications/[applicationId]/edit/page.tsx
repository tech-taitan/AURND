"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { useGuestMode } from "@/components/providers/guest-mode-provider"
import { ApplicationForm } from "@/components/applications/application-form"
import type { ApplicationFormData } from "@/schemas/application.schema"

export default function GuestEditApplicationPage({
  params,
}: {
  params: Promise<{ clientId: string; applicationId: string }>
}) {
  const { clientId, applicationId } = use(params)
  const router = useRouter()
  const { guestService, refreshData } = useGuestMode()

  const appResult = guestService.getApplication(applicationId)
  if (!appResult.success) {
    router.push(`/guest/clients/${clientId}`)
    return null
  }

  const app = appResult.data

  const handleSubmit = async (data: ApplicationFormData) => {
    const result = guestService.updateApplication(applicationId, {
      incomeYearStart: data.incomeYearStart.toISOString(),
      incomeYearEnd: data.incomeYearEnd.toISOString(),
      ausIndustryNumber: data.ausIndustryNumber || undefined,
      registrationStatus: data.registrationStatus,
      registrationDate: data.registrationDate?.toISOString(),
    })

    if (!result.success) throw new Error(result.error)
    refreshData()
    router.push(`/guest/clients/${clientId}/applications/${applicationId}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Application</h1>
        <p className="text-muted-foreground">
          Update application {new Date(app.incomeYearStart).getFullYear()}-{new Date(app.incomeYearEnd).getFullYear()}
        </p>
      </div>
      <ApplicationForm
        initialData={{
          incomeYearStart: new Date(app.incomeYearStart),
          incomeYearEnd: new Date(app.incomeYearEnd),
          ausIndustryNumber: app.ausIndustryNumber,
          registrationStatus: app.registrationStatus as ApplicationFormData["registrationStatus"],
          registrationDate: app.registrationDate ? new Date(app.registrationDate) : undefined,
        }}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
