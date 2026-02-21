import { PrismaClient } from '@prisma/client'
import prisma from '@/lib/db'

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export abstract class BaseService {
  protected prisma: PrismaClient

  constructor() {
    this.prisma = prisma
  }

  protected async auditLog(
    action: string,
    entityType: string,
    entityId: string,
    userId?: string,
    oldValue?: unknown,
    newValue?: unknown
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        userId,
        oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
        newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
      },
    })
  }

  protected handleError(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }
    return 'An unexpected error occurred'
  }
}
