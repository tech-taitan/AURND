import { z } from 'zod'

export const incorporationTypeSchema = z.enum([
  'AUSTRALIAN_LAW',
  'FOREIGN_RESIDENT',
  'FOREIGN_PERMANENT_ESTABLISHMENT',
])

export const clientFormSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  abn: z
    .string()
    .min(11, 'ABN must be 11 digits')
    .max(14, 'ABN must be 11 digits')
    .regex(/^[\d\s]+$/, 'ABN must contain only numbers'),
  acn: z.string().optional(),
  tfn: z.string().optional(),
  incorporationType: incorporationTypeSchema,
  isConsolidatedGroup: z.boolean(),
  headCompanyId: z.string().optional(),
  aggregatedTurnover: z.string().optional(),
  isExemptControlled: z.boolean(),
  contactName: z.string().optional(),
  contactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  address: z
    .object({
      street: z.string().optional(),
      suburb: z.string().optional(),
      state: z.string().optional(),
      postcode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  incomeYearEndMonth: z.number().min(1).max(12),
  incomeYearEndDay: z.number().min(1).max(31),
})

export type ClientFormData = z.infer<typeof clientFormSchema>

export const clientSearchSchema = z.object({
  query: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
})

export type ClientSearchParams = z.infer<typeof clientSearchSchema>
