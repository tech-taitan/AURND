"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { GuestDataService } from "@/services/guest-data.service"

interface GuestModeContextValue {
  isGuest: true
  guestService: GuestDataService
  refreshData: () => void
  version: number
}

const GuestModeContext = createContext<GuestModeContextValue | null>(null)

export function GuestModeProvider({ children }: { children: ReactNode }) {
  const [service] = useState(() => new GuestDataService())
  const [version, setVersion] = useState(0)

  const refreshData = useCallback(() => {
    service.refresh()
    setVersion((v) => v + 1)
  }, [service])

  return (
    <GuestModeContext.Provider value={{ isGuest: true, guestService: service, refreshData, version }}>
      {children}
    </GuestModeContext.Provider>
  )
}

export function useGuestMode() {
  const ctx = useContext(GuestModeContext)
  if (!ctx) {
    throw new Error("useGuestMode must be used within GuestModeProvider")
  }
  return ctx
}

export function enterGuestMode() {
  document.cookie = "rd_guest_mode=1; path=/; max-age=31536000"
}

export function exitGuestMode() {
  document.cookie = "rd_guest_mode=; path=/; max-age=0"
}

export function isGuestModeCookie(): boolean {
  if (typeof document === "undefined") return false
  return document.cookie.includes("rd_guest_mode=1")
}
