"use client"

import { useRouter } from "next/navigation"
import { use, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ExpenditureForm } from "@/components/expenditure/expenditure-form"
import { getExpenditure, updateExpenditure } from "@/actions/expenditures"
import { getProjectsByClient } from "@/actions/projects"
import { getActivitiesByClient } from "@/actions/activities"
import type { ExpenditureFormData } from "@/schemas/expenditure.schema"

interface PageProps {
  params: Promise<{ clientId: string; applicationId: string; expenditureId: string }>
}

export default function EditExpenditurePage({ params }: PageProps) {
  const { clientId, applicationId, expenditureId } = use(params)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [initialData, setInitialData] = useState<Partial<ExpenditureFormData> | null>(null)
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const [activities, setActivities] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    async function loadData() {
      const [expenditure, projectList, activityList] = await Promise.all([
        getExpenditure(expenditureId),
        getProjectsByClient(clientId),
        getActivitiesByClient(clientId),
      ])

      if (expenditure) {
        setInitialData({
          projectId: expenditure.project?.id || "",
          activityId: expenditure.activity?.id || "",
          expenditureType: expenditure.expenditureType,
          amountExGst: expenditure.amountExGst.toString(),
          gstAmount: expenditure.gstAmount.toString(),
          isAssociateExpense: expenditure.isAssociateExpense,
          isPaid: expenditure.isPaid,
          paymentDate: expenditure.paymentDate
            ? new Date(expenditure.paymentDate).toISOString().slice(0, 10)
            : "",
          isOverseasExpense: expenditure.isOverseasExpense,
          description: expenditure.description,
          invoiceNumber: expenditure.invoiceNumber || "",
          invoiceDate: expenditure.invoiceDate
            ? new Date(expenditure.invoiceDate).toISOString().slice(0, 10)
            : "",
          supplierName: expenditure.supplierName || "",
          supplierAbn: expenditure.supplierAbn || "",
          rspRegistrationNumber: expenditure.rspRegistrationNumber || "",
          periodStart: expenditure.periodStart
            ? new Date(expenditure.periodStart).toISOString().slice(0, 10)
            : "",
          periodEnd: expenditure.periodEnd
            ? new Date(expenditure.periodEnd).toISOString().slice(0, 10)
            : "",
          attachments: (expenditure.attachments as ExpenditureFormData["attachments"]) || [],
        })
      }

      setProjects(projectList.map((project) => ({ id: project.id, name: project.projectName })))
      setActivities(activityList.map((activity) => ({ id: activity.id, name: activity.activityName })))
    }

    loadData()
  }, [clientId, expenditureId])

  const handleSubmit = async (data: ExpenditureFormData) => {
    setIsLoading(true)
    try {
      const result = await updateExpenditure(expenditureId, data, clientId, applicationId)
      if (!result.success) {
        throw new Error(result.error)
      }
      router.push(`/clients/${clientId}/applications/${applicationId}/expenditures`)
    } finally {
      setIsLoading(false)
    }
  }

  if (!initialData) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading expenditure...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/clients/${clientId}/applications/${applicationId}/expenditures`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Expenditure</h1>
          <p className="text-muted-foreground">Update expenditure details</p>
        </div>
      </div>

      <ExpenditureForm
        initialData={initialData}
        projects={projects}
        activities={activities}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  )
}
