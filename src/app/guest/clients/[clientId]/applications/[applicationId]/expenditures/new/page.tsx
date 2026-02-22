"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { useGuestMode } from "@/components/providers/guest-mode-provider"
import { ExpenditureForm } from "@/components/expenditure/expenditure-form"
import type { ExpenditureFormData } from "@/schemas/expenditure.schema"

export default function GuestNewExpenditurePage({
  params,
}: {
  params: Promise<{ clientId: string; applicationId: string }>
}) {
  const { clientId, applicationId } = use(params)
  const router = useRouter()
  const { guestService, refreshData } = useGuestMode()

  const projects = guestService
    .listProjects(clientId)
    .map((p) => ({ id: p.id, name: p.projectName }))

  const activities = guestService
    .getActivitiesByClient(clientId)
    .map((a) => ({ id: a.id, name: a.activityName }))

  const handleSubmit = async (data: ExpenditureFormData) => {
    const result = guestService.createExpenditure(applicationId, {
      projectId: data.projectId,
      activityId: data.activityId,
      expenditureType: data.expenditureType,
      amountExGst: data.amountExGst,
      gstAmount: data.gstAmount,
      isAssociateExpense: data.isAssociateExpense,
      isPaid: data.isPaid,
      paymentDate: data.paymentDate,
      isOverseasExpense: data.isOverseasExpense,
      description: data.description,
      invoiceNumber: data.invoiceNumber,
      invoiceDate: data.invoiceDate,
      supplierName: data.supplierName,
      supplierAbn: data.supplierAbn,
      rspRegistrationNumber: data.rspRegistrationNumber,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
    })

    if (!result.success) throw new Error(result.error)
    refreshData()
    router.push(`/guest/clients/${clientId}/applications/${applicationId}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add Expenditure</h1>
        <p className="text-muted-foreground">Record an R&D expenditure</p>
      </div>
      <ExpenditureForm
        projects={projects}
        activities={activities}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
