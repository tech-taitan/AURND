"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { useGuestMode } from "@/components/providers/guest-mode-provider"
import { StaffForm } from "@/components/staff/staff-form"
import type { StaffFormData } from "@/schemas/staff.schema"

export default function GuestNewStaffPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = use(params)
  const router = useRouter()
  const { guestService, refreshData } = useGuestMode()

  const handleSubmit = async (data: StaffFormData) => {
    const result = guestService.createStaff(clientId, {
      name: data.name,
      position: data.position,
      employeeId: data.employeeId,
      annualSalary: data.annualSalary,
      onCosts: data.onCosts,
      hourlyRate: data.hourlyRate,
      startDate: data.startDate,
      endDate: data.endDate,
    })

    if (!result.success) throw new Error(result.error)
    refreshData()
    router.push(`/guest/clients/${clientId}/staff/${result.data.id}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add Staff Member</h1>
        <p className="text-muted-foreground">Add a staff member for R&D time allocation</p>
      </div>
      <StaffForm onSubmit={handleSubmit} />
    </div>
  )
}
