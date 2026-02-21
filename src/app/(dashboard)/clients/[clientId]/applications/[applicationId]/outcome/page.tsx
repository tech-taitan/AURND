"use client"

import { use, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react"

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
import { generateOutcomeLetter } from "@/actions/outcome"

interface PageProps {
  params: Promise<{ clientId: string; applicationId: string }>
}

export default function OutcomePage({ params }: PageProps) {
  const { clientId, applicationId } = use(params)
  const [approved, setApproved] = useState(true)
  const [offsetAmount, setOffsetAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async () => {
    setIsSaving(true)
    const result = await generateOutcomeLetter(applicationId, clientId, {
      approved,
      offsetAmount: Number(offsetAmount || 0),
      paymentDate: paymentDate ? new Date(paymentDate) : undefined,
      notes: notes || undefined,
    })
    if (result.success) {
      setNotes('')
    }
    setIsSaving(false)
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
          <h1 className="text-3xl font-bold">Outcome Confirmation</h1>
          <p className="text-muted-foreground">Generate the client confirmation letter</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>Record the outcome decision</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Button
            type="button"
            variant={approved ? "default" : "outline"}
            onClick={() => setApproved(true)}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Approved
          </Button>
          <Button
            type="button"
            variant={!approved ? "destructive" : "outline"}
            onClick={() => setApproved(false)}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Not Approved
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outcome Details</CardTitle>
          <CardDescription>Offset amount and payment timing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Offset Amount (AUD)</Label>
            <Input
              type="number"
              value={offsetAmount}
              onChange={(event) => setOffsetAmount(event.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label>Payment Date</Label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Optional notes for the letter"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? "Generating..." : "Generate Letter"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
