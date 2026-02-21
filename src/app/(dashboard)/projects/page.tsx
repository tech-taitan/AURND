import Link from "next/link"
import { Building2, FolderKanban } from "lucide-react"

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

async function getAllProjects() {
  return prisma.rDProject.findMany({
    include: {
      client: {
        select: {
          id: true,
          companyName: true,
        },
      },
      _count: {
        select: {
          activities: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export default async function ProjectsPage() {
  const projects = await getAllProjects()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">R&D Projects</h1>
          <p className="text-muted-foreground">
            Manage all R&D projects across clients
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            All Projects
          </CardTitle>
          <CardDescription>
            {projects.length} project{projects.length !== 1 ? "s" : ""} across all clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderKanban className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No projects found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create a project from a client&apos;s page to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Activities</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <FolderKanban className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{project.projectName}</div>
                          {project.projectCode && (
                            <div className="text-xs text-muted-foreground">
                              {project.projectCode}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/clients/${project.client.id}`}
                        className="flex items-center gap-2 text-sm hover:underline"
                      >
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {project.client.companyName}
                      </Link>
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
                    <TableCell>{project._count.activities}</TableCell>
                    <TableCell>
                      {project.startDate
                        ? new Date(project.startDate).toLocaleDateString("en-AU")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={`/clients/${project.clientId}/projects/${project.id}`}
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
