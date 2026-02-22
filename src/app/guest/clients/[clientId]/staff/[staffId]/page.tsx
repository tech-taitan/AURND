"use client"

import { use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Edit, Plus, Trash2, Users, DollarSign, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useGuestMode } from "@/components/providers/guest-mode-provider"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function GuestStaffDetailPage({
  params,
}: {
  params: Promise<{ clientId: string; staffId: string }>
}) {
  const { clientId, staffId } = use(params)
  const router = useRouter()
  const { guestService, refreshData, version } = useGuestMode()

  const staffResult = guestService.getStaff(staffId)
  if (!staffResult.success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-medium">Staff member not found</h3>
        <Button asChild className="mt-4">
          <Link href={`/guest/clients/${clientId}`}>Back to Client</Link>
        </Button>
      </div>
    )
  }

  const staff = staffResult.data
  const hourlyRate = staff.hourlyRate ? Number(staff.hourlyRate) : 0

  const handleDelete = () => {
    if (!confirm("Delete this staff member and all time allocations?")) return
    guestService.deleteStaff(staffId)
    refreshData()
    router.push(`/guest/clients/${clientId}`)
  }

  const handleDeleteAllocation = (allocationId: string) => {
    if (!confirm("Delete this time allocation?")) return
    guestService.deleteTimeAllocation(allocationId)
    refreshData()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{staff.name}</h1>
          {staff.position && <p className="text-muted-foreground">{staff.position}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/guest/clients/${clientId}/staff/${staffId}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button variant="destructive" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hourly Rate</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hourlyRate ? `$${hourlyRate}/hr` : "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Annual Salary</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {staff.annualSalary ? formatCurrency(Number(staff.annualSalary)) : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Allocations</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staff.timeAllocations.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Time Allocations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Time Allocations</CardTitle>
            <CardDescription>R&D time allocated to activities</CardDescription>
          </div>
          <Button asChild>
            <Link href={`/guest/clients/${clientId}/staff/${staffId}/allocations/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Allocate Time
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {staff.timeAllocations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No time allocations yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.timeAllocations.map((ta) => {
                  const hours = Number(ta.hoursAllocated || 0)
                  const cost = hours * hourlyRate
                  return (
                    <TableRow key={ta.id}>
                      <TableCell className="font-medium">
                        {ta.activity?.activityName || "—"}
                      </TableCell>
                      <TableCell>{ta.project?.projectName || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(ta.periodStart).toLocaleDateString("en-AU")} –{" "}
                        {new Date(ta.periodEnd).toLocaleDateString("en-AU")}
                      </TableCell>
                      <TableCell className="text-right">{hours}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(cost)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteAllocation(ta.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
