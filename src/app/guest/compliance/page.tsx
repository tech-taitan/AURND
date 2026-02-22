"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, AlertTriangle, XCircle, ClipboardCheck } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useGuestMode } from "@/components/providers/guest-mode-provider"

const statusIcon = {
  PASS: <CheckCircle className="h-4 w-4 text-green-500" />,
  WARNING: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  FAIL: <XCircle className="h-4 w-4 text-red-500" />,
}

const statusBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "warning"> = {
  PASS: "default",
  WARNING: "warning",
  FAIL: "destructive",
}

function ComplianceContent() {
  const searchParams = useSearchParams()
  const clientId = searchParams.get("clientId") || undefined
  const { guestService, version } = useGuestMode()

  const overview = guestService.getComplianceOverview(clientId)

  // Group checks by category
  const grouped: Record<string, typeof overview.checks> = {}
  for (const check of overview.checks) {
    if (!grouped[check.category]) grouped[check.category] = []
    grouped[check.category].push(check)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Compliance Overview</h1>
        <p className="text-muted-foreground">
          {clientId ? "Client compliance checks" : "Compliance checks across all clients"}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Passing</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{overview.passing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{overview.warnings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failing</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overview.failing}</div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Checks by Category */}
      {overview.checks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No compliance checks</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Add clients and projects to see compliance checks.
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([category, checks]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle>{category}</CardTitle>
              <CardDescription>
                {checks.filter((c) => c.status === "PASS").length} passing,{" "}
                {checks.filter((c) => c.status === "WARNING").length} warnings,{" "}
                {checks.filter((c) => c.status === "FAIL").length} failing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Status</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checks.map((check, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        {statusIcon[check.status as keyof typeof statusIcon]}
                      </TableCell>
                      <TableCell className="font-medium">{check.clientName}</TableCell>
                      <TableCell>{check.message}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/guest/clients/${check.clientId}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

export default function GuestCompliancePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading compliance checks...</div>}>
      <ComplianceContent />
    </Suspense>
  )
}
