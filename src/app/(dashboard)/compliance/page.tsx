import Link from "next/link"
import {
  ClipboardCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ExternalLink,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getComplianceOverview } from "@/actions/compliance"

const statusLabels = {
  PASS: "pass",
  WARNING: "warning",
  FAIL: "fail",
  NOT_APPLICABLE: "n/a",
} as const

interface PageProps {
  searchParams: Promise<{ clientId?: string }>
}

export default async function CompliancePage({ searchParams }: PageProps) {
  const params = await searchParams
  const overview = await getComplianceOverview(params.clientId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Compliance Checks</h1>
        <p className="text-muted-foreground">
          Monitor compliance status across all R&D Tax Incentive applications
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Passing</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {overview.summary.pass}
            </div>
            <p className="text-xs text-muted-foreground">checks passing</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {overview.summary.warning}
            </div>
            <p className="text-xs text-muted-foreground">require attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Failing</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {overview.summary.fail}
            </div>
            <p className="text-xs text-muted-foreground">need resolution</p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Checks List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Compliance Categories
          </CardTitle>
          <CardDescription>
            Overview of compliance checks by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {overview.categories.map((check) => {
              const totalClients = check.clients.length
              const topStatus =
                check.counts.fail > 0
                  ? "fail"
                  : check.counts.warning > 0
                  ? "warning"
                  : check.counts.pass > 0
                  ? "pass"
                  : "n/a"

              return (
                <details key={check.type} className="rounded-lg border">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 p-4">
                    <div className="space-y-1">
                      <p className="font-medium">{check.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {check.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {totalClients} client{totalClients !== 1 ? "s" : ""}
                      </span>
                      <Badge
                        variant={
                          topStatus === "pass"
                            ? "default"
                            : topStatus === "warning"
                            ? "warning"
                            : topStatus === "fail"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {topStatus === "pass" && <CheckCircle className="mr-1 h-3 w-3" />}
                        {topStatus === "warning" && <AlertTriangle className="mr-1 h-3 w-3" />}
                        {topStatus === "fail" && <XCircle className="mr-1 h-3 w-3" />}
                        {topStatus}
                      </Badge>
                    </div>
                  </summary>
                  <div className="border-t px-4 py-3">
                    {check.clients.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No clients in this category.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {check.clients.map((client) => (
                          <div
                            key={client.clientId}
                            className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-medium">{client.clientName}</p>
                              <p className="text-xs text-muted-foreground">
                                Application {client.applicationId}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge
                                variant={
                                  client.status === "PASS"
                                    ? "default"
                                    : client.status === "WARNING"
                                    ? "warning"
                                    : client.status === "FAIL"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {client.status === "PASS" && (
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                )}
                                {client.status === "WARNING" && (
                                  <AlertTriangle className="mr-1 h-3 w-3" />
                                )}
                                {client.status === "FAIL" && (
                                  <XCircle className="mr-1 h-3 w-3" />
                                )}
                                {statusLabels[client.status]}
                              </Badge>
                              <Link
                                href={`/clients/${client.clientId}`}
                                className="inline-flex items-center gap-1 text-sm text-primary"
                              >
                                View
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
