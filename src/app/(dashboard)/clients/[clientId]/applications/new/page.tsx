"use client"

import { useRouter } from "next/navigation"
import { use, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ApplicationForm } from "@/components/applications/application-form"
import { createApplication } from "@/actions/applications"
import type { ApplicationFormData } from "@/schemas/application.schema"

interface PageProps {
  params: Promise<{ clientId: string }>
}

export default function NewApplicationPage({ params }: PageProps) {
  const { clientId } = use(params)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (data: ApplicationFormData) => {
    setIsLoading(true)
    try {
      const result = await createApplication(clientId, data)
      if (!result.success) {
        throw new Error(result.error)
      }
      router.push(`/clients/${clientId}/applications/${result.data.id}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/clients/${clientId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Application</h1>
          <p className="text-muted-foreground">Create an income year application</p>
        </div>
      </div>

      <ApplicationForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  )
}
