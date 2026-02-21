"use client"

import { useRouter } from "next/navigation"
import { use, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ApplicationForm } from "@/components/applications/application-form"
import { getApplication, updateApplication } from "@/actions/applications"
import type { ApplicationFormData } from "@/schemas/application.schema"

interface PageProps {
  params: Promise<{ clientId: string; applicationId: string }>
}

export default function EditApplicationPage({ params }: PageProps) {
  const { clientId, applicationId } = use(params)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [initialData, setInitialData] = useState<Partial<ApplicationFormData> | null>(null)

  useEffect(() => {
    async function loadApplication() {
      const application = await getApplication(applicationId)
      if (application) {
        setInitialData({
          incomeYearStart: new Date(application.incomeYearStart),
          incomeYearEnd: new Date(application.incomeYearEnd),
          ausIndustryNumber: application.ausIndustryNumber || "",
          registrationStatus: application.registrationStatus,
          registrationDate: application.registrationDate
            ? new Date(application.registrationDate)
            : undefined,
        })
      }
    }
    loadApplication()
  }, [applicationId])

  const handleSubmit = async (data: ApplicationFormData) => {
    setIsLoading(true)
    try {
      const result = await updateApplication(applicationId, data, clientId)
      if (!result.success) {
        throw new Error(result.error)
      }
      router.push(`/clients/${clientId}/applications/${applicationId}`)
    } finally {
      setIsLoading(false)
    }
  }

  if (!initialData) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading application...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/clients/${clientId}/applications/${applicationId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Application</h1>
          <p className="text-muted-foreground">Update application details</p>
        </div>
      </div>

      <ApplicationForm
        initialData={initialData}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  )
}
