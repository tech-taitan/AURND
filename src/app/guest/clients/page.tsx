"use client"

import { useState } from "react"
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
import { Input } from "@/components/ui/input"
import { useGuestMode } from "@/components/providers/guest-mode-provider"

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

export default function GuestClientsPage() {
  const { guestService, version } = useGuestMode()
  const [search, setSearch] = useState("")

  const result = guestService.listClients(search || undefined)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-muted-foreground">
            Manage your R&D Tax Incentive clients
          </p>
        </div>
        <Button asChild>
          <Link href="/guest/clients/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

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
                  <Link href="/guest/clients/new">
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
                  <TableHead>ABN</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Turnover</TableHead>
                  <TableHead>Offset Type</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((client) => {
                  const turnover = client.aggregatedTurnover
                    ? Number(client.aggregatedTurnover)
                    : null
                  const stats = guestService.getClientStats(client.id)

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
                      <TableCell className="font-mono text-sm">
                        {formatAbn(client.abn)}
                      </TableCell>
                      <TableCell>
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
                      <TableCell>
                        {stats.projectCount > 0 || stats.applicationCount > 0 ? (
                          <div className="text-sm">
                            {stats.projectCount > 0 && (
                              <span>{stats.projectCount} project{stats.projectCount !== 1 ? "s" : ""}</span>
                            )}
                            {stats.projectCount > 0 && stats.applicationCount > 0 && ", "}
                            {stats.applicationCount > 0 && (
                              <span>{stats.applicationCount} app{stats.applicationCount !== 1 ? "s" : ""}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/guest/clients/${client.id}`}>View</Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/guest/compliance?clientId=${client.id}`}>
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
        </CardContent>
      </Card>
    </div>
  )
}
