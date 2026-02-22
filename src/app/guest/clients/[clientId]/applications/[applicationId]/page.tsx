"use client"

import { use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Edit, Trash2, DollarSign, FileText, Plus } from "lucide-react"

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
import { registrationStatusLabels, claimStatusLabels } from "@/schemas/application.schema"
import { expenditureTypeLabels } from "@/schemas/expenditure.schema"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function GuestApplicationDetailPage({
  params,
}: {
  params: Promise<{ clientId: string; applicationId: string }>
}) {
  const { clientId, applicationId } = use(params)
  const router = useRouter()
  const { guestService, refreshData, version } = useGuestMode()

  const appResult = guestService.getApplication(applicationId)
  if (!appResult.success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-medium">Application not found</h3>
        <Button asChild className="mt-4">
          <Link href={`/guest/clients/${clientId}`}>Back to Client</Link>
        </Button>
      </div>
    )
  }

  const app = appResult.data
  const expenditures = guestService.listExpenditures(applicationId)
  const totalExpenditure = expenditures.reduce(
    (sum, e) => sum + Number(e.amountExGst || 0),
    0
  )

  const handleDelete = () => {
    if (!confirm("Delete this application and all its expenditures?")) return
    guestService.deleteApplication(applicationId)
    refreshData()
    router.push(`/guest/clients/${clientId}`)
  }

  const handleDeleteExpenditure = (expId: string) => {
    if (!confirm("Delete this expenditure?")) return
    guestService.deleteExpenditure(expId)
    refreshData()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Application {new Date(app.incomeYearStart).getFullYear()}-{new Date(app.incomeYearEnd).getFullYear()}
          </h1>
          {app.ausIndustryNumber && (
            <p className="text-muted-foreground">Reg: {app.ausIndustryNumber}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/guest/clients/${clientId}/applications/${applicationId}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button variant="destructive" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Registration Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">
              {registrationStatusLabels[app.registrationStatus] || app.registrationStatus}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Claim Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">
              {claimStatusLabels[app.claimStatus] || app.claimStatus}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenditure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenditure)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Expenditures */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Expenditures
            </CardTitle>
            <CardDescription>{expenditures.length} expenditure{expenditures.length !== 1 ? "s" : ""}</CardDescription>
          </div>
          <Button asChild>
            <Link href={`/guest/clients/${clientId}/applications/${applicationId}/expenditures/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expenditure
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {expenditures.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No expenditures recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Amount (ex GST)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenditures.map((exp) => (
                  <TableRow key={exp.id}>
                    <TableCell>
                      <Badge variant="secondary">
                        {expenditureTypeLabels[exp.expenditureType] || exp.expenditureType}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{exp.description}</TableCell>
                    <TableCell>{exp.supplierName || "—"}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(Number(exp.amountExGst))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/guest/clients/${clientId}/applications/${applicationId}/expenditures/${exp.id}/edit`}>
                            Edit
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteExpenditure(exp.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} className="font-bold">Total</TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    {formatCurrency(totalExpenditure)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
