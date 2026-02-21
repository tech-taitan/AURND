import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Calculator, DollarSign, FileText, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { calculateApplication, getApplication } from "@/actions/applications"
import { DraftApplicationButton } from "@/components/ai/draft-application-button"
import { projectService } from "@/services/project.service"

interface PageProps {
  params: Promise<{ clientId: string; applicationId: string }>
}

function incomeYearLabel(endDate: Date): string {
  const year = endDate.getFullYear()
  const month = endDate.getMonth()
  if (month < 6) {
    return `FY ${year - 1}-${year.toString().slice(-2)}`
  }
  return `FY ${year}-${(year + 1).toString().slice(-2)}`
}

export default async function ApplicationDetailPage({ params }: PageProps) {
  const { clientId, applicationId } = await params
  const application = await getApplication(applicationId)

  if (!application) {
    notFound()
  }

  const projects = await projectService.listByClient(application.client.id)
  const hasActivities = projects.some((project) => project._count.activities > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/clients/${clientId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Income Year Application</h1>
            <p className="text-muted-foreground">
              {application.client.companyName} — {incomeYearLabel(new Date(application.incomeYearEnd))}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasActivities && (
            <DraftApplicationButton applicationId={applicationId} />
          )}
          <Button variant="outline" asChild>
            <Link href={`/clients/${clientId}/applications/${applicationId}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/clients/${clientId}/applications/${applicationId}/comparison`}>
              Comparison
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/clients/${clientId}/applications/${applicationId}/compliance`}>
              Compliance
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/clients/${clientId}/applications/${applicationId}/documents`}>
              Documents
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/clients/${clientId}/applications/${applicationId}/submission`}>
              Submission
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/clients/${clientId}/applications/${applicationId}/outcome`}>
              Outcome
            </Link>
          </Button>
          <form
            action={async () => {
              'use server'
              await calculateApplication(applicationId, clientId)
            }}
          >
            <Button type="submit" variant="secondary">
              <Calculator className="mr-2 h-4 w-4" />
              Recalculate Offset
            </Button>
          </form>
          <Button asChild>
            <Link href={`/clients/${clientId}/applications/${applicationId}/expenditures`}>
              <DollarSign className="mr-2 h-4 w-4" />
              Manage Expenditures
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Registration Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">
              {application.registrationStatus.replace("_", " ")}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Claim Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{application.claimStatus.replace("_", " ")}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Registration Deadline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {new Date(application.registrationDeadline).toLocaleDateString("en-AU")}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Application Summary
          </CardTitle>
          <CardDescription>
            Core information for the selected income year application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>Income year start: {new Date(application.incomeYearStart).toLocaleDateString("en-AU")}</div>
          <div>Income year end: {new Date(application.incomeYearEnd).toLocaleDateString("en-AU")}</div>
          <div>AusIndustry number: {application.ausIndustryNumber || "Not set"}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Offset Calculation</CardTitle>
          <CardDescription>
            Calculated from total notional deductions in this application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            Total notional deductions:{" "}
            {application.totalNotionalDeduction
              ? application.totalNotionalDeduction.toString()
              : "0"}
          </div>
          <div>Offset type: {application.offsetType || "Not calculated"}</div>
          <div>
            Refundable offset:{" "}
            {application.refundableOffset ? application.refundableOffset.toString() : "-"}
          </div>
          <div>
            Non-refundable offset:{" "}
            {application.nonRefundableOffset ? application.nonRefundableOffset.toString() : "-"}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
