"use client"

import { useRouter } from "next/navigation"
import { use, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ExpenditureForm } from "@/components/expenditure/expenditure-form"
import { createExpenditure } from "@/actions/expenditures"
import { getProjectsByClient } from "@/actions/projects"
import { getActivitiesByClient } from "@/actions/activities"
import type { ExpenditureFormData } from "@/schemas/expenditure.schema"

interface PageProps {
  params: Promise<{ clientId: string; applicationId: string }>
}

export default function NewExpenditurePage({ params }: PageProps) {
  const { clientId, applicationId } = use(params)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const [activities, setActivities] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    async function loadOptions() {
      const [projectList, activityList] = await Promise.all([
        getProjectsByClient(clientId),
        getActivitiesByClient(clientId),
      ])

      setProjects(
        projectList.map((project) => ({
          id: project.id,
          name: project.projectName,
        }))
      )

      setActivities(
        activityList.map((activity) => ({
          id: activity.id,
          name: activity.activityName,
        }))
      )
    }

    loadOptions()
  }, [clientId])

  const handleSubmit = async (data: ExpenditureFormData) => {
    setIsLoading(true)
    try {
      const result = await createExpenditure(applicationId, data, clientId)
      if (!result.success) {
        throw new Error(result.error)
      }
      router.push(`/clients/${clientId}/applications/${applicationId}/expenditures`)
    } finally {
      setIsLoading(false)
    }
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
          <h1 className="text-3xl font-bold">Add Expenditure</h1>
          <p className="text-muted-foreground">
            Record an eligible R&D expenditure item
          </p>
        </div>
      </div>

      <ExpenditureForm
        projects={projects}
        activities={activities}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  )
}
