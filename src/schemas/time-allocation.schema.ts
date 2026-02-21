import { z } from 'zod'

export const timeAllocationBaseSchema = z.object({
  staffMemberId: z.string().min(1, 'Staff member is required'),
  activityId: z.string().min(1, 'Activity is required'),
  periodStart: z.string().min(1, 'Start date is required'),
  periodEnd: z.string().min(1, 'End date is required'),
  hoursAllocated: z.string().min(1, 'Hours allocated is required'),
  percentageOfTime: z.string().optional(),
  description: z.string().optional(),
})

export const timeAllocationFormSchema = timeAllocationBaseSchema
  .superRefine((data, ctx) => {
    const start = new Date(data.periodStart)
    const end = new Date(data.periodEnd)
    if (end < start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date must be after start date',
        path: ['periodEnd'],
      })
    }

    const hours = Number(data.hoursAllocated)
    if (Number.isNaN(hours) || hours <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Hours allocated must be a positive number',
        path: ['hoursAllocated'],
      })
    }

    if (data.percentageOfTime) {
      const percentage = Number(data.percentageOfTime)
      if (Number.isNaN(percentage) || percentage <= 0 || percentage > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Percentage of time must be between 1 and 100',
          path: ['percentageOfTime'],
        })
      }
    }
  })

export type TimeAllocationFormData = z.infer<typeof timeAllocationFormSchema>
