"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { getSubmissionTracking, updateSubmissionTracking } from "@/actions/submission"

interface PageProps {
  params: Promise<{ clientId: string; applicationId: string }>
}

const statusOptions = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'INFO_REQUESTED',
  'RESPONDED',
  'APPROVED',
  'REJECTED',
] as const

export default function SubmissionTrackingPage({ params }: PageProps) {
  const { clientId, applicationId } = use(params)
  const [tracking, setTracking] = useState<Awaited<ReturnType<typeof getSubmissionTracking>> | null>(null)
  const [status, setStatus] = useState<string>('DRAFT')
  const [externalReference, setExternalReference] = useState('')
  const [note, setNote] = useState('')
  const [responseDraft, setResponseDraft] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function loadTracking() {
      const data = await getSubmissionTracking(applicationId)
      setTracking(data)
      setStatus(data.status)
      setExternalReference(data.externalReference || '')
      setResponseDraft(data.responseDraft || '')
    }
    loadTracking()
  }, [applicationId])

  const handleSubmit = async () => {
    setIsSaving(true)
    const result = await updateSubmissionTracking(applicationId, clientId, {
      status: status as (typeof statusOptions)[number],
      note: note || undefined,
      externalReference: externalReference || undefined,
      responseDraft: responseDraft || undefined,
    })
    if (result.success) {
      const updated = await getSubmissionTracking(applicationId)
      setTracking(updated)
      setNote('')
    }
    setIsSaving(false)
  }

  if (!tracking) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading submission tracking...</p>
      </div>
    )
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
          <h1 className="text-3xl font-bold">Submission Tracking</h1>
          <p className="text-muted-foreground">Track submission status and responses</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Current Status
          </CardTitle>
          <CardDescription>Update the submission status and notes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>External Reference</Label>
              <Input
                value={externalReference}
                onChange={(event) => setExternalReference(event.target.value)}
                placeholder="Submission reference"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status Note</Label>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add context about the current status"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Response Draft</Label>
            <Textarea
              value={responseDraft}
              onChange={(event) => setResponseDraft(event.target.value)}
              placeholder="Draft response to information requests"
              rows={4}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Update'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status History</CardTitle>
          <CardDescription>Latest status updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tracking.events.length === 0 ? (
            <p className="text-muted-foreground">No updates yet.</p>
          ) : (
            tracking.events.map((event) => (
              <div key={event.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{event.status}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.createdAt).toLocaleString("en-AU")}
                  </span>
                </div>
                {event.note && <p className="mt-2 text-sm">{event.note}</p>}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
