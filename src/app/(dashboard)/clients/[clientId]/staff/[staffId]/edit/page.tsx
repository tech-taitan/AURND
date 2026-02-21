"use client"

import { useRouter } from "next/navigation"
import { use, useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { StaffForm } from "@/components/staff/staff-form"
import { getStaff, updateStaff } from "@/actions/staff"
import type { StaffFormData } from "@/schemas/staff.schema"

interface PageProps {
  params: Promise<{ clientId: string; staffId: string }>
}

export default function EditStaffPage({ params }: PageProps) {
  const { clientId, staffId } = use(params)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [initialData, setInitialData] = useState<Partial<StaffFormData> | null>(null)

  useEffect(() => {
    async function loadStaff() {
      const staff = await getStaff(staffId)
      if (staff) {
        setInitialData({
          name: staff.name,
          position: staff.position || undefined,
          employeeId: staff.employeeId || undefined,
          annualSalary: staff.annualSalary ? String(staff.annualSalary) : undefined,
          onCosts: staff.onCosts ? String(staff.onCosts) : undefined,
          hourlyRate: staff.hourlyRate ? String(staff.hourlyRate) : undefined,
          startDate: staff.startDate ? new Date(staff.startDate).toISOString().slice(0, 10) : "",
          endDate: staff.endDate ? new Date(staff.endDate).toISOString().slice(0, 10) : "",
        })
      }
    }
    loadStaff()
  }, [staffId])

  const handleSubmit = async (data: StaffFormData) => {
    setIsLoading(true)
    try {
      const result = await updateStaff(staffId, data, clientId)
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
        <p className="text-muted-foreground">Loading staff member...</p>
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
          <h1 className="text-3xl font-bold">Edit Staff Member</h1>
          <p className="text-muted-foreground">Update staff details and costs</p>
        </div>
      </div>

      <StaffForm initialData={initialData} onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  )
}
