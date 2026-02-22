"use client"

import { use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Building2,
  Calendar,
  DollarSign,
  Edit,
  FolderKanban,
  Plus,
  Trash2,
  TrendingUp,
  Users,
  FileText,
  ClipboardCheck,
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
import { useGuestMode } from "@/components/providers/guest-mode-provider"
import { calculateRegistrationDeadline } from "@/services/tax-offset-calculator.service"

function formatCurrency(amount: number): string {
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

export default function GuestClientDetailPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params)
  const router = useRouter()
  const { guestService, refreshData, version } = useGuestMode()

  const clientResult = guestService.getClient(clientId)
  if (!clientResult.success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-medium">Client not found</h3>
        <Button asChild className="mt-4">
          <Link href="/guest/clients">Back to Clients</Link>
        </Button>
      </div>
    )
  }

  const client = clientResult.data
  const stats = guestService.getClientStats(clientId)
  const projects = guestService.listProjects(clientId)
  const applications = guestService.listApplications(clientId)
  const staff = guestService.listStaff(clientId)

  const turnover = client.aggregatedTurnover ? Number(client.aggregatedTurnover) : null
  const offsetType = !turnover || turnover < 20000000 ? "Refundable" : "Non-refundable"

  // Calculate registration deadline
  const now = new Date()
  const currentYear = now.getFullYear()
  let fyEndDate = new Date(currentYear, client.incomeYearEndMonth - 1, client.incomeYearEndDay)
  if (fyEndDate < now) {
    fyEndDate = new Date(currentYear + 1, client.incomeYearEndMonth - 1, client.incomeYearEndDay)
  }
  const registrationDeadline = calculateRegistrationDeadline(fyEndDate)
  const daysToDeadline = Math.ceil(
    (registrationDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )

  const handleDelete = () => {
    if (!confirm("Are you sure you want to delete this client? All associated data will be removed.")) return
    guestService.deleteClient(clientId)
    refreshData()
    router.push("/guest/clients")
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{client.companyName}</h1>
          <p className="text-muted-foreground font-mono">
            ABN: {formatAbn(client.abn)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/guest/compliance?clientId=${clientId}`}>
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Compliance
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/guest/clients/${clientId}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button variant="destructive" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Offset Type
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{offsetType}</div>
            <p className="text-xs text-muted-foreground">
              {turnover ? formatCurrency(turnover) + " turnover" : "Turnover not specified"}
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
            <div className="text-2xl font-bold">{stats.projectCount}</div>
            <p className="text-xs text-muted-foreground">R&D projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Expenditure
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalExpenditure)}</div>
            <p className="text-xs text-muted-foreground">Across all applications</p>
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
              <Badge variant={daysToDeadline <= 30 ? "destructive" : daysToDeadline <= 90 ? "warning" : "default"}>
                {daysToDeadline} days
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {registrationDeadline.toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contact & Company Info */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Company Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Incorporation</span>
              <span>{client.incorporationType === "AUSTRALIAN_LAW" ? "Australian" : client.incorporationType === "FOREIGN_RESIDENT" ? "Foreign Resident" : "Foreign PE"}</span>
            </div>
            {client.acn && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">ACN</span>
                <span className="font-mono">{client.acn}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Consolidated Group</span>
              <span>{client.isConsolidatedGroup ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Exempt Controlled</span>
              <span>{client.isExemptControlled ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">FY End</span>
              <span>{client.incomeYearEndDay}/{client.incomeYearEndMonth}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {client.contactName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span>{client.contactName}</span>
              </div>
            )}
            {client.contactEmail && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span>{client.contactEmail}</span>
              </div>
            )}
            {client.contactPhone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span>{client.contactPhone}</span>
              </div>
            )}
            {client.address && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Address</span>
                <span className="text-right">
                  {[client.address.street, client.address.suburb, client.address.state, client.address.postcode]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* R&D Projects */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>R&D Projects</CardTitle>
            <CardDescription>{projects.length} project{projects.length !== 1 ? "s" : ""}</CardDescription>
          </div>
          <Button asChild>
            <Link href={`/guest/clients/${clientId}/projects/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Project
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No projects yet. Add your first R&D project.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Activities</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => {
                  const activityCount = guestService.listActivities(project.id).length
                  return (
                    <TableRow key={project.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{project.projectName}</div>
                          {project.projectCode && (
                            <div className="text-xs text-muted-foreground">{project.projectCode}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={project.status === "ACTIVE" ? "default" : "secondary"}>
                          {project.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{activityCount}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/guest/clients/${clientId}/projects/${project.id}`}>View</Link>
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

      {/* Applications */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Income Year Applications</CardTitle>
            <CardDescription>{applications.length} application{applications.length !== 1 ? "s" : ""}</CardDescription>
          </div>
          <Button asChild>
            <Link href={`/guest/clients/${clientId}/applications/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Application
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No applications yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Income Year</TableHead>
                  <TableHead>Registration</TableHead>
                  <TableHead>Claim Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">
                      {new Date(app.incomeYearStart).getFullYear()}-{new Date(app.incomeYearEnd).getFullYear()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{app.registrationStatus.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{app.claimStatus.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/guest/clients/${clientId}/applications/${app.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Staff */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Staff Members</CardTitle>
            <CardDescription>{staff.length} staff member{staff.length !== 1 ? "s" : ""}</CardDescription>
          </div>
          <Button asChild>
            <Link href={`/guest/clients/${clientId}/staff/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Staff
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {staff.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No staff members yet.
            </p>
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
                {staff.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.position || "—"}</TableCell>
                    <TableCell>{s.hourlyRate ? `$${s.hourlyRate}/hr` : "—"}</TableCell>
                    <TableCell>{s._count.timeAllocations}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/guest/clients/${clientId}/staff/${s.id}`}>View</Link>
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
