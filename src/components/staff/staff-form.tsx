"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
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
import { staffFormSchema, type StaffFormData } from "@/schemas/staff.schema"

interface StaffFormProps {
  initialData?: Partial<StaffFormData>
  onSubmit: (data: StaffFormData) => Promise<void>
  isLoading?: boolean
}

export function StaffForm({ initialData, onSubmit, isLoading }: StaffFormProps) {
  const [error, setError] = useState<string | null>(null)

  const form = useForm<StaffFormData>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      position: initialData?.position ?? "",
      employeeId: initialData?.employeeId ?? "",
      annualSalary: initialData?.annualSalary ?? "",
      onCosts: initialData?.onCosts ?? "",
      hourlyRate: initialData?.hourlyRate ?? "",
      startDate: initialData?.startDate ?? "",
      endDate: initialData?.endDate ?? "",
    },
  })

  const handleSubmit = async (data: StaffFormData) => {
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
          <CardTitle>Staff Details</CardTitle>
          <CardDescription>Basic staff profile information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" {...form.register("name")} placeholder="Jane Doe" />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                {...form.register("position")}
                placeholder="Senior Engineer"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                {...form.register("employeeId")}
                placeholder="EMP-001"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Salary & Costs</CardTitle>
          <CardDescription>
            Used to calculate hourly rate and R&D cost allocation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="annualSalary">Annual Salary ($)</Label>
              <Input
                id="annualSalary"
                type="number"
                {...form.register("annualSalary")}
                placeholder="120000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="onCosts">On-Costs ($)</Label>
              <Input
                id="onCosts"
                type="number"
                {...form.register("onCosts")}
                placeholder="15000"
              />
              <p className="text-xs text-muted-foreground">
                Super, payroll tax, workers compensation, etc.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
              <Input
                id="hourlyRate"
                type="number"
                {...form.register("hourlyRate")}
                placeholder="65"
              />
              <p className="text-xs text-muted-foreground">
                Optional. If blank, calculated from salary + on-costs.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employment Dates</CardTitle>
          <CardDescription>Track employment period for allocation validity</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input id="startDate" type="date" {...form.register("startDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input id="endDate" type="date" {...form.register("endDate")} />
            {form.formState.errors.endDate && (
              <p className="text-sm text-destructive">
                {form.formState.errors.endDate.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Staff Member"}
        </Button>
      </div>
    </form>
  )
}
