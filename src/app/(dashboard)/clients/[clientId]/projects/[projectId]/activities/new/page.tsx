"use client"

import { useRouter } from "next/navigation"
import { use, useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ActivityForm } from "@/components/activities/activity-form"
import { createActivity } from "@/actions/activities"
import { getCoreActivities } from "@/actions/activities"
import type { ActivityFormData } from "@/schemas/project.schema"

interface PageProps {
  params: Promise<{ clientId: string; projectId: string }>
}

export default function NewActivityPage({ params }: PageProps) {
  const { clientId, projectId } = use(params)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [coreActivities, setCoreActivities] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    async function loadCoreActivities() {
      const activities = await getCoreActivities(projectId)
      setCoreActivities(
        activities.map((a) => ({ id: a.id, name: a.activityName }))
      )
    }
    loadCoreActivities()
  }, [projectId])

  const handleSubmit = async (data: ActivityFormData) => {
    setIsLoading(true)
    try {
      const result = await createActivity(projectId, data, clientId)

      if (!result.success) {
        throw new Error(result.error)
      }

      router.push(`/clients/${clientId}/projects/${projectId}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/clients/${clientId}/projects/${projectId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add R&D Activity</h1>
          <p className="text-muted-foreground">
            Document a core or supporting R&D activity for this project
          </p>
        </div>
      </div>

      {/* Form */}
      <ActivityForm
        coreActivities={coreActivities}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        projectId={projectId}
      />
    </div>
  )
}
