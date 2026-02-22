"use client"

import Link from "next/link"
import { FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useGuestMode } from "@/components/providers/guest-mode-provider"
import { registrationStatusLabels, claimStatusLabels } from "@/schemas/application.schema"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function GuestApplicationsPage() {
  const { guestService, version } = useGuestMode()

  const applications = guestService.getApplicationsWithDetails()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Applications</h1>
        <p className="text-muted-foreground">Income year applications across all clients</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Applications</CardTitle>
          <CardDescription>
            {applications.length} application{applications.length !== 1 ? "s" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No applications yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create an application from a client&apos;s page.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Income Year</TableHead>
                  <TableHead>Registration</TableHead>
                  <TableHead>Claim Status</TableHead>
                  <TableHead>Expenditure</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.clientName}</TableCell>
                    <TableCell>
                      {new Date(app.incomeYearStart).getFullYear()}-{new Date(app.incomeYearEnd).getFullYear()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {registrationStatusLabels[app.registrationStatus] || app.registrationStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {claimStatusLabels[app.claimStatus] || app.claimStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(app.expenditureTotal)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/guest/clients/${app.clientId}/applications/${app.id}`}>
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
