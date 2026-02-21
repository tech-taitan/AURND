"use client"

import { useState } from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  applicationFormSchema,
  registrationStatusLabels,
  type ApplicationFormData,
} from "@/schemas/application.schema"

interface ApplicationFormProps {
  initialData?: Partial<ApplicationFormData>
  onSubmit: (data: ApplicationFormData) => Promise<void>
  isLoading?: boolean
}

export function ApplicationForm({
  initialData,
  onSubmit,
  isLoading,
}: ApplicationFormProps) {
  const [error, setError] = useState<string | null>(null)

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationFormSchema) as Resolver<ApplicationFormData>,
    defaultValues: {
      incomeYearStart: initialData?.incomeYearStart || new Date(),
      incomeYearEnd: initialData?.incomeYearEnd || new Date(),
      ausIndustryNumber: initialData?.ausIndustryNumber || "",
      registrationStatus: initialData?.registrationStatus || "NOT_STARTED",
      registrationDate: initialData?.registrationDate,
    },
  })

  const handleSubmit = async (data: ApplicationFormData) => {
    try {
      setError(null)
      await onSubmit(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Income Year</CardTitle>
          <CardDescription>Define the financial year covered by this application</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="incomeYearStart">Income Year Start *</Label>
            <Input
              id="incomeYearStart"
              type="date"
              value={form.watch("incomeYearStart")
                ? new Date(form.watch("incomeYearStart")).toISOString().slice(0, 10)
                : ""}
              onChange={(event) =>
                form.setValue("incomeYearStart", new Date(event.target.value))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="incomeYearEnd">Income Year End *</Label>
            <Input
              id="incomeYearEnd"
              type="date"
              value={form.watch("incomeYearEnd")
                ? new Date(form.watch("incomeYearEnd")).toISOString().slice(0, 10)
                : ""}
              onChange={(event) =>
                form.setValue("incomeYearEnd", new Date(event.target.value))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registration Details</CardTitle>
          <CardDescription>Track AusIndustry registration status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ausIndustryNumber">AusIndustry Registration Number</Label>
            <Input
              id="ausIndustryNumber"
              {...form.register("ausIndustryNumber")}
              placeholder="RN123456"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="registrationStatus">Registration Status</Label>
              <Select
                value={form.watch("registrationStatus")}
                onValueChange={(value) =>
                  form.setValue("registrationStatus", value as ApplicationFormData["registrationStatus"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(registrationStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="registrationDate">Registration Date</Label>
              <Input
                id="registrationDate"
                type="date"
                value={
                  form.watch("registrationDate")
                    ? new Date(form.watch("registrationDate") as Date)
                        .toISOString()
                        .slice(0, 10)
                    : ""
                }
                onChange={(event) =>
                  form.setValue(
                    "registrationDate",
                    event.target.value ? new Date(event.target.value) : undefined
                  )
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Application"}
        </Button>
      </div>
    </form>
  )
}
