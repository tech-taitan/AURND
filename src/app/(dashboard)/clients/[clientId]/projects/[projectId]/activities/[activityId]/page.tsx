import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  Beaker,
  CheckCircle,
  Edit,
  ExternalLink,
  Lightbulb,
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
import { AiReviewWrapper } from "@/components/ai/ai-review-wrapper"
import { AiAssistedBadge } from "@/components/ai/ai-assisted-badge"
import { getActivity, validateActivityHEC } from "@/actions/activities"

interface PageProps {
  params: Promise<{ clientId: string; projectId: string; activityId: string }>
}

function getActivityTypeBadge(type: string) {
  switch (type) {
    case "CORE":
      return <Badge>Core R&D Activity</Badge>
    case "SUPPORTING_DIRECT":
      return <Badge variant="secondary">Supporting Activity (Direct)</Badge>
    case "SUPPORTING_DOMINANT_PURPOSE":
      return <Badge variant="outline">Supporting Activity (Dominant Purpose)</Badge>
    default:
      return <Badge variant="outline">{type}</Badge>
  }
}

export default async function ActivityDetailPage({ params }: PageProps) {
  const { clientId, projectId, activityId } = await params
  const activity = await getActivity(activityId)

  if (!activity) {
    notFound()
  }

  const validation = await validateActivityHEC(activity)
  const isCore = activity.activityType === "CORE"

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/clients/${clientId}/projects/${projectId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Beaker className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{activity.activityName}</h1>
              <div className="flex items-center gap-2">
                {getActivityTypeBadge(activity.activityType)}
                <AiAssistedBadge fieldName="activityType" aiGeneratedFields={activity.aiGeneratedFields} />
                {activity.isOverseasActivity && (
                  <Badge variant="outline">Overseas</Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AiReviewWrapper
            projectId={projectId}
            activityId={activityId}
          />
          <Button variant="outline" asChild>
            <Link
              href={`/clients/${clientId}/projects/${projectId}/activities/${activityId}/edit`}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Activity
            </Link>
          </Button>
        </div>
      </div>

      {/* Validation Summary */}
      <Card
        className={
          validation.isValid
            ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
            : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950"
        }
      >
        <CardContent className="flex items-start gap-4 pt-6">
          {validation.isValid ? (
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          ) : (
            <XCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="font-medium">
                {validation.isValid
                  ? "Documentation Complete"
                  : "Documentation Incomplete"}
              </p>
              <Badge
                variant={
                  validation.qualityScore >= 8
                    ? "default"
                    : validation.qualityScore >= 5
                    ? "secondary"
                    : "outline"
                }
              >
                Quality Score: {validation.qualityScore}/10
              </Badge>
            </div>
            {validation.missingFields.length > 0 && (
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                Missing fields: {validation.missingFields.join(", ")}
              </p>
            )}
            {validation.suggestions.length > 0 && (
              <ul className="mt-2 space-y-1">
                {validation.suggestions.map((suggestion, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
                    {suggestion}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity Description */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{activity.activityDescription}</p>
        </CardContent>
      </Card>

      {/* Related Core Activity (for supporting activities) */}
      {activity.relatedCoreActivity && (
        <Card>
          <CardHeader>
            <CardTitle>Related Core Activity</CardTitle>
            <CardDescription>
              This supporting activity is linked to the following core R&D activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">{activity.relatedCoreActivity.activityName}</p>
                <Badge className="mt-1">Core</Badge>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link
                  href={`/clients/${clientId}/projects/${projectId}/activities/${activity.relatedCoreActivity.id}`}
                >
                  View
                  <ExternalLink className="ml-2 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supporting Activities (for core activities) */}
      {activity.supportingActivities && activity.supportingActivities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Supporting Activities</CardTitle>
            <CardDescription>
              Activities that support this core R&D activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activity.supportingActivities.map((supporting) => (
                <div
                  key={supporting.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{supporting.activityName}</p>
                    <Badge variant="secondary" className="mt-1">
                      {supporting.activityType === "SUPPORTING_DIRECT"
                        ? "Direct"
                        : "Dominant Purpose"}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link
                      href={`/clients/${clientId}/projects/${projectId}/activities/${supporting.id}`}
                    >
                      View
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dominant Purpose (for supporting dominant purpose activities) */}
      {activity.activityType === "SUPPORTING_DOMINANT_PURPOSE" &&
        activity.dominantPurpose && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Dominant Purpose Justification
                <AiAssistedBadge fieldName="dominantPurpose" aiGeneratedFields={activity.aiGeneratedFields} />
              </CardTitle>
              <CardDescription>
                Why the dominant purpose of this activity is to support core R&D
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{activity.dominantPurpose}</p>
            </CardContent>
          </Card>
        )}

      {/* H-E-C Documentation (for core activities) */}
      {isCore && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Systematic Progression Documentation
            </CardTitle>
            <CardDescription>
              Hypothesis → Experiment → Observation → Evaluation → Conclusion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    Hypothesis
                    <AiAssistedBadge fieldName="hypothesis" aiGeneratedFields={activity.aiGeneratedFields} />
                  </p>
                  {activity.hypothesis ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-amber-600" />
                  )}
                </div>
                <p className="text-sm">
                  {activity.hypothesis || (
                    <span className="italic text-muted-foreground">
                      Not documented
                    </span>
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    Experiment / Investigation
                    <AiAssistedBadge fieldName="experiment" aiGeneratedFields={activity.aiGeneratedFields} />
                  </p>
                  {activity.experiment ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-amber-600" />
                  )}
                </div>
                <p className="text-sm">
                  {activity.experiment || (
                    <span className="italic text-muted-foreground">
                      Not documented
                    </span>
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    Observation / Results
                    <AiAssistedBadge fieldName="observation" aiGeneratedFields={activity.aiGeneratedFields} />
                  </p>
                  {activity.observation ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-amber-600" />
                  )}
                </div>
                <p className="text-sm">
                  {activity.observation || (
                    <span className="italic text-muted-foreground">
                      Not documented
                    </span>
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    Evaluation
                    <AiAssistedBadge fieldName="evaluation" aiGeneratedFields={activity.aiGeneratedFields} />
                  </p>
                  {activity.evaluation ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-amber-600" />
                  )}
                </div>
                <p className="text-sm">
                  {activity.evaluation || (
                    <span className="italic text-muted-foreground">
                      Not documented
                    </span>
                  )}
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    Conclusion
                    <AiAssistedBadge fieldName="conclusion" aiGeneratedFields={activity.aiGeneratedFields} />
                  </p>
                  {activity.conclusion ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-amber-600" />
                  )}
                </div>
                <p className="text-sm">
                  {activity.conclusion || (
                    <span className="italic text-muted-foreground">
                      Not documented
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overseas Finding */}
      {activity.isOverseasActivity && (
        <Card>
          <CardHeader>
            <CardTitle>Overseas Activity</CardTitle>
            <CardDescription>
              This activity is conducted outside Australia
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activity.overseasFindingId ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">
                  Overseas Finding ID: <strong>{activity.overseasFindingId}</strong>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600">
                <XCircle className="h-4 w-4" />
                <span className="text-sm">
                  No overseas finding ID recorded. This is required for eligibility.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
