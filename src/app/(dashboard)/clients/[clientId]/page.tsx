import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  Calendar,
  ClipboardCheck,
  DollarSign,
  Edit,
  FileText,
  FolderKanban,
  Plus,
  Users,
} from "lucide-react"

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
import { getClient, getClientStats } from "@/actions/clients"
import { calculateRegistrationDeadline } from "@/services/tax-offset-calculator.service"

function formatCurrency(amount: number | null): string {
  if (!amount) return "$0"
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatAbn(abn: string): string {
  const cleaned = abn.replace(/\s/g, "")
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`
  }
  return abn
}

function getIncomeYearLabel(endDate: Date): string {
  const year = endDate.getFullYear()
  const month = endDate.getMonth()
  // If FY ends in Jan-Jun, it's the previous calendar year's FY
  if (month < 6) {
    return `FY ${year - 1}-${year.toString().slice(-2)}`
  }
  return `FY ${year}-${(year + 1).toString().slice(-2)}`
}

function getDaysRemaining(deadline: Date): number {
  const now = new Date()
  const diff = deadline.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

interface PageProps {
  params: Promise<{ clientId: string }>
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { clientId } = await params
  const [client, stats] = await Promise.all([
    getClient(clientId),
    getClientStats(clientId),
  ])

  if (!client) {
    notFound()
  }

  const turnover = client.aggregatedTurnover ? Number(client.aggregatedTurnover) : 0
  const isRefundable = turnover < 20000000

  // Calculate next registration deadline based on client's FY end
  const currentYear = new Date().getFullYear()
  const fyEndDate = new Date(currentYear, client.incomeYearEndMonth - 1, client.incomeYearEndDay)
  if (fyEndDate < new Date()) {
    fyEndDate.setFullYear(currentYear + 1)
  }
  const registrationDeadline = calculateRegistrationDeadline(fyEndDate)
  const daysToDeadline = getDaysRemaining(registrationDeadline)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/clients">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{client.companyName}</h1>
              <p className="font-mono text-sm text-muted-foreground">
                ABN: {formatAbn(client.abn)}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/compliance?clientId=${clientId}`}>
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Compliance
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/clients/${clientId}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Client
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Offset Type
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={isRefundable ? "default" : "secondary"}>
              {isRefundable ? "Refundable" : "Non-refundable"}
            </Badge>
            <p className="mt-1 text-xs text-muted-foreground">
              Turnover: {formatCurrency(turnover)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Projects
            </CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProjects}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalApplications} application{stats.totalApplications !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Expenditure
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalExpenditure)}
            </div>
            <p className="text-xs text-muted-foreground">All applications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Registration Deadline
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {registrationDeadline.toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {daysToDeadline > 0 ? `${daysToDeadline} days remaining` : "Past deadline"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Contact Name
              </p>
              <p>{client.contactName || "Not specified"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p>{client.contactEmail || "Not specified"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Phone</p>
              <p>{client.contactPhone || "Not specified"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>R&D Projects</CardTitle>
            <CardDescription>
              Active research and development projects
            </CardDescription>
          </div>
          <Button asChild>
            <Link href={`/clients/${clientId}/projects/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Project
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {client.projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FolderKanban className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No projects yet</p>
              <Button asChild className="mt-4" variant="outline">
                <Link href={`/clients/${clientId}/projects/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Project
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {client.projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      {project.projectName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          project.status === "ACTIVE"
                            ? "default"
                            : project.status === "COMPLETED"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{project.projectCode || "-"}</TableCell>
                    <TableCell>
                      {project.startDate
                        ? new Date(project.startDate).toLocaleDateString("en-AU")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/clients/${clientId}/projects/${project.id}`}>
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

      {/* Applications */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Income Year Applications</CardTitle>
            <CardDescription>
              R&D Tax Incentive applications by financial year
            </CardDescription>
          </div>
          <Button asChild>
            <Link href={`/clients/${clientId}/applications/new`}>
              <Plus className="mr-2 h-4 w-4" />
              New Application
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {client.applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No applications yet</p>
              <Button asChild className="mt-4" variant="outline">
                <Link href={`/clients/${clientId}/applications/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Application
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Income Year</TableHead>
                  <TableHead>Registration Status</TableHead>
                  <TableHead>Claim Status</TableHead>
                  <TableHead>Total Expenditure</TableHead>
                  <TableHead>Estimated Offset</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {client.applications.map((app) => {
                  const totalExp = app.totalNotionalDeduction
                    ? Number(app.totalNotionalDeduction)
                    : 0
                  const offset = app.refundableOffset
                    ? Number(app.refundableOffset)
                    : app.nonRefundableOffset
                    ? Number(app.nonRefundableOffset)
                    : 0

                  return (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">
                        {getIncomeYearLabel(new Date(app.incomeYearEnd))}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            app.registrationStatus === "REGISTERED"
                              ? "default"
                              : app.registrationStatus === "SUBMITTED"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {app.registrationStatus.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {app.claimStatus.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(totalExp)}</TableCell>
                      <TableCell>{formatCurrency(offset)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/clients/${clientId}/applications/${app.id}`}>
                            View
                          </Link>
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
