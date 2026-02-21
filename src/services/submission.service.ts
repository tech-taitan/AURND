import { BaseService, ActionResult } from './base.service'

export type SubmissionStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'INFO_REQUESTED'
  | 'RESPONDED'
  | 'APPROVED'
  | 'REJECTED'

export interface SubmissionUpdateInput {
  status: SubmissionStatus
  note?: string
  externalReference?: string
  responseDraft?: string
}

export type SubmissionTrackingView = {
  id: string
  applicationId: string
  status: SubmissionStatus
  externalReference: string | null
  submittedAt: Date | null
  lastUpdated: Date
  notes: string | null
  responseDraft: string | null
  events: Array<{
    id: string
    status: SubmissionStatus
    note: string | null
    createdAt: Date
  }>
}

class SubmissionService extends BaseService {
  private get submissionPrisma() {
    return this.prisma as unknown as {
      submissionTracking: {
        findUnique: (args: unknown) => Promise<SubmissionTrackingView | null>
        create: (args: unknown) => Promise<SubmissionTrackingView>
        update: (args: unknown) => Promise<SubmissionTrackingView>
      }
      submissionEvent: {
        create: (args: unknown) => Promise<{ id: string }>
      }
    }
  }

  private async ensureTracking(applicationId: string): Promise<SubmissionTrackingView> {
    const tracking = await this.submissionPrisma.submissionTracking.findUnique({
      where: { applicationId },
      include: { events: { orderBy: { createdAt: 'desc' } } },
    })

    if (tracking) return tracking as SubmissionTrackingView

    const created = await this.submissionPrisma.submissionTracking.create({
      data: {
        applicationId,
        status: 'DRAFT',
      },
      include: { events: { orderBy: { createdAt: 'desc' } } },
    })

    return created as SubmissionTrackingView
  }

  async get(applicationId: string): Promise<SubmissionTrackingView> {
    return this.ensureTracking(applicationId)
  }

  async update(
    applicationId: string,
    input: SubmissionUpdateInput,
    userId?: string
  ): Promise<ActionResult<SubmissionTrackingView>> {
    try {
      const tracking = await this.ensureTracking(applicationId)

      const updated = await this.submissionPrisma.submissionTracking.update({
        where: { id: tracking.id },
        data: {
          status: input.status,
          externalReference: input.externalReference ?? tracking.externalReference,
          notes: input.note ?? tracking.notes,
          responseDraft: input.responseDraft ?? tracking.responseDraft,
          submittedAt:
            input.status === 'SUBMITTED'
              ? tracking.submittedAt ?? new Date()
              : tracking.submittedAt,
        },
        include: { events: { orderBy: { createdAt: 'desc' } } },
      })

      await this.submissionPrisma.submissionEvent.create({
        data: {
          trackingId: tracking.id,
          status: input.status,
          note: input.note || null,
        },
      })

      await this.auditLog(
        'UPDATE',
        'SubmissionTracking',
        tracking.id,
        userId,
        tracking,
        updated
      )

      const refreshed = await this.submissionPrisma.submissionTracking.findUnique({
        where: { id: tracking.id },
        include: { events: { orderBy: { createdAt: 'desc' } } },
      })

      return { success: true, data: refreshed as SubmissionTrackingView }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }
}

export const submissionService = new SubmissionService()
