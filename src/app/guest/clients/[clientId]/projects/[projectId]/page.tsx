"use client"

import { use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Edit, Plus, Trash2, FolderKanban } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useGuestMode } from "@/components/providers/guest-mode-provider"

const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
  ACTIVE: "default",
  COMPLETED: "secondary",
  PLANNING: "secondary",
  ABANDONED: "destructive",
}

export default function GuestProjectDetailPage({
  params,
}: {
  params: Promise<{ clientId: string; projectId: string }>
}) {
  const { clientId, projectId } = use(params)
  const router = useRouter()
  const { guestService, refreshData, version } = useGuestMode()

  const projectResult = guestService.getProject(projectId)
  if (!projectResult.success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FolderKanban className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-medium">Project not found</h3>
        <Button asChild className="mt-4">
          <Link href={`/guest/clients/${clientId}`}>Back to Client</Link>
        </Button>
      </div>
    )
  }

  const project = projectResult.data
  const activities = guestService.listActivities(projectId)

  const handleDeleteProject = () => {
    if (!confirm("Delete this project and all its activities?")) return
    guestService.deleteProject(projectId)
    refreshData()
    router.push(`/guest/clients/${clientId}`)
  }

  const handleDeleteActivity = (activityId: string) => {
    if (!confirm("Delete this activity?")) return
    guestService.deleteActivity(activityId)
    refreshData()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{project.projectName}</h1>
          {project.projectCode && (
            <p className="text-muted-foreground font-mono">{project.projectCode}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/guest/clients/${clientId}/projects/${projectId}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button variant="destructive" size="icon" onClick={handleDeleteProject}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Project Info */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={statusColors[project.status] || "secondary"}>
                {project.status}
              </Badge>
            </div>
            {project.startDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Start Date</span>
                <span>{new Date(project.startDate).toLocaleDateString("en-AU")}</span>
              </div>
            )}
            {project.endDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">End Date</span>
                <span>{new Date(project.endDate).toLocaleDateString("en-AU")}</span>
              </div>
            )}
            {project.industryCode && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Industry Code</span>
                <span>{project.industryCode}</span>
              </div>
            )}
            {project.fieldOfResearch && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Field of Research</span>
                <span>{project.fieldOfResearch}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{project.projectDescription}</p>
          </CardContent>
        </Card>
      </div>

      {/* Technical Documentation */}
      {(project.technicalHypothesis || project.methodology || project.technicalUncertainty || project.expectedOutcome) && (
        <Card>
          <CardHeader>
            <CardTitle>Technical Documentation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {project.technicalHypothesis && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Technical Hypothesis</h4>
                <p className="text-sm whitespace-pre-wrap">{project.technicalHypothesis}</p>
              </div>
            )}
            {project.technicalUncertainty && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Technical Uncertainty</h4>
                <p className="text-sm whitespace-pre-wrap">{project.technicalUncertainty}</p>
              </div>
            )}
            {project.methodology && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Methodology</h4>
                <p className="text-sm whitespace-pre-wrap">{project.methodology}</p>
              </div>
            )}
            {project.expectedOutcome && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Expected Outcome</h4>
                <p className="text-sm whitespace-pre-wrap">{project.expectedOutcome}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Activities */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>R&D Activities</CardTitle>
            <CardDescription>{activities.length} activit{activities.length !== 1 ? "ies" : "y"}</CardDescription>
          </div>
          <Button asChild>
            <Link href={`/guest/clients/${clientId}/projects/${projectId}/activities/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Activity
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No activities yet. Add your first R&D activity.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>H-E-C</TableHead>
                  <TableHead>Overseas</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => {
                  const hecCount = [activity.hypothesis, activity.experiment, activity.conclusion].filter(Boolean).length
                  return (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">{activity.activityName}</TableCell>
                      <TableCell>
                        <Badge variant={activity.activityType === "CORE" ? "default" : "secondary"}>
                          {activity.activityType === "CORE" ? "Core" : activity.activityType === "SUPPORTING_DIRECT" ? "Supporting" : "Supporting (DP)"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {activity.activityType === "CORE" ? `${hecCount}/3` : "—"}
                      </TableCell>
                      <TableCell>{activity.isOverseasActivity ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/guest/clients/${clientId}/projects/${projectId}/activities/${activity.id}`}>
                              View
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteActivity(activity.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
