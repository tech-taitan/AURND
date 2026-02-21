"use client"

import { useRouter } from "next/navigation"
import { use, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { TimeAllocationForm } from "@/components/staff/time-allocation-form"
import { createTimeAllocation } from "@/actions/time-allocations"
import { getStaffByClient } from "@/actions/staff"
import { getActivitiesByClient } from "@/actions/activities"
import type { TimeAllocationFormData } from "@/schemas/time-allocation.schema"

interface PageProps {
  params: Promise<{ clientId: string; staffId: string }>
}

export default function NewTimeAllocationPage({ params }: PageProps) {
  const { clientId, staffId } = use(params)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [staffOptions, setStaffOptions] = useState<
    Array<{ id: string; name: string; hourlyRate?: number | null }>
  >([])
  const [activityOptions, setActivityOptions] = useState<
    Array<{ id: string; name: string; projectName?: string }>
  >([])

  useEffect(() => {
    async function loadOptions() {
      const [staffList, activities] = await Promise.all([
        getStaffByClient(clientId),
        getActivitiesByClient(clientId),
      ])

      setStaffOptions(
        staffList.map((member) => ({
          id: member.id,
          name: member.name,
          hourlyRate: member.hourlyRate ? Number(member.hourlyRate) : null,
        }))
      )

      setActivityOptions(
        activities.map((activity) => ({
          id: activity.id,
          name: activity.activityName,
          projectName: activity.project.projectName,
        }))
      )
    }

    loadOptions()
  }, [clientId])

  const handleSubmit = async (data: TimeAllocationFormData) => {
    setIsLoading(true)
    try {
      const result = await createTimeAllocation(data, clientId, staffId)
      if (!result.success) {
        throw new Error(result.error)
      }
      router.push(`/clients/${clientId}/staff/${staffId}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/clients/${clientId}/staff/${staffId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Allocate Time</h1>
          <p className="text-muted-foreground">
            Assign staff hours to a specific R&D activity
          </p>
        </div>
      </div>

      <TimeAllocationForm
        initialData={{ staffMemberId: staffId }}
        staffOptions={staffOptions}
        activityOptions={activityOptions}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  )
}
