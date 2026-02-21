"use client"

import { useRouter } from "next/navigation"
import { use, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ProjectForm } from "@/components/projects/project-form"
import { createProject } from "@/actions/projects"
import type { ProjectFormData } from "@/schemas/project.schema"

interface PageProps {
  params: Promise<{ clientId: string }>
}

export default function NewProjectPage({ params }: PageProps) {
  const { clientId } = use(params)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (data: ProjectFormData) => {
    setIsLoading(true)
    try {
      const result = await createProject(clientId, data)

      if (!result.success) {
        throw new Error(result.error)
      }

      router.push(`/clients/${clientId}/projects/${result.data.id}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/clients/${clientId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add New R&D Project</h1>
          <p className="text-muted-foreground">
            Create a new research and development project for this client
          </p>
        </div>
      </div>

      {/* Form */}
      <ProjectForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  )
}
