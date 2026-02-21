import { z } from 'zod'

export const expenditureTypeSchema = z.enum([
  'RSP',
  'CONTRACT_NON_RSP',
  'SALARY',
  'OTHER',
  'FEEDSTOCK_INPUT',
  'ASSOCIATE_PAID',
  'ASSET_DECLINE',
  'BALANCING_ADJ',
  'CRC_CONTRIBUTION',
])

export const expenditureBaseSchema = z.object({
  projectId: z.string().optional(),
  activityId: z.string().optional(),
  expenditureType: expenditureTypeSchema,
  amountExGst: z.string().min(1, 'Amount is required'),
  gstAmount: z.string().optional(),
  isAssociateExpense: z.boolean(),
  isPaid: z.boolean(),
  paymentDate: z.string().optional(),
  isOverseasExpense: z.boolean(),
  description: z.string().min(1, 'Description is required'),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  supplierName: z.string().optional(),
  supplierAbn: z.string().optional(),
  rspRegistrationNumber: z.string().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  attachments: z
    .array(
      z.object({
        fileName: z.string(),
        url: z.string(),
        mimeType: z.string(),
        size: z.number(),
      })
    )
    .optional(),
})

export const expenditureFormSchema = expenditureBaseSchema
  .superRefine((data, ctx) => {
    if (data.expenditureType === 'RSP' && !data.rspRegistrationNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'RSP registration number is required',
        path: ['rspRegistrationNumber'],
      })
    }

    if (data.expenditureType === 'ASSOCIATE_PAID' && !data.isPaid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Associate expenditure is only claimable when paid',
        path: ['isPaid'],
      })
    }

    if (data.periodStart && data.periodEnd) {
      const start = new Date(data.periodStart)
      const end = new Date(data.periodEnd)
      if (end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Period end must be after period start',
          path: ['periodEnd'],
        })
      }
    }
  })

export type ExpenditureFormData = z.infer<typeof expenditureFormSchema>

export const expenditureTypeLabels: Record<string, string> = {
  RSP: 'Research Service Provider',
  CONTRACT_NON_RSP: 'Contract (non-RSP)',
  SALARY: 'Salary Expenditure',
  OTHER: 'Other R&D Expenditure',
  FEEDSTOCK_INPUT: 'Feedstock Input',
  ASSOCIATE_PAID: 'Associate (Paid)',
  ASSET_DECLINE: 'Decline in Value of Assets',
  BALANCING_ADJ: 'Balancing Adjustment',
  CRC_CONTRIBUTION: 'CRC Contribution',
}
