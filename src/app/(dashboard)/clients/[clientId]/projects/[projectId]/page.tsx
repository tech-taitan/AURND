import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  Beaker,
  CheckCircle,
  Edit,
  FolderKanban,
  Plus,
  XCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AiReviewWrapper } from "@/components/ai/ai-review-wrapper"
import { getProject } from "@/actions/projects"
import { getActivityStats } from "@/actions/activities"
import { activityService } from "@/services/activity.service"

interface PageProps {
  params: Promise<{ clientId: string; projectId: string }>
}

function getActivityTypeBadge(type: string) {
  switch (type) {
    case "CORE":
      return <Badge>Core</Badge>
    case "SUPPORTING_DIRECT":
      return <Badge variant="secondary">Supporting (Direct)</Badge>
    case "SUPPORTING_DOMINANT_PURPOSE":
      return <Badge variant="outline">Supporting (Dominant Purpose)</Badge>
    default:
      return <Badge variant="outline">{type}</Badge>
  }
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { clientId, projectId } = await params
  const [project, stats] = await Promise.all([
    getProject(projectId),
    getActivityStats(projectId),
  ])

  if (!project) {
    notFound()
  }

  // Validate HEC for each activity
  const activitiesWithValidation = await Promise.all(
    project.activities.map(async (activity) => {
      const validation = activityService.validateHECFramework(activity)
      return { ...activity, validation }
    })
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/clients/${clientId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <FolderKanban className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{project.projectName}</h1>
              {project.projectCode && (
                <p className="text-sm text-muted-foreground">
                  {project.projectCode}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AiReviewWrapper
            projectId={projectId}
            activityId={project.activities[0]?.id}
          />
          <Button variant="outline" asChild>
            <Link href={`/clients/${clientId}/projects/${projectId}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Project
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={
                project.status === "ACTIVE"
                  ? "default"
                  : project.status === "COMPLETED"
                  ? "secondary"
                  : "outline"
              }
            >
              {project.status}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.core} core, {stats.supportingDirect + stats.supportingDominant} supporting
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Quality Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgQualityScore.toFixed(1)}/10
            </div>
            <p className="text-xs text-muted-foreground">
              H-E-C documentation quality
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overseas Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overseas}</div>
            <p className="text-xs text-muted-foreground">
              Require overseas finding
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Project Description */}
      <Card>
        <CardHeader>
          <CardTitle>Project Description</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">{project.projectDescription}</p>

          {(project.technicalHypothesis ||
            project.methodology ||
            project.technicalUncertainty ||
            project.expectedOutcome) && (
            <div className="grid gap-4 pt-4 md:grid-cols-2">
              {project.technicalHypothesis && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Technical Hypothesis
                  </p>
                  <p className="mt-1 text-sm">{project.technicalHypothesis}</p>
                </div>
              )}
              {project.technicalUncertainty && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Technical Uncertainty
                  </p>
                  <p className="mt-1 text-sm">{project.technicalUncertainty}</p>
                </div>
              )}
              {project.methodology && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Methodology
                  </p>
                  <p className="mt-1 text-sm">{project.methodology}</p>
                </div>
              )}
              {project.expectedOutcome && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Expected Outcome
                  </p>
                  <p className="mt-1 text-sm">{project.expectedOutcome}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activities */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Beaker className="h-5 w-5" />
              R&D Activities
            </CardTitle>
            <CardDescription>
              Core and supporting activities for this project
            </CardDescription>
          </div>
          <Button asChild>
            <Link
              href={`/clients/${clientId}/projects/${projectId}/activities/new`}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Activity
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {activitiesWithValidation.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Beaker className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                No activities yet. Add your first R&D activity.
              </p>
              <Button asChild className="mt-4" variant="outline">
                <Link
                  href={`/clients/${clientId}/projects/${projectId}/activities/new`}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Activity
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>H-E-C Status</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Overseas</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activitiesWithValidation.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <div className="font-medium">{activity.activityName}</div>
                      <div className="max-w-md truncate text-xs text-muted-foreground">
                        {activity.activityDescription}
                      </div>
                    </TableCell>
                    <TableCell>{getActivityTypeBadge(activity.activityType)}</TableCell>
                    <TableCell>
                      {activity.validation.isValid ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-xs">Complete</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-amber-600">
                          <XCircle className="h-4 w-4" />
                          <span className="text-xs">
                            {activity.validation.missingFields.length} missing
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          activity.validation.qualityScore >= 8
                            ? "default"
                            : activity.validation.qualityScore >= 5
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {activity.validation.qualityScore}/10
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {activity.isOverseasActivity ? (
                        <Badge variant="outline">Yes</Badge>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={`/clients/${clientId}/projects/${projectId}/activities/${activity.id}`}
                        >
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
