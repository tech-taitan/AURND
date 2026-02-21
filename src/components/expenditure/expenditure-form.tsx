"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { DollarSign, HelpCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  expenditureFormSchema,
  expenditureTypeLabels,
  type ExpenditureFormData,
} from "@/schemas/expenditure.schema"

interface ExpenditureFormProps {
  initialData?: Partial<ExpenditureFormData>
  projects?: Array<{ id: string; name: string }>
  activities?: Array<{ id: string; name: string }>
  onSubmit: (data: ExpenditureFormData) => Promise<void>
  isLoading?: boolean
}

interface Attachment {
  fileName: string
  url: string
  mimeType: string
  size: number
}

const expenditureTypeInfo: Record<string, { description: string; examples: string[] }> = {
  RSP: {
    description: "Payments to registered Research Service Providers for R&D activities",
    examples: ["University research contracts", "CSIRO collaboration fees", "Registered R&D consultants"],
  },
  CONTRACT_NON_RSP: {
    description: "Contract payments to non-RSP entities for R&D activities",
    examples: ["Engineering consultants", "Software development contractors", "Testing laboratories"],
  },
  SALARY: {
    description: "Salaries and wages for employees undertaking R&D activities",
    examples: ["Research scientists", "R&D engineers", "Technical staff directly involved in R&D"],
  },
  OTHER: {
    description: "Other expenditure directly incurred on R&D activities",
    examples: ["Raw materials for experiments", "Prototype components", "Specialised software licenses"],
  },
  FEEDSTOCK_INPUT: {
    description: "Costs of feedstock inputs used in R&D activities that produce marketable products",
    examples: ["Raw materials transformed during R&D", "Chemical inputs", "Biological materials"],
  },
  ASSOCIATE_PAID: {
    description: "Amounts paid to associates for R&D activities (only claimable when paid)",
    examples: ["Related party R&D services", "Intercompany R&D charges"],
  },
  ASSET_DECLINE: {
    description: "Decline in value of assets used for R&D activities",
    examples: ["R&D equipment depreciation", "Specialised machinery decline", "R&D software depreciation"],
  },
  BALANCING_ADJ: {
    description: "Balancing adjustment losses for R&D assets",
    examples: ["Disposal losses on R&D assets", "Asset write-downs"],
  },
  CRC_CONTRIBUTION: {
    description: "Contributions to Cooperative Research Centres",
    examples: ["CRC membership contributions", "CRC project funding"],
  },
}

export function ExpenditureForm({
  initialData,
  projects = [],
  activities = [],
  onSubmit,
  isLoading,
}: ExpenditureFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>(
    (initialData?.attachments as Attachment[]) ?? []
  )
  const [isUploading, setIsUploading] = useState(false)
  const [isOcrRunning, setIsOcrRunning] = useState(false)

  const form = useForm<ExpenditureFormData>({
    resolver: zodResolver(expenditureFormSchema),
    defaultValues: {
      projectId: initialData?.projectId ?? "",
      activityId: initialData?.activityId ?? "",
      expenditureType: initialData?.expenditureType ?? "OTHER",
      amountExGst: initialData?.amountExGst ?? "",
      gstAmount: initialData?.gstAmount ?? "0",
      isAssociateExpense: initialData?.isAssociateExpense ?? false,
      isPaid: initialData?.isPaid ?? true,
      isOverseasExpense: initialData?.isOverseasExpense ?? false,
      description: initialData?.description ?? "",
      invoiceNumber: initialData?.invoiceNumber ?? "",
      invoiceDate: initialData?.invoiceDate ?? "",
      supplierName: initialData?.supplierName ?? "",
      supplierAbn: initialData?.supplierAbn ?? "",
      rspRegistrationNumber: initialData?.rspRegistrationNumber ?? "",
      periodStart: initialData?.periodStart ?? "",
      periodEnd: initialData?.periodEnd ?? "",
      paymentDate: initialData?.paymentDate ?? "",
      attachments: (initialData?.attachments as Attachment[]) ?? [],
    },
  })

  useEffect(() => {
    form.setValue("attachments", attachments)
  }, [attachments, form])

  const expenditureType = form.watch("expenditureType")
  const isRsp = expenditureType === "RSP"
  const isAssociate = expenditureType === "ASSOCIATE_PAID"
  const typeInfo = expenditureTypeInfo[expenditureType]

  const handleSubmit = async (data: ExpenditureFormData) => {
    try {
      setError(null)
      await onSubmit({ ...data, attachments })
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleUpload = async (file: File) => {
    setIsUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || "Failed to upload file")
      }

      const payload = await response.json()
      const uploaded = payload.data as Attachment
      setAttachments((prev) => [...prev, uploaded])
      await runOcr(uploaded.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  const runOcr = async (fileUrl: string) => {
    setIsOcrRunning(true)
    setError(null)
    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || "OCR failed")
      }

      const payload = await response.json()
      const fields = payload.data?.fields

      if (fields?.supplierName) {
        form.setValue("supplierName", fields.supplierName)
      }
      if (fields?.invoiceNumber) {
        form.setValue("invoiceNumber", fields.invoiceNumber)
      }
      if (fields?.invoiceDate) {
        form.setValue("invoiceDate", fields.invoiceDate)
      }
      if (fields?.totalAmount) {
        form.setValue("amountExGst", fields.totalAmount)
      }
      if (fields?.gstAmount) {
        form.setValue("gstAmount", fields.gstAmount)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "OCR failed")
    } finally {
      setIsOcrRunning(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {/* Expenditure Type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Expenditure Category
          </CardTitle>
          <CardDescription>
            Select the type of R&D expenditure (matches R&D Tax Incentive Schedule categories)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expenditureType">Expenditure Type *</Label>
            <Select
              value={expenditureType}
              onValueChange={(value) =>
                form.setValue("expenditureType", value as ExpenditureFormData["expenditureType"])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select expenditure type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(expenditureTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {typeInfo && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-start gap-3">
                <HelpCircle className="mt-0.5 h-5 w-5 text-primary" />
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{typeInfo.description}</p>
                  <div>
                    <p className="text-sm font-medium">Examples:</p>
                    <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
                      {typeInfo.examples.map((example, i) => (
                        <li key={i}>{example}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Amount Details */}
      <Card>
        <CardHeader>
          <CardTitle>Amount Details</CardTitle>
          <CardDescription>
            Enter the expenditure amount (GST exclusive)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amountExGst">Amount (Ex GST) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="amountExGst"
                  type="number"
                  step="0.01"
                  {...form.register("amountExGst")}
                  placeholder="0.00"
                  className="pl-7"
                />
              </div>
              {form.formState.errors.amountExGst && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.amountExGst.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="gstAmount">GST Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="gstAmount"
                  type="number"
                  step="0.01"
                  {...form.register("gstAmount")}
                  placeholder="0.00"
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                GST is not included in notional R&D deductions
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Describe what this expenditure was for..."
              rows={2}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="periodStart">Period Start</Label>
              <Input
                id="periodStart"
                type="date"
                {...form.register("periodStart")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodEnd">Period End</Label>
              <Input
                id="periodEnd"
                type="date"
                {...form.register("periodEnd")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attachments & OCR */}
      <Card>
        <CardHeader>
          <CardTitle>Attachments & OCR</CardTitle>
          <CardDescription>
            Upload invoices or receipts (max 10MB) and extract details with OCR
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="attachment">Upload File</Label>
            <Input
              id="attachment"
              type="file"
              accept="image/*,application/pdf"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  void handleUpload(file)
                }
              }}
              disabled={isUploading}
            />
            <p className="text-xs text-muted-foreground">
              Supported: PDF, PNG, JPG. Limit 10MB.
            </p>
          </div>

          {attachments.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Uploaded files</p>
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.url}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                  >
                    <a href={attachment.url} target="_blank" rel="noreferrer">
                      {attachment.fileName}
                    </a>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => runOcr(attachment.url)}
                        disabled={isOcrRunning}
                      >
                        {isOcrRunning ? "Running OCR..." : "Run OCR"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setAttachments((prev) =>
                            prev.filter((file) => file.url !== attachment.url)
                          )
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project and Activity Link */}
      <Card>
        <CardHeader>
          <CardTitle>Link to R&D Project/Activity</CardTitle>
          <CardDescription>
            Associate this expenditure with a specific project and/or activity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="projectId">R&D Project</Label>
              <Select
                value={form.watch("projectId")}
                onValueChange={(value) => form.setValue("projectId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No specific project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activityId">R&D Activity</Label>
              <Select
                value={form.watch("activityId")}
                onValueChange={(value) => form.setValue("activityId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select activity (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No specific activity</SelectItem>
                  {activities.map((activity) => (
                    <SelectItem key={activity.id} value={activity.id}>
                      {activity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supplier Information */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier Information</CardTitle>
          <CardDescription>
            Details about the supplier or payee
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="supplierName">Supplier Name</Label>
              <Input
                id="supplierName"
                {...form.register("supplierName")}
                placeholder="Company or individual name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplierAbn">Supplier ABN</Label>
              <Input
                id="supplierAbn"
                {...form.register("supplierAbn")}
                placeholder="12 345 678 901"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input
                id="invoiceNumber"
                {...form.register("invoiceNumber")}
                placeholder="INV-001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Invoice Date</Label>
              <Input
                id="invoiceDate"
                type="date"
                {...form.register("invoiceDate")}
              />
            </div>
          </div>

          {/* RSP Registration Number */}
          {isRsp && (
            <div className="space-y-2">
              <Label htmlFor="rspRegistrationNumber">RSP Registration Number *</Label>
              <Input
                id="rspRegistrationNumber"
                {...form.register("rspRegistrationNumber")}
                placeholder="Enter the Research Service Provider registration number"
              />
              <p className="text-xs text-muted-foreground">
                Required for RSP expenditure. Check the AusIndustry RSP register.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Special Flags */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
          <CardDescription>
            Special conditions that affect how this expenditure is treated
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...form.register("isOverseasExpense")}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm">Overseas expenditure</span>
            </label>

            {isAssociate && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...form.register("isPaid")}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm">Amount has been paid</span>
              </label>
            )}
          </div>

          {isAssociate && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Note:</strong> Associate expenditure can only be claimed when the amount has been paid.
                Ensure the payment date is recorded.
              </p>
            </div>
          )}

          {isAssociate && form.watch("isPaid") && (
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment Date</Label>
              <Input
                id="paymentDate"
                type="date"
                {...form.register("paymentDate")}
              />
            </div>
          )}

          {form.watch("isOverseasExpense") && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> Overseas expenditure requires an Overseas Finding from AusIndustry
                to be eligible for the R&D Tax Incentive.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Expenditure"}
        </Button>
      </div>
    </form>
  )
}
