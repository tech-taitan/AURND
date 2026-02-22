"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { useGuestMode } from "@/components/providers/guest-mode-provider"
import { ExpenditureForm } from "@/components/expenditure/expenditure-form"
import type { ExpenditureFormData } from "@/schemas/expenditure.schema"

export default function GuestEditExpenditurePage({
  params,
}: {
  params: Promise<{ clientId: string; applicationId: string; expenditureId: string }>
}) {
  const { clientId, applicationId, expenditureId } = use(params)
  const router = useRouter()
  const { guestService, refreshData } = useGuestMode()

  const expResult = guestService.getExpenditure(expenditureId)
  if (!expResult.success) {
    router.push(`/guest/clients/${clientId}/applications/${applicationId}`)
    return null
  }

  const exp = expResult.data
  const projects = guestService
    .listProjects(clientId)
    .map((p) => ({ id: p.id, name: p.projectName }))
  const activities = guestService
    .getActivitiesByClient(clientId)
    .map((a) => ({ id: a.id, name: a.activityName }))

  const handleSubmit = async (data: ExpenditureFormData) => {
    const result = guestService.updateExpenditure(expenditureId, {
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
        <h1 className="text-3xl font-bold">Edit Expenditure</h1>
        <p className="text-muted-foreground">Update expenditure details</p>
      </div>
      <ExpenditureForm
        initialData={{
          projectId: exp.projectId,
          activityId: exp.activityId,
          expenditureType: exp.expenditureType as ExpenditureFormData["expenditureType"],
          amountExGst: exp.amountExGst,
          gstAmount: exp.gstAmount,
          isAssociateExpense: exp.isAssociateExpense,
          isPaid: exp.isPaid,
          paymentDate: exp.paymentDate,
          isOverseasExpense: exp.isOverseasExpense,
          description: exp.description,
          invoiceNumber: exp.invoiceNumber,
          invoiceDate: exp.invoiceDate,
          supplierName: exp.supplierName,
          supplierAbn: exp.supplierAbn,
          rspRegistrationNumber: exp.rspRegistrationNumber,
          periodStart: exp.periodStart,
          periodEnd: exp.periodEnd,
        }}
        projects={projects}
        activities={activities}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
