import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, TrendingUp } from "lucide-react"

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
import { getApplication } from "@/actions/applications"
import { getApplicationComparison } from "@/actions/comparison"

interface PageProps {
  params: Promise<{ clientId: string; applicationId: string }>
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default async function ApplicationComparisonPage({ params }: PageProps) {
  const { clientId, applicationId } = await params
  const [application, comparison] = await Promise.all([
    getApplication(applicationId),
    getApplicationComparison(applicationId),
  ])

  if (!application) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/clients/${clientId}/applications/${applicationId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Application Comparison</h1>
          <p className="text-muted-foreground">
            Compare current year with prior application for {application.client.companyName}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Year-over-Year Summary
          </CardTitle>
          <CardDescription>Key changes compared to last year</CardDescription>
        </CardHeader>
        <CardContent>
          {comparison.previousApplicationId ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>This Year</TableHead>
                  <TableHead>Last Year</TableHead>
                  <TableHead>Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparison.metrics.map((metric) => (
                  <TableRow key={metric.label}>
                    <TableCell>{metric.label}</TableCell>
                    <TableCell>{formatCurrency(metric.current)}</TableCell>
                    <TableCell>{formatCurrency(metric.previous)}</TableCell>
                    <TableCell>
                      {metric.changePercent.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">
              No previous application found to compare against.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
