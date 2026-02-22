"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { useGuestMode } from "@/components/providers/guest-mode-provider"
import { ProjectForm } from "@/components/projects/project-form"
import type { ProjectFormData } from "@/schemas/project.schema"

export default function GuestEditProjectPage({
  params,
}: {
  params: Promise<{ clientId: string; projectId: string }>
}) {
  const { clientId, projectId } = use(params)
  const router = useRouter()
  const { guestService, refreshData } = useGuestMode()

  const projectResult = guestService.getProject(projectId)
  if (!projectResult.success) {
    router.push(`/guest/clients/${clientId}`)
    return null
  }

  const project = projectResult.data

  const handleSubmit = async (data: ProjectFormData) => {
    const result = guestService.updateProject(projectId, data)
    if (!result.success) throw new Error(result.error)
    refreshData()
    router.push(`/guest/clients/${clientId}/projects/${projectId}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Project</h1>
        <p className="text-muted-foreground">Update {project.projectName}</p>
      </div>
      <ProjectForm
        initialData={{
          projectName: project.projectName,
          projectCode: project.projectCode,
          status: project.status as "PLANNING" | "ACTIVE" | "COMPLETED" | "ABANDONED",
          projectDescription: project.projectDescription,
          technicalHypothesis: project.technicalHypothesis,
          methodology: project.methodology,
          technicalUncertainty: project.technicalUncertainty,
          expectedOutcome: project.expectedOutcome,
          industryCode: project.industryCode,
          fieldOfResearch: project.fieldOfResearch,
          startDate: project.startDate,
          endDate: project.endDate,
        }}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
