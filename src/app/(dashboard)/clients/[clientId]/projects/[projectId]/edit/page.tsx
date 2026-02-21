"use client"

import { useRouter } from "next/navigation"
import { use, useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ProjectForm } from "@/components/projects/project-form"
import { getProject, updateProject } from "@/actions/projects"
import type { ProjectFormData } from "@/schemas/project.schema"

interface PageProps {
  params: Promise<{ clientId: string; projectId: string }>
}

export default function EditProjectPage({ params }: PageProps) {
  const { clientId, projectId } = use(params)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [initialData, setInitialData] = useState<Partial<ProjectFormData> | null>(null)

  useEffect(() => {
    async function loadProject() {
      const project = await getProject(projectId)
      if (project) {
        setInitialData({
          projectName: project.projectName,
          projectCode: project.projectCode || undefined,
          status: project.status,
          projectDescription: project.projectDescription,
          technicalHypothesis: project.technicalHypothesis || undefined,
          methodology: project.methodology || undefined,
          technicalUncertainty: project.technicalUncertainty || undefined,
          expectedOutcome: project.expectedOutcome || undefined,
          industryCode: project.industryCode || undefined,
          fieldOfResearch: project.fieldOfResearch || undefined,
          startDate: project.startDate
            ? new Date(project.startDate).toISOString().split("T")[0]
            : undefined,
          endDate: project.endDate
            ? new Date(project.endDate).toISOString().split("T")[0]
            : undefined,
        })
      }
    }
    loadProject()
  }, [projectId])

  const handleSubmit = async (data: ProjectFormData) => {
    setIsLoading(true)
    try {
      const result = await updateProject(projectId, data, clientId)

      if (!result.success) {
        throw new Error(result.error)
      }

      router.push(`/clients/${clientId}/projects/${projectId}`)
    } finally {
      setIsLoading(false)
    }
  }

  if (!initialData) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading project...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/clients/${clientId}/projects/${projectId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Project</h1>
          <p className="text-muted-foreground">
            Update the project details and documentation
          </p>
        </div>
      </div>

      {/* Form */}
      <ProjectForm
        initialData={initialData}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  )
}
