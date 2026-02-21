import Link from "next/link"
import { notFound } from "next/navigation"
import { DollarSign, Plus } from "lucide-react"

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
import { getExpendituresByApplication, deleteExpenditure } from "@/actions/expenditures"

interface PageProps {
  params: Promise<{ clientId: string; applicationId: string }>
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function incomeYearLabel(endDate: Date): string {
  const year = endDate.getFullYear()
  const month = endDate.getMonth()
  if (month < 6) {
    return `FY ${year - 1}-${year.toString().slice(-2)}`
  }
  return `FY ${year}-${(year + 1).toString().slice(-2)}`
}

export default async function ExpendituresPage({ params }: PageProps) {
  const { clientId, applicationId } = await params
  const [application, expenditures] = await Promise.all([
    getApplication(applicationId),
    getExpendituresByApplication(applicationId),
  ])

  if (!application) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expenditures</h1>
          <p className="text-muted-foreground">
            {application.client.companyName} — {incomeYearLabel(new Date(application.incomeYearEnd))}
          </p>
        </div>
        <Button asChild>
          <Link href={`/clients/${clientId}/applications/${applicationId}/expenditures/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expenditure
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Expenditure Register
          </CardTitle>
          <CardDescription>
            {expenditures.length} item{expenditures.length !== 1 ? "s" : ""} recorded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expenditures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <DollarSign className="h-10 w-10 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No expenditures yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Add expenditure to calculate your R&D notional deductions.
              </p>
              <Button asChild className="mt-4" variant="outline">
                <Link href={`/clients/${clientId}/applications/${applicationId}/expenditures/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Expenditure
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Amount (Ex GST)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenditures.map((exp) => (
                  <TableRow key={exp.id}>
                    <TableCell>
                      <div className="font-medium">{exp.description}</div>
                      {exp.invoiceNumber && (
                        <div className="text-xs text-muted-foreground">
                          Invoice {exp.invoiceNumber}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{exp.expenditureType}</Badge>
                    </TableCell>
                    <TableCell>{exp.project?.projectName || "-"}</TableCell>
                    <TableCell>{exp.activity?.activityName || "-"}</TableCell>
                    <TableCell>{formatCurrency(Number(exp.amountExGst))}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={`/clients/${clientId}/applications/${applicationId}/expenditures/${exp.id}/edit`}
                          >
                            Edit
                          </Link>
                        </Button>
                        <form
                          action={async () => {
                            'use server'
                            await deleteExpenditure(exp.id, clientId, applicationId)
                          }}
                        >
                          <Button variant="ghost" size="sm" type="submit">
                            Delete
                          </Button>
                        </form>
                      </div>
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
