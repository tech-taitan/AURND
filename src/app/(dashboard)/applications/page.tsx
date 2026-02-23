import Link from "next/link"
import { FileText, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import prisma from "@/lib/db"

async function getAllApplications() {
  return prisma.incomeYearApplication.findMany({
    include: {
      client: {
        select: {
          id: true,
          companyName: true,
        },
      },
    },
    orderBy: { incomeYearEnd: "desc" },
  })
}

export default async function ApplicationsPage() {
  const applications = await getAllApplications()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Income Year Applications</h1>
          <p className="text-muted-foreground">
            Track R&D Tax Incentive applications by income year
          </p>
        </div>
        <Button asChild>
          <Link href="/clients">
            <Plus className="mr-2 h-4 w-4" />
            New Application
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            All Applications
          </CardTitle>
          <CardDescription>
            {applications.length} application{applications.length !== 1 ? "s" : ""} across all clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No applications found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create an application from a client&apos;s page to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Income Year</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">Registration</TableHead>
                  <TableHead>Claim</TableHead>
                  <TableHead className="hidden md:table-cell">Deadline</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell>
                      {new Date(application.incomeYearStart).toLocaleDateString("en-AU")} –{" "}
                      {new Date(application.incomeYearEnd).toLocaleDateString("en-AU")}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/clients/${application.client.id}`}
                        className="text-sm hover:underline"
                      >
                        {application.client.companyName}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline">{application.registrationStatus}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          application.claimStatus === "COMPLETED"
                            ? "secondary"
                            : application.claimStatus === "IN_PROGRESS"
                            ? "default"
                            : "outline"
                        }
                      >
                        {application.claimStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {new Date(application.registrationDeadline).toLocaleDateString("en-AU")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={`/clients/${application.clientId}/applications/${application.id}`}
                        >
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
