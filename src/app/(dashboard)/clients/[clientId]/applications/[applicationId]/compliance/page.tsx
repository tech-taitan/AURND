import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ShieldAlert } from "lucide-react"

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
import { getApplication } from "@/actions/applications"
import { runCompliance } from "@/actions/compliance"

interface PageProps {
  params: Promise<{ clientId: string; applicationId: string }>
}

export default async function ApplicationCompliancePage({ params }: PageProps) {
  const { clientId, applicationId } = await params
  const application = await getApplication(applicationId)

  if (!application) {
    notFound()
  }

  const compliance = await runCompliance(applicationId)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/clients/${clientId}/applications/${applicationId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Compliance Checks</h1>
          <p className="text-muted-foreground">
            {application.client.companyName} — {applicationId}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Risk Summary
          </CardTitle>
          <CardDescription>Automated compliance risk scoring</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Risk Level</p>
            <Badge variant={compliance.riskLevel === "HIGH" ? "destructive" : compliance.riskLevel === "MEDIUM" ? "secondary" : "outline"}>
              {compliance.riskLevel}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Risk Score</p>
            <div className="text-lg font-semibold">{compliance.riskScore}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compliance Checklist</CardTitle>
          <CardDescription>Pass, warning, and fail checks</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Check</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compliance.checks.map((check) => (
                <TableRow key={check.id}>
                  <TableCell>{check.checkType.replace(/_/g, " ")}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        check.status === "FAIL"
                          ? "destructive"
                          : check.status === "WARNING"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {check.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{check.message || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
