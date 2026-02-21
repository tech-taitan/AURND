"use client"

import { useRouter } from "next/navigation"
import { use, useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ActivityForm } from "@/components/activities/activity-form"
import { getActivity, updateActivity, getCoreActivities } from "@/actions/activities"
import type { ActivityFormData } from "@/schemas/project.schema"

interface PageProps {
  params: Promise<{ clientId: string; projectId: string; activityId: string }>
}

export default function EditActivityPage({ params }: PageProps) {
  const { clientId, projectId, activityId } = use(params)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [initialData, setInitialData] = useState<Partial<ActivityFormData> | null>(null)
  const [coreActivities, setCoreActivities] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    async function loadData() {
      const [activity, cores] = await Promise.all([
        getActivity(activityId),
        getCoreActivities(projectId),
      ])

      if (activity) {
        setInitialData({
          activityName: activity.activityName,
          activityType: activity.activityType,
          activityDescription: activity.activityDescription,
          hypothesis: activity.hypothesis || undefined,
          experiment: activity.experiment || undefined,
          observation: activity.observation || undefined,
          evaluation: activity.evaluation || undefined,
          conclusion: activity.conclusion || undefined,
          relatedCoreActivityId: activity.relatedCoreActivityId || undefined,
          dominantPurpose: activity.dominantPurpose || undefined,
          isOverseasActivity: activity.isOverseasActivity,
          overseasFindingId: activity.overseasFindingId || undefined,
        })
      }

      // Filter out current activity from core activities list
      setCoreActivities(
        cores
          .filter((a) => a.id !== activityId)
          .map((a) => ({ id: a.id, name: a.activityName }))
      )
    }
    loadData()
  }, [projectId, activityId])

  const handleSubmit = async (data: ActivityFormData) => {
    setIsLoading(true)
    try {
      const result = await updateActivity(activityId, data, projectId, clientId)

      if (!result.success) {
        throw new Error(result.error)
      }

      router.push(`/clients/${clientId}/projects/${projectId}/activities/${activityId}`)
    } finally {
      setIsLoading(false)
    }
  }

  if (!initialData) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading activity...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link
            href={`/clients/${clientId}/projects/${projectId}/activities/${activityId}`}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Activity</h1>
          <p className="text-muted-foreground">
            Update the activity details and H-E-C documentation
          </p>
        </div>
      </div>

      {/* Form */}
      <ActivityForm
        initialData={initialData}
        coreActivities={coreActivities}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        projectId={projectId}
        activityId={activityId}
      />
    </div>
  )
}
