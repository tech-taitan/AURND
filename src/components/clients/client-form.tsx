"use client"

import { useState } from "react"
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
import { clientFormSchema, type ClientFormData } from "@/schemas/client.schema"

interface ClientFormProps {
  initialData?: Partial<ClientFormData>
  onSubmit: (data: ClientFormData) => Promise<void>
  isLoading?: boolean
}

export function ClientForm({ initialData, onSubmit, isLoading }: ClientFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      companyName: initialData?.companyName ?? "",
      abn: initialData?.abn ?? "",
      acn: initialData?.acn ?? "",
      tfn: initialData?.tfn ?? "",
      incorporationType: initialData?.incorporationType ?? "AUSTRALIAN_LAW",
      isConsolidatedGroup: initialData?.isConsolidatedGroup ?? false,
      isExemptControlled: initialData?.isExemptControlled ?? false,
      contactName: initialData?.contactName ?? "",
      contactEmail: initialData?.contactEmail ?? "",
      contactPhone: initialData?.contactPhone ?? "",
      address: {
        street: initialData?.address?.street ?? "",
        suburb: initialData?.address?.suburb ?? "",
        state: initialData?.address?.state ?? "",
        postcode: initialData?.address?.postcode ?? "",
        country: initialData?.address?.country ?? "",
      },
      incomeYearEndMonth: initialData?.incomeYearEndMonth ?? 6,
      incomeYearEndDay: initialData?.incomeYearEndDay ?? 30,
    },
  })

  const handleLookup = async () => {
    const abn = form.getValues("abn")
    if (!abn) {
      setLookupError("Please enter an ABN to lookup")
      return
    }

    setIsLookingUp(true)
    setLookupError(null)

    try {
      const response = await fetch(`/api/abn/lookup?abn=${encodeURIComponent(abn)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "ABN lookup failed")
      }

      form.setValue("companyName", data.data.companyName)
      if (data.data.address) {
        form.setValue("address.street", data.data.address.street || "")
        form.setValue("address.suburb", data.data.address.suburb || "")
        form.setValue("address.state", data.data.address.state || "")
        form.setValue("address.postcode", data.data.address.postcode || "")
        form.setValue("address.country", data.data.address.country || "")
      }
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "ABN lookup failed")
    } finally {
      setIsLookingUp(false)
    }
  }

  const handleSubmit = async (data: ClientFormData) => {
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

      {/* Company Details */}
      <Card>
        <CardHeader>
          <CardTitle>Company Details</CardTitle>
          <CardDescription>
            Basic information about the R&D entity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                {...form.register("companyName")}
                placeholder="Acme Corp Pty Ltd"
              />
              {form.formState.errors.companyName && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.companyName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="abn">ABN *</Label>
              <div className="flex gap-2">
                <Input
                  id="abn"
                  {...form.register("abn")}
                  placeholder="12 345 678 901"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLookup}
                  disabled={isLookingUp}
                >
                  {isLookingUp ? "Looking up..." : "Lookup"}
                </Button>
              </div>
              {form.formState.errors.abn && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.abn.message}
                </p>
              )}
              {lookupError && (
                <p className="text-sm text-destructive">{lookupError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="acn">ACN</Label>
              <Input
                id="acn"
                {...form.register("acn")}
                placeholder="123 456 789"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tfn">TFN (Encrypted)</Label>
              <Input
                id="tfn"
                type="password"
                {...form.register("tfn")}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="incorporationType">Incorporation Type *</Label>
              <Select
                value={form.watch("incorporationType")}
                onValueChange={(value) =>
                  form.setValue("incorporationType", value as ClientFormData["incorporationType"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select incorporation type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUSTRALIAN_LAW">
                    Incorporated under Australian law
                  </SelectItem>
                  <SelectItem value="FOREIGN_RESIDENT">
                    Foreign resident company
                  </SelectItem>
                  <SelectItem value="FOREIGN_PERMANENT_ESTABLISHMENT">
                    Foreign company with Australian PE
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aggregatedTurnover">Aggregated Turnover ($)</Label>
              <Input
                id="aggregatedTurnover"
                type="number"
                {...form.register("aggregatedTurnover")}
                placeholder="15000000"
              />
              <p className="text-xs text-muted-foreground">
                Determines refundable vs non-refundable offset eligibility ($20M threshold)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...form.register("isConsolidatedGroup")}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm">Part of consolidated group</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...form.register("isExemptControlled")}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm">Controlled by exempt entity</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
          <CardDescription>
            Registered address for the entity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address.street">Street</Label>
            <Input
              id="address.street"
              {...form.register("address.street")}
              placeholder="123 Example Street"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="address.suburb">Suburb</Label>
              <Input
                id="address.suburb"
                {...form.register("address.suburb")}
                placeholder="Sydney"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address.state">State</Label>
              <Input
                id="address.state"
                {...form.register("address.state")}
                placeholder="NSW"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="address.postcode">Postcode</Label>
              <Input
                id="address.postcode"
                {...form.register("address.postcode")}
                placeholder="2000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address.country">Country</Label>
              <Input
                id="address.country"
                {...form.register("address.country")}
                placeholder="Australia"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>
            Primary contact for R&D Tax matters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input
                id="contactName"
                {...form.register("contactName")}
                placeholder="John Smith"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                {...form.register("contactEmail")}
                placeholder="john@example.com"
              />
              {form.formState.errors.contactEmail && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.contactEmail.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                {...form.register("contactPhone")}
                placeholder="02 1234 5678"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Year */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Year End</CardTitle>
          <CardDescription>
            Used to calculate registration deadlines (default: 30 June)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="incomeYearEndMonth">Month</Label>
              <Select
                value={form.watch("incomeYearEndMonth")?.toString()}
                onValueChange={(value) =>
                  form.setValue("incomeYearEndMonth", parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"
                  ].map((month, i) => (
                    <SelectItem key={month} value={(i + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="incomeYearEndDay">Day</Label>
              <Select
                value={form.watch("incomeYearEndDay")?.toString()}
                onValueChange={(value) =>
                  form.setValue("incomeYearEndDay", parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Client"}
        </Button>
      </div>
    </form>
  )
}
