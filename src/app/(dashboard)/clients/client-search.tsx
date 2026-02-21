"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface ClientSearchProps {
  initialSearch?: string
}

export function ClientSearch({ initialSearch }: ClientSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(initialSearch || "")

  const handleSearch = () => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (search) {
        params.set("search", search)
      } else {
        params.delete("search")
      }
      params.delete("page") // Reset to page 1 on new search
      router.push(`/clients?${params.toString()}`)
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const handleClear = () => {
    setSearch("")
    startTransition(() => {
      router.push("/clients")
    })
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by company name, ABN, or contact..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isPending}
            />
          </div>
          <Button onClick={handleSearch} disabled={isPending}>
            {isPending ? "Searching..." : "Search"}
          </Button>
          {initialSearch && (
            <Button variant="outline" onClick={handleClear} disabled={isPending}>
              Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
