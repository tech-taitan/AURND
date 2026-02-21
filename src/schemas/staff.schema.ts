import { z } from 'zod'

export const staffBaseSchema = z.object({
  name: z.string().min(1, 'Staff name is required'),
  position: z.string().optional(),
  employeeId: z.string().optional(),
  annualSalary: z.string().optional(),
  onCosts: z.string().optional(),
  hourlyRate: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const staffFormSchema = staffBaseSchema
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate)
      const end = new Date(data.endDate)
      if (end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End date must be after start date',
          path: ['endDate'],
        })
      }
    }
  })

export type StaffFormData = z.infer<typeof staffFormSchema>
