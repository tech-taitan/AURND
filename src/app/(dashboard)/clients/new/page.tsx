"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ClientForm } from "@/components/clients/client-form"
import { createClient } from "@/actions/clients"
import type { ClientFormData } from "@/schemas/client.schema"

export default function NewClientPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (data: ClientFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await createClient({
        companyName: data.companyName,
        abn: data.abn,
        acn: data.acn || undefined,
        tfn: data.tfn || undefined,
        incorporationType: data.incorporationType,
        isConsolidatedGroup: data.isConsolidatedGroup,
        isExemptControlled: data.isExemptControlled,
        aggregatedTurnover: data.aggregatedTurnover
          ? parseFloat(data.aggregatedTurnover)
          : undefined,
        contactName: data.contactName || undefined,
        contactEmail: data.contactEmail || undefined,
        contactPhone: data.contactPhone || undefined,
        incomeYearEndMonth: data.incomeYearEndMonth,
        incomeYearEndDay: data.incomeYearEndDay,
      })

      if (result.success) {
        router.push(`/clients/${result.data.id}`)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add New Client</h1>
          <p className="text-muted-foreground">
            Register a new company for R&D Tax Incentive applications
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {/* Form */}
      <ClientForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  )
}
