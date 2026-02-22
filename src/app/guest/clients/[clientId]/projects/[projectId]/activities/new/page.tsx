"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { useGuestMode } from "@/components/providers/guest-mode-provider"
import { ActivityForm } from "@/components/activities/activity-form"
import type { ActivityFormData } from "@/schemas/project.schema"

export default function GuestNewActivityPage({
  params,
}: {
  params: Promise<{ clientId: string; projectId: string }>
}) {
  const { clientId, projectId } = use(params)
  const router = useRouter()
  const { guestService, refreshData } = useGuestMode()

  const coreActivities = guestService
    .getCoreActivities(projectId)
    .map((a) => ({ id: a.id, name: a.activityName }))

  const handleSubmit = async (data: ActivityFormData) => {
    const result = guestService.createActivity(projectId, {
      activityName: data.activityName,
      activityType: data.activityType,
      activityDescription: data.activityDescription,
      hypothesis: data.hypothesis,
      experiment: data.experiment,
      observation: data.observation,
      evaluation: data.evaluation,
      conclusion: data.conclusion,
      relatedCoreActivityId: data.relatedCoreActivityId,
      dominantPurpose: data.dominantPurpose,
      isOverseasActivity: data.isOverseasActivity,
      overseasFindingId: data.overseasFindingId,
    })

    if (!result.success) throw new Error(result.error)
    refreshData()
    router.push(`/guest/clients/${clientId}/projects/${projectId}/activities/${result.data.id}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add New Activity</h1>
        <p className="text-muted-foreground">Document an R&D activity</p>
      </div>
      <ActivityForm
        coreActivities={coreActivities}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
