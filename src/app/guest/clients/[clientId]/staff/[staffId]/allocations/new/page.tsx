"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { useGuestMode } from "@/components/providers/guest-mode-provider"
import { TimeAllocationForm } from "@/components/staff/time-allocation-form"
import type { TimeAllocationFormData } from "@/schemas/time-allocation.schema"

export default function GuestNewTimeAllocationPage({
  params,
}: {
  params: Promise<{ clientId: string; staffId: string }>
}) {
  const { clientId, staffId } = use(params)
  const router = useRouter()
  const { guestService, refreshData } = useGuestMode()

  const staffList = guestService
    .listStaff(clientId)
    .map((s) => ({ id: s.id, name: s.name, hourlyRate: s.hourlyRate ? Number(s.hourlyRate) : null }))

  const activities = guestService
    .getActivitiesByClient(clientId)
    .map((a) => {
      const project = guestService.getProject(a.projectId)
      return {
        id: a.id,
        name: a.activityName,
        projectName: project.success ? project.data.projectName : undefined,
      }
    })

  const handleSubmit = async (data: TimeAllocationFormData) => {
    const result = guestService.createTimeAllocation({
      staffMemberId: data.staffMemberId,
      activityId: data.activityId,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      hoursAllocated: data.hoursAllocated,
      percentageOfTime: data.percentageOfTime,
      description: data.description,
    })

    if (!result.success) throw new Error(result.error)
    refreshData()
    router.push(`/guest/clients/${clientId}/staff/${staffId}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Allocate Time</h1>
        <p className="text-muted-foreground">Record R&D time allocation</p>
      </div>
      <TimeAllocationForm
        initialData={{ staffMemberId: staffId }}
        staffOptions={staffList}
        activityOptions={activities}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
