import Link from "next/link"
import { notFound } from "next/navigation"
import { Plus, Users } from "lucide-react"

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
import { getClient } from "@/actions/clients"
import { getStaffByClient } from "@/actions/staff"

interface PageProps {
  params: Promise<{ clientId: string }>
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

export default async function ClientStaffPage({ params }: PageProps) {
  const { clientId } = await params
  const [client, staff] = await Promise.all([
    getClient(clientId),
    getStaffByClient(clientId),
  ])

  if (!client) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Staff</h1>
          <p className="text-muted-foreground">
            {client.companyName} — staff members and R&D time allocations
          </p>
        </div>
        <Button asChild>
          <Link href={`/clients/${clientId}/staff/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Staff
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Staff Members
          </CardTitle>
          <CardDescription>
            {staff.length} staff member{staff.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {staff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No staff members yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Add staff to start tracking R&D time allocations.
              </p>
              <Button asChild className="mt-4">
                <Link href={`/clients/${clientId}/staff/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Staff
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Hourly Rate</TableHead>
                  <TableHead>Allocations</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="font-medium">{member.name}</div>
                      {member.employeeId && (
                        <div className="text-xs text-muted-foreground">
                          {member.employeeId}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{member.position || "-"}</TableCell>
                    <TableCell>
                      {member.hourlyRate
                        ? formatCurrency(Number(member.hourlyRate))
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {member._count?.timeAllocations ? (
                        <Badge variant="secondary">
                          {member._count.timeAllocations}
                        </Badge>
                      ) : (
                        <Badge variant="outline">0</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/clients/${clientId}/staff/${member.id}`}>
                          View
                        </Link>
                      </Button>
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
