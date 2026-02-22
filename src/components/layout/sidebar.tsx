"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2,
  FileText,
  FolderKanban,
  Home,
  Settings,
  Users,
  Calculator,
  ClipboardCheck,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Clients", href: "/clients", icon: Building2 },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Applications", href: "/applications", icon: FileText },
  { name: "Compliance", href: "/compliance", icon: ClipboardCheck },
  { name: "Calculator", href: "/calculator", icon: Calculator },
]

const secondaryNavigation = [
  { name: "Team", href: "/team", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
]

interface SidebarProps {
  isGuest?: boolean
}

export function Sidebar({ isGuest }: SidebarProps) {
  const pathname = usePathname()
  const prefix = isGuest ? "/guest" : ""

  const isActive = (href: string) => {
    const fullHref = prefix + href
    if (fullHref === "/guest" || fullHref === "/") {
      return pathname === fullHref
    }
    return pathname === fullHref || pathname.startsWith(fullHref + "/")
  }

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href={prefix + "/"} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Calculator className="h-5 w-5" />
          </div>
          <span className="font-semibold">R&D Tax App</span>
        </Link>
        {isGuest && (
          <Badge variant="secondary" className="ml-2 text-xs">
            Guest
          </Badge>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        <div className="space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={prefix + item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </div>

        {!isGuest && (
          <>
            <div className="my-4 border-t" />
            <div className="space-y-1">
              {secondaryNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              ))}
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="text-xs text-muted-foreground">
          <p>Australian R&D Tax Incentive</p>
          <p>Application Manager</p>
        </div>
      </div>
    </div>
  )
}
