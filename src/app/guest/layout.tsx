"use client"

import { GuestModeProvider } from "@/components/providers/guest-mode-provider"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { GuestBanner } from "@/components/guest/guest-banner"

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <GuestModeProvider>
      <div className="flex h-screen">
        <Sidebar isGuest />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header isGuest />
          <GuestBanner />
          <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
            {children}
          </main>
        </div>
      </div>
    </GuestModeProvider>
  )
}
