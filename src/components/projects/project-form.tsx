"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

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
import { projectFormSchema, type ProjectFormData } from "@/schemas/project.schema"

interface ProjectFormProps {
  initialData?: Partial<ProjectFormData>
  onSubmit: (data: ProjectFormData) => Promise<void>
  isLoading?: boolean
}

export function ProjectForm({ initialData, onSubmit, isLoading }: ProjectFormProps) {
  const [error, setError] = useState<string | null>(null)

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      projectName: initialData?.projectName ?? "",
      projectCode: initialData?.projectCode ?? "",
      status: initialData?.status ?? "ACTIVE",
      projectDescription: initialData?.projectDescription ?? "",
      technicalHypothesis: initialData?.technicalHypothesis ?? "",
      methodology: initialData?.methodology ?? "",
      technicalUncertainty: initialData?.technicalUncertainty ?? "",
      expectedOutcome: initialData?.expectedOutcome ?? "",
      industryCode: initialData?.industryCode ?? "",
      fieldOfResearch: initialData?.fieldOfResearch ?? "",
    },
  })

  const handleSubmit = async (data: ProjectFormData) => {
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

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
          <CardDescription>
            Basic details about the R&D project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name *</Label>
              <Input
                id="projectName"
                {...form.register("projectName")}
                placeholder="AI-Powered Quality Control System"
              />
              {form.formState.errors.projectName && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.projectName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectCode">Project Code</Label>
              <Input
                id="projectCode"
                {...form.register("projectCode")}
                placeholder="PRJ-001"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(value) =>
                  form.setValue("status", value as ProjectFormData["status"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANNING">Planning</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="ABANDONED">Abandoned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                {...form.register("startDate")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                {...form.register("endDate")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectDescription">Project Description *</Label>
            <Textarea
              id="projectDescription"
              {...form.register("projectDescription")}
              placeholder="Describe the overall objectives and scope of the R&D project..."
              rows={4}
            />
            {form.formState.errors.projectDescription && (
              <p className="text-sm text-destructive">
                {form.formState.errors.projectDescription.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Minimum 50 characters. Describe what the project aims to achieve.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Technical Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Documentation</CardTitle>
          <CardDescription>
            Document the scientific or technical aspects of the R&D work.
            This information supports the eligibility of your R&D activities.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="technicalHypothesis">Technical Hypothesis</Label>
            <Textarea
              id="technicalHypothesis"
              {...form.register("technicalHypothesis")}
              placeholder="What hypothesis or theory are you testing? What do you expect to find out?"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Describe the core scientific/technical question you are investigating.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="technicalUncertainty">Technical Uncertainty</Label>
            <Textarea
              id="technicalUncertainty"
              {...form.register("technicalUncertainty")}
              placeholder="What technical uncertainties exist? Why couldn't the outcome be determined in advance by a competent professional?"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Core R&D activities must involve outcomes that cannot be known in advance.
              Explain what makes this work genuinely uncertain.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="methodology">Methodology</Label>
            <Textarea
              id="methodology"
              {...form.register("methodology")}
              placeholder="Describe the systematic progression of work: How will you proceed from hypothesis to experiment to observation to evaluation?"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              R&D activities must proceed systematically. Describe your experimental approach.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectedOutcome">Expected Outcome</Label>
            <Textarea
              id="expectedOutcome"
              {...form.register("expectedOutcome")}
              placeholder="What new knowledge do you expect to generate? How will this advance the field?"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Eligible R&D must generate new knowledge in the form of new or improved
              materials, products, devices, processes, or services.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Classification */}
      <Card>
        <CardHeader>
          <CardTitle>Classification</CardTitle>
          <CardDescription>
            Industry and research field classification (optional)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="industryCode">ANZSIC Industry Code</Label>
              <Input
                id="industryCode"
                {...form.register("industryCode")}
                placeholder="e.g., 2411 - Motor Vehicle Manufacturing"
              />
              <p className="text-xs text-muted-foreground">
                Australian and New Zealand Standard Industrial Classification code
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fieldOfResearch">Field of Research (FOR) Code</Label>
              <Input
                id="fieldOfResearch"
                {...form.register("fieldOfResearch")}
                placeholder="e.g., 4601 - Applied Computing"
              />
              <p className="text-xs text-muted-foreground">
                Australian and New Zealand Standard Research Classification code
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Project"}
        </Button>
      </div>
    </form>
  )
}
