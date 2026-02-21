"use client"

import { useRouter } from "next/navigation"
import { use, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { TimeAllocationForm } from "@/components/staff/time-allocation-form"
import { updateTimeAllocation, getTimeAllocation } from "@/actions/time-allocations"
import { getStaffByClient } from "@/actions/staff"
import { getActivitiesByClient } from "@/actions/activities"
import type { TimeAllocationFormData } from "@/schemas/time-allocation.schema"

interface PageProps {
  params: Promise<{ clientId: string; staffId: string; allocationId: string }>
}

export default function EditTimeAllocationPage({ params }: PageProps) {
  const { clientId, staffId, allocationId } = use(params)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [initialData, setInitialData] = useState<Partial<TimeAllocationFormData> | null>(null)
  const [staffOptions, setStaffOptions] = useState<
    Array<{ id: string; name: string; hourlyRate?: number | null }>
  >([])
  const [activityOptions, setActivityOptions] = useState<
    Array<{ id: string; name: string; projectName?: string }>
  >([])

  useEffect(() => {
    async function loadData() {
      const [allocation, staffList, activities] = await Promise.all([
        getTimeAllocation(allocationId),
        getStaffByClient(clientId),
        getActivitiesByClient(clientId),
      ])

      if (allocation) {
        setInitialData({
          staffMemberId: allocation.staffMemberId,
          activityId: allocation.activityId,
          periodStart: new Date(allocation.periodStart).toISOString().slice(0, 10),
          periodEnd: new Date(allocation.periodEnd).toISOString().slice(0, 10),
          hoursAllocated: allocation.hoursAllocated.toString(),
          percentageOfTime: allocation.percentageOfTime
            ? allocation.percentageOfTime.toString()
            : "",
          description: allocation.description || "",
        })
      }

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

    loadData()
  }, [allocationId, clientId])

  const handleSubmit = async (data: TimeAllocationFormData) => {
    setIsLoading(true)
    try {
      const result = await updateTimeAllocation(
        allocationId,
        data,
        clientId,
        staffId
      )
      if (!result.success) {
        throw new Error(result.error)
      }
      router.push(`/clients/${clientId}/staff/${staffId}`)
    } finally {
      setIsLoading(false)
    }
  }

  if (!initialData) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading allocation...</p>
      </div>
    )
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
          <h1 className="text-3xl font-bold">Edit Time Allocation</h1>
          <p className="text-muted-foreground">Update staff hours and allocation period</p>
        </div>
      </div>

      <TimeAllocationForm
        initialData={initialData}
        staffOptions={staffOptions}
        activityOptions={activityOptions}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  )
}
