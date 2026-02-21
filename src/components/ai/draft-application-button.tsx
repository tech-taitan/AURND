"use client"

import { useState } from "react"
import type { ApplicationDraft } from "@/types/ai-review"
import { Button } from "@/components/ui/button"
import { DraftApplicationPanel } from "./draft-application-panel"

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  )
}

interface DraftApplicationButtonProps {
  applicationId: string
  disabled?: boolean
  className?: string
}

export function DraftApplicationButton({
  applicationId,
  disabled,
  className,
}: DraftApplicationButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [draft, setDraft] = useState<ApplicationDraft | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/applications/${applicationId}/draft`, {
        method: "POST",
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to draft application")
      }

      setDraft(data.data)
      setIsOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to draft application")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={isLoading || disabled}
        className={className}
      >
        <SparklesIcon className="mr-2 h-4 w-4" />
        {isLoading ? "Drafting..." : "Draft Application"}
      </Button>

      {error && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-4 font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <DraftApplicationPanel
        applicationId={applicationId}
        draft={draft}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onUpdateDraft={(updated) => setDraft(updated)}
      />
    </>
  )
}
