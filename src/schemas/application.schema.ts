import { z } from 'zod'

export const registrationStatusSchema = z.enum([
  'NOT_STARTED',
  'DRAFT',
  'SUBMITTED',
  'REGISTERED',
  'REJECTED',
])

export const claimStatusSchema = z.enum([
  'NOT_STARTED',
  'IN_PROGRESS',
  'READY_FOR_REVIEW',
  'SUBMITTED',
  'COMPLETED',
])

export const applicationFormSchema = z.object({
  incomeYearStart: z.coerce.date(),
  incomeYearEnd: z.coerce.date(),
  ausIndustryNumber: z.string().optional().or(z.literal('')),
  registrationStatus: registrationStatusSchema.default('NOT_STARTED'),
  registrationDate: z.coerce.date().optional(),
})

export type ApplicationFormData = z.infer<typeof applicationFormSchema>

export const registrationStatusLabels: Record<string, string> = {
  NOT_STARTED: 'Not Started',
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  REGISTERED: 'Registered',
  REJECTED: 'Rejected',
}

export const claimStatusLabels: Record<string, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  READY_FOR_REVIEW: 'Ready for Review',
  SUBMITTED: 'Submitted',
  COMPLETED: 'Completed',
}

export const registrationStatusColors: Record<string, string> = {
  NOT_STARTED: 'secondary',
  DRAFT: 'warning',
  SUBMITTED: 'default',
  REGISTERED: 'success',
  REJECTED: 'destructive',
}
