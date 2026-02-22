"use client"

import Link from "next/link"
import { FolderKanban } from "lucide-react"

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

const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
  ACTIVE: "default",
  COMPLETED: "secondary",
  PLANNING: "secondary",
  ABANDONED: "destructive",
}

export default function GuestProjectsPage() {
  const { guestService, version } = useGuestMode()

  const projects = guestService.getProjectsWithCounts()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Projects</h1>
        <p className="text-muted-foreground">All R&D projects across clients</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
          <CardDescription>
            {projects.length} project{projects.length !== 1 ? "s" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderKanban className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No projects yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Add a project from a client&apos;s page.
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{project.projectName}</div>
                        {project.projectCode && (
                          <div className="text-xs text-muted-foreground">{project.projectCode}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{project.clientName || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[project.status] || "secondary"}>
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{project._count.activities}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/guest/clients/${project.clientId}/projects/${project.id}`}>
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
