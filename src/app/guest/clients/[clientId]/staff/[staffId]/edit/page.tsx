"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { useGuestMode } from "@/components/providers/guest-mode-provider"
import { StaffForm } from "@/components/staff/staff-form"
import type { StaffFormData } from "@/schemas/staff.schema"

export default function GuestEditStaffPage({
  params,
}: {
  params: Promise<{ clientId: string; staffId: string }>
}) {
  const { clientId, staffId } = use(params)
  const router = useRouter()
  const { guestService, refreshData } = useGuestMode()

  const staffResult = guestService.getStaff(staffId)
  if (!staffResult.success) {
    router.push(`/guest/clients/${clientId}`)
    return null
  }

  const staff = staffResult.data

  const handleSubmit = async (data: StaffFormData) => {
    const result = guestService.updateStaff(staffId, data)
    if (!result.success) throw new Error(result.error)
    refreshData()
    router.push(`/guest/clients/${clientId}/staff/${staffId}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Staff Member</h1>
        <p className="text-muted-foreground">Update details for {staff.name}</p>
      </div>
      <StaffForm
        initialData={{
          name: staff.name,
          position: staff.position,
          employeeId: staff.employeeId,
          annualSalary: staff.annualSalary,
          onCosts: staff.onCosts,
          hourlyRate: staff.hourlyRate,
          startDate: staff.startDate,
          endDate: staff.endDate,
        }}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
