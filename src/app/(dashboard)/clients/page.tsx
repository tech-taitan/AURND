import Link from "next/link"
import { Building2, Plus, ClipboardCheck } from "lucide-react"

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
import { searchClients } from "@/actions/clients"
import { ClientSearch } from "./client-search"

function formatCurrency(amount: number | null): string {
  if (!amount) return "Not specified"
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatAbn(abn: string): string {
  // Format as XX XXX XXX XXX
  const cleaned = abn.replace(/\s/g, "")
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`
  }
  return abn
}

function getOffsetType(turnover: number | null): string {
  if (!turnover || turnover < 20000000) return "Refundable"
  return "Non-refundable"
}

interface PageProps {
  searchParams: Promise<{ search?: string; page?: string }>
}

export default async function ClientsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const search = params.search
  const page = params.page ? parseInt(params.page) : 1

  const result = await searchClients(search, page, 10)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Clients</h1>
          <p className="text-muted-foreground">
            Manage your R&D Tax Incentive clients
          </p>
        </div>
        <Button asChild>
          <Link href="/clients/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Link>
        </Button>
      </div>

      {/* Search */}
      <ClientSearch initialSearch={search} />

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
          <CardDescription>
            {result.total} client{result.total !== 1 ? "s" : ""} registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No clients found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {search
                  ? "No clients match your search criteria."
                  : "Get started by adding your first client."}
              </p>
              {!search && (
                <Button asChild className="mt-4">
                  <Link href="/clients/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Client
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead className="hidden md:table-cell">ABN</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead>Turnover</TableHead>
                  <TableHead>Offset Type</TableHead>
                  <TableHead className="hidden md:table-cell">Projects</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((client) => {
                  const turnover = client.aggregatedTurnover
                    ? Number(client.aggregatedTurnover)
                    : null
                  const projectCount = (client as { _count?: { projects: number } })._count?.projects ?? 0
                  const appCount = (client as { _count?: { applications: number } })._count?.applications ?? 0

                  return (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{client.companyName}</div>
                            <div className="text-xs text-muted-foreground">
                              {client.incorporationType === "AUSTRALIAN_LAW"
                                ? "Australian"
                                : client.incorporationType === "FOREIGN_RESIDENT"
                                ? "Foreign"
                                : "Foreign PE"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-sm">
                        {formatAbn(client.abn)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {client.contactName ? (
                          <div>
                            <div className="font-medium">{client.contactName}</div>
                            {client.contactEmail && (
                              <div className="text-sm text-muted-foreground">
                                {client.contactEmail}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not specified</span>
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(turnover)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            !turnover || turnover < 20000000 ? "default" : "secondary"
                          }
                        >
                          {getOffsetType(turnover)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {projectCount > 0 || appCount > 0 ? (
                          <div className="text-sm">
                            {projectCount > 0 && (
                              <span>{projectCount} project{projectCount !== 1 ? "s" : ""}</span>
                            )}
                            {projectCount > 0 && appCount > 0 && ", "}
                            {appCount > 0 && (
                              <span>{appCount} app{appCount !== 1 ? "s" : ""}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/clients/${client.id}`}>View</Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/compliance?clientId=${client.id}`}>
                              <ClipboardCheck className="mr-1 h-3 w-3" />
                              Compliance
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {result.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {result.page} of {result.totalPages}
              </p>
              <div className="flex gap-2">
                {result.page > 1 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/clients?${search ? `search=${search}&` : ""}page=${result.page - 1}`}
                    >
                      Previous
                    </Link>
                  </Button>
                )}
                {result.page < result.totalPages && (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/clients?${search ? `search=${search}&` : ""}page=${result.page + 1}`}
                    >
                      Next
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
