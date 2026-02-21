import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Clock, Plus, UserCircle } from "lucide-react"

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
import { Badge } from "@/components/ui/badge"
import { getStaff } from "@/actions/staff"
import { TimeAllocationActions } from "@/components/staff/time-allocation-actions"

interface PageProps {
  params: Promise<{ clientId: string; staffId: string }>
}

function formatCurrency(amount: number | null): string {
  if (!amount) return "-"
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export default async function StaffDetailPage({ params }: PageProps) {
  const { clientId, staffId } = await params
  const staff = await getStaff(staffId)

  if (!staff) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/clients/${clientId}/staff`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <UserCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{staff.name}</h1>
              <p className="text-sm text-muted-foreground">
                {staff.position || "Position not set"}
              </p>
            </div>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/clients/${clientId}/staff/${staffId}/edit`}>Edit Staff</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Hourly Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(staff.hourlyRate ? Number(staff.hourlyRate) : null)}
            </div>
            <p className="text-xs text-muted-foreground">
              Salary + on-costs allocation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Annual Salary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(staff.annualSalary ? Number(staff.annualSalary) : null)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Time Allocations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staff.timeAllocations.length}</div>
            <p className="text-xs text-muted-foreground">Active allocations</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Allocations
            </CardTitle>
            <CardDescription>Staff time assigned to R&D activities</CardDescription>
          </div>
          <Button asChild>
            <Link href={`/clients/${clientId}/staff/${staffId}/allocations/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Allocate Time
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {staff.timeAllocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Clock className="h-10 w-10 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No allocations yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Allocate hours to R&D activities to track eligible expenditure.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.timeAllocations.map((allocation) => (
                  <TableRow key={allocation.id}>
                    <TableCell>
                      <div className="font-medium">
                        {allocation.activity.activityName}
                      </div>
                      <Badge variant="outline" className="mt-1">
                        {allocation.activity.project.projectName}
                      </Badge>
                    </TableCell>
                    <TableCell>{allocation.activity.project.projectName}</TableCell>
                    <TableCell>
                      {new Date(allocation.periodStart).toLocaleDateString("en-AU")} –{" "}
                      {new Date(allocation.periodEnd).toLocaleDateString("en-AU")}
                    </TableCell>
                    <TableCell>{Number(allocation.hoursAllocated).toFixed(1)}</TableCell>
                    <TableCell>
                      {allocation.calculatedCost
                        ? formatCurrency(Number(allocation.calculatedCost))
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <TimeAllocationActions
                        clientId={clientId}
                        staffId={staffId}
                        allocationId={allocation.id}
                        projectId={allocation.activity.project.id}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
