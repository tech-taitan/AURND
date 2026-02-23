/**
 * Shared action result type used by both server services and guest (client-side) services.
 * Kept separate from base.service.ts to avoid pulling Prisma into client bundles.
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }
