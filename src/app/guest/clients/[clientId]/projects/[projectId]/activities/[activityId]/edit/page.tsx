"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { useGuestMode } from "@/components/providers/guest-mode-provider"
import { ActivityForm } from "@/components/activities/activity-form"
import type { ActivityFormData } from "@/schemas/project.schema"

export default function GuestEditActivityPage({
  params,
}: {
  params: Promise<{ clientId: string; projectId: string; activityId: string }>
}) {
  const { clientId, projectId, activityId } = use(params)
  const router = useRouter()
  const { guestService, refreshData } = useGuestMode()

  const activityResult = guestService.getActivity(activityId)
  if (!activityResult.success) {
    router.push(`/guest/clients/${clientId}/projects/${projectId}`)
    return null
  }

  const activity = activityResult.data
  const coreActivities = guestService
    .getCoreActivities(projectId)
    .filter((a) => a.id !== activityId)
    .map((a) => ({ id: a.id, name: a.activityName }))

  const handleSubmit = async (data: ActivityFormData) => {
    const result = guestService.updateActivity(activityId, data)
    if (!result.success) throw new Error(result.error)
    refreshData()
    router.push(`/guest/clients/${clientId}/projects/${projectId}/activities/${activityId}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Activity</h1>
        <p className="text-muted-foreground">Update {activity.activityName}</p>
      </div>
      <ActivityForm
        initialData={{
          activityName: activity.activityName,
          activityType: activity.activityType as "CORE" | "SUPPORTING_DIRECT" | "SUPPORTING_DOMINANT_PURPOSE",
          activityDescription: activity.activityDescription,
          hypothesis: activity.hypothesis,
          experiment: activity.experiment,
          observation: activity.observation,
          evaluation: activity.evaluation,
          conclusion: activity.conclusion,
          relatedCoreActivityId: activity.relatedCoreActivityId,
          dominantPurpose: activity.dominantPurpose,
          isOverseasActivity: activity.isOverseasActivity,
          overseasFindingId: activity.overseasFindingId,
        }}
        coreActivities={coreActivities}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
