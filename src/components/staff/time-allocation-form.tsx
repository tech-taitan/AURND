"use client"

import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

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
  timeAllocationFormSchema,
  type TimeAllocationFormData,
} from "@/schemas/time-allocation.schema"

interface StaffOption {
  id: string
  name: string
  hourlyRate?: number | null
}

interface ActivityOption {
  id: string
  name: string
  projectName?: string
}

interface TimeAllocationFormProps {
  initialData?: Partial<TimeAllocationFormData>
  staffOptions: StaffOption[]
  activityOptions: ActivityOption[]
  onSubmit: (data: TimeAllocationFormData) => Promise<void>
  isLoading?: boolean
}

export function TimeAllocationForm({
  initialData,
  staffOptions,
  activityOptions,
  onSubmit,
  isLoading,
}: TimeAllocationFormProps) {
  const [error, setError] = useState<string | null>(null)

  const form = useForm<TimeAllocationFormData>({
    resolver: zodResolver(timeAllocationFormSchema),
    defaultValues: {
      staffMemberId: initialData?.staffMemberId ?? "",
      activityId: initialData?.activityId ?? "",
      periodStart: initialData?.periodStart ?? "",
      periodEnd: initialData?.periodEnd ?? "",
      hoursAllocated: initialData?.hoursAllocated ?? "",
      percentageOfTime: initialData?.percentageOfTime ?? "",
      description: initialData?.description ?? "",
    },
  })

  const selectedStaff = form.watch("staffMemberId")
  const hoursAllocated = form.watch("hoursAllocated")

  const estimatedCost = useMemo(() => {
    if (!selectedStaff || !hoursAllocated) return null
    const staff = staffOptions.find((option) => option.id === selectedStaff)
    if (!staff?.hourlyRate) return null
    const hours = Number(hoursAllocated)
    if (Number.isNaN(hours)) return null
    return staff.hourlyRate * hours
  }, [selectedStaff, hoursAllocated, staffOptions])

  const handleSubmit = async (data: TimeAllocationFormData) => {
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
          <CardTitle>Allocation Details</CardTitle>
          <CardDescription>Assign staff time to a specific R&D activity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="staffMemberId">Staff Member *</Label>
              <Select
                value={form.watch("staffMemberId")}
                onValueChange={(value) => form.setValue("staffMemberId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staffOptions.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.staffMemberId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.staffMemberId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="activityId">Activity *</Label>
              <Select
                value={form.watch("activityId")}
                onValueChange={(value) => form.setValue("activityId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select activity" />
                </SelectTrigger>
                <SelectContent>
                  {activityOptions.map((activity) => (
                    <SelectItem key={activity.id} value={activity.id}>
                      {activity.projectName
                        ? `${activity.projectName} — ${activity.name}`
                        : activity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.activityId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.activityId.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="periodStart">Period Start *</Label>
              <Input id="periodStart" type="date" {...form.register("periodStart")} />
              {form.formState.errors.periodStart && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.periodStart.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodEnd">Period End *</Label>
              <Input id="periodEnd" type="date" {...form.register("periodEnd")} />
              {form.formState.errors.periodEnd && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.periodEnd.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hoursAllocated">Hours Allocated *</Label>
              <Input
                id="hoursAllocated"
                type="number"
                step="0.1"
                {...form.register("hoursAllocated")}
                placeholder="24"
              />
              {form.formState.errors.hoursAllocated && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.hoursAllocated.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="percentageOfTime">Percentage of Time (%)</Label>
              <Input
                id="percentageOfTime"
                type="number"
                step="0.1"
                {...form.register("percentageOfTime")}
                placeholder="25"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Notes</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Optional notes about the allocation"
              rows={3}
            />
          </div>

          {estimatedCost !== null && (
            <div className="rounded-lg border bg-muted/50 p-3 text-sm">
              Estimated cost: ${estimatedCost.toFixed(2)}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Allocation"}
        </Button>
      </div>
    </form>
  )
}
