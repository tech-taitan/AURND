"use client"

import { useState } from "react"
import type { ApplicationDraft } from "@/types/ai-review"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface DraftApplicationPanelProps {
  applicationId: string
  draft: ApplicationDraft | null
  isOpen: boolean
  onClose: () => void
  onUpdateDraft: (draft: ApplicationDraft) => void
}

const sectionTitles: Record<string, string> = {
  executiveSummary: "Executive Summary",
  projectNarratives: "Project Narratives",
  activityDescriptions: "Activity Descriptions",
  expenditureSummary: "Expenditure Summary",
  technicalUncertaintyStatement: "Technical Uncertainty",
}

export function DraftApplicationPanel({
  applicationId,
  draft,
  isOpen,
  onClose,
  onUpdateDraft,
}: DraftApplicationPanelProps) {
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!draft) return null

  const handleRegenerate = async (sectionKey: keyof ApplicationDraft) => {
    setIsRegenerating(sectionKey)
    setError(null)

    try {
      const response = await fetch(`/api/applications/${applicationId}/draft`, {
        method: "POST",
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to regenerate section")
      }

      const updated: ApplicationDraft = {
        ...draft,
        [sectionKey]: data.data[sectionKey],
      }

      onUpdateDraft(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate section")
    } finally {
      setIsRegenerating(null)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/applications/${applicationId}/documents/full-pack`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draft }),
        }
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to export documents")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export documents")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Draft R&D Application</DialogTitle>
          <DialogDescription>
            Review and edit the AI-drafted application before exporting.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <section className="space-y-2 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{sectionTitles.executiveSummary}</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRegenerate("executiveSummary")}
                  disabled={isRegenerating === "executiveSummary"}
                >
                  {isRegenerating === "executiveSummary" ? "Regenerating..." : "Regenerate"}
                </Button>
              </div>
            </div>
            <Textarea
              value={draft.executiveSummary}
              onChange={(event) =>
                onUpdateDraft({ ...draft, executiveSummary: event.target.value })
              }
              rows={4}
            />
          </section>

          <section className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{sectionTitles.projectNarratives}</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRegenerate("projectNarratives")}
                disabled={isRegenerating === "projectNarratives"}
              >
                {isRegenerating === "projectNarratives" ? "Regenerating..." : "Regenerate"}
              </Button>
            </div>
            {draft.projectNarratives.map((project) => (
              <div key={project.projectId} className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">{project.projectName}</p>
                <Textarea
                  value={project.overview}
                  onChange={(event) => {
                    const updated = draft.projectNarratives.map((item) =>
                      item.projectId === project.projectId
                        ? { ...item, overview: event.target.value }
                        : item
                    )
                    onUpdateDraft({ ...draft, projectNarratives: updated })
                  }}
                  rows={3}
                />
              </div>
            ))}
          </section>

          <section className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{sectionTitles.activityDescriptions}</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRegenerate("activityDescriptions")}
                disabled={isRegenerating === "activityDescriptions"}
              >
                {isRegenerating === "activityDescriptions" ? "Regenerating..." : "Regenerate"}
              </Button>
            </div>
            {draft.activityDescriptions.map((activity) => (
              <div key={activity.activityId} className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">{activity.activityName}</p>
                <Textarea
                  value={activity.hypothesis}
                  onChange={(event) => {
                    const updated = draft.activityDescriptions.map((item) =>
                      item.activityId === activity.activityId
                        ? { ...item, hypothesis: event.target.value }
                        : item
                    )
                    onUpdateDraft({ ...draft, activityDescriptions: updated })
                  }}
                  rows={2}
                />
              </div>
            ))}
          </section>

          <section className="space-y-2 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{sectionTitles.expenditureSummary}</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRegenerate("expenditureSummary")}
                disabled={isRegenerating === "expenditureSummary"}
              >
                {isRegenerating === "expenditureSummary" ? "Regenerating..." : "Regenerate"}
              </Button>
            </div>
            <Textarea
              value={draft.expenditureSummary.narrative}
              onChange={(event) =>
                onUpdateDraft({
                  ...draft,
                  expenditureSummary: {
                    ...draft.expenditureSummary,
                    narrative: event.target.value,
                  },
                })
              }
              rows={3}
            />
          </section>

          <section className="space-y-2 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{sectionTitles.technicalUncertaintyStatement}</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRegenerate("technicalUncertaintyStatement")}
                disabled={isRegenerating === "technicalUncertaintyStatement"}
              >
                {isRegenerating === "technicalUncertaintyStatement" ? "Regenerating..." : "Regenerate"}
              </Button>
            </div>
            <Textarea
              value={draft.technicalUncertaintyStatement}
              onChange={(event) =>
                onUpdateDraft({
                  ...draft,
                  technicalUncertaintyStatement: event.target.value,
                })
              }
              rows={3}
            />
          </section>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? "Exporting..." : "Export to DOCX"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
