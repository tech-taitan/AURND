"use client"

import { useState } from "react"
import { Calculator, DollarSign, Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function CalculatorPage() {
  const [turnover, setTurnover] = useState("")
  const [expenditure, setExpenditure] = useState("")
  const [entityType, setEntityType] = useState("company")
  const [result, setResult] = useState<{
    offsetType: string
    offsetRate: number
    estimatedOffset: number
    notionalDeduction: number
  } | null>(null)

  const calculateOffset = () => {
    const turnoverNum = parseFloat(turnover) || 0
    const expenditureNum = parseFloat(expenditure) || 0

    const companyTaxRate = 0.25 // Base rate for small business
    const isSmallBusiness = turnoverNum < 20000000

    let offsetRate: number
    let offsetType: string

    if (isSmallBusiness) {
      // Refundable offset: company tax rate + 18.5%
      offsetRate = companyTaxRate + 0.185
      offsetType = "Refundable"
    } else {
      // Non-refundable offset
      const rdIntensity = expenditureNum / turnoverNum
      if (rdIntensity > 0.02) {
        // Premium rate: company tax rate + 16.5%
        offsetRate = 0.30 + 0.165 // Using 30% for larger companies
        offsetType = "Non-Refundable (Premium)"
      } else {
        // Base rate: company tax rate + 8.5%
        offsetRate = 0.30 + 0.085
        offsetType = "Non-Refundable (Base)"
      }
    }

    const notionalDeduction = expenditureNum
    const estimatedOffset = expenditureNum * offsetRate

    setResult({
      offsetType,
      offsetRate,
      estimatedOffset,
      notionalDeduction,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">R&D Tax Offset Calculator</h1>
        <p className="text-muted-foreground">
          Estimate your R&D Tax Incentive offset based on expenditure and turnover
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Calculate Offset
            </CardTitle>
            <CardDescription>
              Enter your details to estimate the R&D tax offset
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="entityType">Entity Type</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select entity type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="trust">Trust</SelectItem>
                  <SelectItem value="partnership">Partnership</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="turnover">Aggregated Annual Turnover ($)</Label>
              <Input
                id="turnover"
                type="number"
                placeholder="e.g. 15000000"
                value={turnover}
                onChange={(e) => setTurnover(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Turnover under $20M qualifies for refundable offset
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenditure">Total R&D Expenditure ($)</Label>
              <Input
                id="expenditure"
                type="number"
                placeholder="e.g. 500000"
                value={expenditure}
                onChange={(e) => setExpenditure(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Eligible R&D expenditure for the income year
              </p>
            </div>

            <Button onClick={calculateOffset} className="w-full">
              Calculate Offset
            </Button>
          </CardContent>
        </Card>

        {/* Results Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Estimated Offset
            </CardTitle>
            <CardDescription>
              Based on current R&D Tax Incentive rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-primary/10 p-4">
                  <p className="text-sm text-muted-foreground">Estimated Tax Offset</p>
                  <p className="text-3xl font-bold text-primary">
                    ${result.estimatedOffset.toLocaleString('en-AU', { maximumFractionDigits: 0 })}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Offset Type</span>
                    <span className="font-medium">{result.offsetType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Offset Rate</span>
                    <span className="font-medium">{(result.offsetRate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Notional Deduction</span>
                    <span className="font-medium">
                      ${result.notionalDeduction.toLocaleString('en-AU', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Info className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  Enter your details and click calculate to see the estimated offset
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>About R&D Tax Offset Rates</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <strong>Refundable Offset (Turnover &lt; $20M):</strong> Company tax rate + 18.5% = 43.5%
            </li>
            <li>
              <strong>Non-Refundable Base (R&D Intensity ≤ 2%):</strong> Company tax rate + 8.5% = 38.5%
            </li>
            <li>
              <strong>Non-Refundable Premium (R&D Intensity &gt; 2%):</strong> Company tax rate + 16.5% = 46.5%
            </li>
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Note: This calculator provides estimates only. Actual offsets depend on eligibility,
            expenditure classification, and other factors. Consult a tax professional for accurate advice.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
