"use client"

import Link from "next/link"
import { Info, LogIn, Download, Upload } from "lucide-react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useGuestMode, exitGuestMode } from "@/components/providers/guest-mode-provider"

export function GuestBanner() {
  const { guestService, refreshData } = useGuestMode()
  const [showImport, setShowImport] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    const data = guestService.exportData()
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "rd-guest-data.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = guestService.importData(reader.result as string)
      if (result.success) {
        refreshData()
        setShowImport(false)
      } else {
        alert(result.error)
      }
    }
    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSignIn = () => {
    exitGuestMode()
    window.location.href = "/auth/login"
  }

  return (
    <div className="flex flex-col gap-2 border-b border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-800 sm:flex-row sm:items-center sm:justify-between sm:gap-4 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 shrink-0" />
        <span>
          <strong>Guest Mode</strong><span className="hidden sm:inline"> &mdash; Data is stored in your browser only.</span>{" "}
          <button onClick={handleSignIn} className="underline hover:no-underline">
            Sign in
          </button>
          <span className="hidden sm:inline">{" "}to save securely.</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={handleExport} className="h-7 gap-1 text-yellow-800 dark:text-yellow-200">
          <Download className="h-3 w-3" />
          Export
        </Button>
        <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="h-7 gap-1 text-yellow-800 dark:text-yellow-200">
          <Upload className="h-3 w-3" />
          Import
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />
      </div>
    </div>
  )
}
