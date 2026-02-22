"use client"

import { use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Edit, Trash2, CheckCircle, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useGuestMode } from "@/components/providers/guest-mode-provider"

export default function GuestActivityDetailPage({
  params,
}: {
  params: Promise<{ clientId: string; projectId: string; activityId: string }>
}) {
  const { clientId, projectId, activityId } = use(params)
  const router = useRouter()
  const { guestService, refreshData, version } = useGuestMode()

  const activityResult = guestService.getActivity(activityId)
  if (!activityResult.success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="mt-4 text-lg font-medium">Activity not found</h3>
        <Button asChild className="mt-4">
          <Link href={`/guest/clients/${clientId}/projects/${projectId}`}>Back to Project</Link>
        </Button>
      </div>
    )
  }

  const activity = activityResult.data
  const isCore = activity.activityType === "CORE"

  const handleDelete = () => {
    if (!confirm("Delete this activity?")) return
    guestService.deleteActivity(activityId)
    refreshData()
    router.push(`/guest/clients/${clientId}/projects/${projectId}`)
  }

  const hecFields = [
    { label: "Hypothesis", value: activity.hypothesis },
    { label: "Experiment", value: activity.experiment },
    { label: "Observation", value: activity.observation },
    { label: "Evaluation", value: activity.evaluation },
    { label: "Conclusion", value: activity.conclusion },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{activity.activityName}</h1>
          <Badge
            variant={isCore ? "default" : "secondary"}
            className="mt-2"
          >
            {activity.activityType === "CORE"
              ? "Core R&D Activity"
              : activity.activityType === "SUPPORTING_DIRECT"
              ? "Supporting (Direct)"
              : "Supporting (Dominant Purpose)"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/guest/clients/${clientId}/projects/${projectId}/activities/${activityId}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button variant="destructive" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{activity.activityDescription}</p>
        </CardContent>
      </Card>

      {/* H-E-C Documentation (Core) */}
      {isCore && (
        <Card>
          <CardHeader>
            <CardTitle>Systematic Progression (H-E-C)</CardTitle>
            <CardDescription>
              Documentation of hypothesis, experiment, and conclusion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hecFields.map((field) => (
              <div key={field.label}>
                <div className="flex items-center gap-2 mb-1">
                  {field.value ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <h4 className="text-sm font-medium">{field.label}</h4>
                </div>
                {field.value ? (
                  <p className="text-sm whitespace-pre-wrap ml-6">{field.value}</p>
                ) : (
                  <p className="text-sm text-muted-foreground ml-6">Not documented</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Dominant Purpose */}
      {activity.activityType === "SUPPORTING_DOMINANT_PURPOSE" && activity.dominantPurpose && (
        <Card>
          <CardHeader>
            <CardTitle>Dominant Purpose Justification</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{activity.dominantPurpose}</p>
          </CardContent>
        </Card>
      )}

      {/* Overseas Info */}
      {activity.isOverseasActivity && (
        <Card>
          <CardHeader>
            <CardTitle>Overseas Activity</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>This activity is conducted overseas.</p>
            {activity.overseasFindingId && (
              <p className="mt-1">
                <span className="text-muted-foreground">Finding ID: </span>
                {activity.overseasFindingId}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
