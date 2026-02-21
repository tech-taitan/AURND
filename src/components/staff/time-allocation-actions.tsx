"use client"

import Link from "next/link"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { deleteTimeAllocation } from "@/actions/time-allocations"

interface TimeAllocationActionsProps {
  clientId: string
  staffId: string
  allocationId: string
  projectId?: string
}

export function TimeAllocationActions({
  clientId,
  staffId,
  allocationId,
  projectId,
}: TimeAllocationActionsProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleDelete = () => {
    startTransition(async () => {
      await deleteTimeAllocation(allocationId, clientId, staffId, projectId)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="ghost" size="sm" asChild>
        <Link
          href={`/clients/${clientId}/staff/${staffId}/allocations/${allocationId}/edit`}
        >
          Edit
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={isPending}
      >
        Delete
      </Button>
    </div>
  )
}
