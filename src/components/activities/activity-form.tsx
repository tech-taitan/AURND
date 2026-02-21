"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, HelpCircle, Lightbulb } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AiReviewFormWrapper } from "@/components/ai/ai-review-form-wrapper"
import { activityFormSchema, type ActivityFormData } from "@/schemas/project.schema"

interface ActivityFormProps {
  initialData?: Partial<ActivityFormData>
  coreActivities?: Array<{ id: string; name: string }> // For linking supporting activities
  onSubmit: (data: ActivityFormData) => Promise<void>
  isLoading?: boolean
  /** Project ID for AI review */
  projectId?: string
  /** Activity ID for AI review (when editing) */
  activityId?: string
}

const activityTypeInfo = {
  CORE: {
    title: "Core R&D Activity",
    description:
      "Experimental activities whose outcome cannot be known or determined in advance on the basis of current knowledge, information or experience.",
    requirements: [
      "Must be based on principles of established science",
      "Outcome cannot be determined in advance by a competent professional",
      "Must proceed from hypothesis to experiment to observation to evaluation",
      "Must generate new knowledge",
    ],
  },
  SUPPORTING_DIRECT: {
    title: "Supporting Activity (Directly Related)",
    description:
      "Activities directly related to core R&D activities that are undertaken for the dominant purpose of supporting those activities.",
    requirements: [
      "Must be directly related to one or more core R&D activities",
      "Cannot produce goods or services (unless dominant purpose is supporting core R&D)",
    ],
  },
  SUPPORTING_DOMINANT_PURPOSE: {
    title: "Supporting Activity (Dominant Purpose)",
    description:
      "Activities undertaken for the dominant purpose of supporting core R&D activities, even if they produce goods or services.",
    requirements: [
      "Must have dominant purpose of supporting core R&D activities",
      "Documentation must demonstrate the dominant purpose test is satisfied",
    ],
  },
}

export function ActivityForm({
  initialData,
  coreActivities = [],
  onSubmit,
  isLoading,
  projectId,
  activityId,
}: ActivityFormProps) {
  const [error, setError] = useState<string | null>(null)

  const form = useForm<ActivityFormData>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      activityName: initialData?.activityName ?? "",
      activityType: initialData?.activityType ?? "CORE",
      activityDescription: initialData?.activityDescription ?? "",
      hypothesis: initialData?.hypothesis ?? "",
      experiment: initialData?.experiment ?? "",
      observation: initialData?.observation ?? "",
      evaluation: initialData?.evaluation ?? "",
      conclusion: initialData?.conclusion ?? "",
      relatedCoreActivityId: initialData?.relatedCoreActivityId ?? "",
      dominantPurpose: initialData?.dominantPurpose ?? "",
      isOverseasActivity: initialData?.isOverseasActivity ?? false,
      overseasFindingId: initialData?.overseasFindingId ?? "",
    },
  })

  const activityType = form.watch("activityType")
  const isCore = activityType === "CORE"
  const isSupporting = activityType?.startsWith("SUPPORTING")
  const needsDominantPurpose = activityType === "SUPPORTING_DOMINANT_PURPOSE"
  const typeInfo = activityTypeInfo[activityType as keyof typeof activityTypeInfo]

  const handleSubmit = async (data: ActivityFormData) => {
    try {
      setError(null)
      await onSubmit(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {/* AI Review Button */}
      {projectId && (
        <div className="flex justify-end">
          <AiReviewFormWrapper
            projectId={projectId}
            activityId={activityId}
            form={form}
          />
        </div>
      )}

      {/* Activity Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Type</CardTitle>
          <CardDescription>
            Select the type of R&D activity you are documenting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="activityType">Activity Type *</Label>
            <Select
              value={activityType}
              onValueChange={(value) =>
                form.setValue("activityType", value as ActivityFormData["activityType"])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select activity type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CORE">Core R&D Activity</SelectItem>
                <SelectItem value="SUPPORTING_DIRECT">
                  Supporting Activity (Directly Related)
                </SelectItem>
                <SelectItem value="SUPPORTING_DOMINANT_PURPOSE">
                  Supporting Activity (Dominant Purpose)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {typeInfo && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-start gap-3">
                <HelpCircle className="mt-0.5 h-5 w-5 text-primary" />
                <div className="space-y-2">
                  <p className="font-medium">{typeInfo.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {typeInfo.description}
                  </p>
                  <div className="mt-2">
                    <p className="text-sm font-medium">Requirements:</p>
                    <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
                      {typeInfo.requirements.map((req, i) => (
                        <li key={i}>{req}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Details</CardTitle>
          <CardDescription>
            Provide a clear name and description for this R&D activity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="activityName">Activity Name *</Label>
            <Input
              id="activityName"
              {...form.register("activityName")}
              placeholder="e.g., Development of novel machine learning algorithm for defect detection"
            />
            {form.formState.errors.activityName && (
              <p className="text-sm text-destructive">
                {form.formState.errors.activityName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="activityDescription">Activity Description *</Label>
            <Textarea
              id="activityDescription"
              {...form.register("activityDescription")}
              placeholder="Describe the activity in detail, including what work was undertaken and why..."
              rows={4}
            />
            {form.formState.errors.activityDescription && (
              <p className="text-sm text-destructive">
                {form.formState.errors.activityDescription.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Minimum 50 characters. Provide sufficient detail to demonstrate eligibility.
            </p>
          </div>

          {/* Supporting Activity: Link to Core Activity */}
          {isSupporting && (
            <div className="space-y-2">
              <Label htmlFor="relatedCoreActivityId">Related Core Activity *</Label>
              <Select
                value={form.watch("relatedCoreActivityId")}
                onValueChange={(value) =>
                  form.setValue("relatedCoreActivityId", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select the core activity this supports" />
                </SelectTrigger>
                <SelectContent>
                  {coreActivities.length > 0 ? (
                    coreActivities.map((activity) => (
                      <SelectItem key={activity.id} value={activity.id}>
                        {activity.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      No core activities available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Supporting activities must be linked to at least one core R&D activity.
              </p>
            </div>
          )}

          {/* Dominant Purpose Test */}
          {needsDominantPurpose && (
            <div className="space-y-2">
              <Label htmlFor="dominantPurpose">Dominant Purpose Justification *</Label>
              <Textarea
                id="dominantPurpose"
                {...form.register("dominantPurpose")}
                placeholder="Explain why the dominant purpose of this activity is to support core R&D activities, rather than to produce goods or services..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Required for supporting activities that may produce goods or services.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scientific Method Documentation (Core Activities) */}
      {isCore && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Systematic Progression Documentation
            </CardTitle>
            <CardDescription>
              Core R&D activities must demonstrate a systematic progression from
              hypothesis to experiment to observation to evaluation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium">Documentation Tips</p>
                  <p className="mt-1">
                    Well-documented activities are more likely to be accepted by
                    AusIndustry. Be specific about the technical uncertainty and
                    how you systematically investigated it.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hypothesis">Hypothesis</Label>
              <Textarea
                id="hypothesis"
                {...form.register("hypothesis")}
                placeholder="What technical hypothesis were you testing? What did you expect to find?"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                The technical question or theory being investigated.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="experiment">Experiment / Investigation</Label>
              <Textarea
                id="experiment"
                {...form.register("experiment")}
                placeholder="Describe the experimental or investigative work undertaken to test the hypothesis..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                The systematic work undertaken to test the hypothesis.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observation">Observation / Results</Label>
              <Textarea
                id="observation"
                {...form.register("observation")}
                placeholder="What results or observations were recorded during the experimental work?"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Documented results from the experimental activities.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="evaluation">Evaluation</Label>
              <Textarea
                id="evaluation"
                {...form.register("evaluation")}
                placeholder="How were the results evaluated? What analysis was performed?"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Analysis and assessment of the experimental results.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="conclusion">Conclusion</Label>
              <Textarea
                id="conclusion"
                {...form.register("conclusion")}
                placeholder="What conclusions were drawn? What new knowledge was generated?"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Logical conclusions based on the evaluation, including new knowledge generated.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overseas Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Overseas Activities</CardTitle>
          <CardDescription>
            Activities conducted outside Australia require an Overseas Finding from AusIndustry
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              {...form.register("isOverseasActivity")}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm">This activity is conducted overseas</span>
          </label>

          {form.watch("isOverseasActivity") && (
            <div className="space-y-2">
              <Label htmlFor="overseasFindingId">Overseas Finding ID</Label>
              <Input
                id="overseasFindingId"
                {...form.register("overseasFindingId")}
                placeholder="Enter the AusIndustry Overseas Finding reference number"
              />
              <p className="text-xs text-muted-foreground">
                Required for overseas activities to be eligible for the R&D Tax Incentive.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Activity"}
        </Button>
      </div>
    </form>
  )
}
