"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { useGuestMode } from "@/components/providers/guest-mode-provider"
import { ProjectForm } from "@/components/projects/project-form"
import type { ProjectFormData } from "@/schemas/project.schema"

export default function GuestNewProjectPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params)
  const router = useRouter()
  const { guestService, refreshData } = useGuestMode()

  const handleSubmit = async (data: ProjectFormData) => {
    const result = guestService.createProject(clientId, {
      projectName: data.projectName,
      projectCode: data.projectCode,
      status: data.status,
      projectDescription: data.projectDescription,
      technicalHypothesis: data.technicalHypothesis,
      methodology: data.methodology,
      technicalUncertainty: data.technicalUncertainty,
      expectedOutcome: data.expectedOutcome,
      industryCode: data.industryCode,
      fieldOfResearch: data.fieldOfResearch,
      startDate: data.startDate,
      endDate: data.endDate,
    })

    if (!result.success) throw new Error(result.error)
    refreshData()
    router.push(`/guest/clients/${clientId}/projects/${result.data.id}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add New Project</h1>
        <p className="text-muted-foreground">Create a new R&D project</p>
      </div>
      <ProjectForm onSubmit={handleSubmit} />
    </div>
  )
}
