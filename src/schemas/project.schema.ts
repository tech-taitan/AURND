import { z } from 'zod'

export const projectStatusSchema = z.enum([
  'PLANNING',
  'ACTIVE',
  'COMPLETED',
  'ABANDONED',
])

export const projectFormSchema = z.object({
  projectName: z.string().min(1, 'Project name is required'),
  projectCode: z.string().optional(),
  status: projectStatusSchema,
  projectDescription: z
    .string()
    .min(50, 'Project description must be at least 50 characters'),
  technicalHypothesis: z.string().optional(),
  methodology: z.string().optional(),
  technicalUncertainty: z.string().optional(),
  expectedOutcome: z.string().optional(),
  industryCode: z.string().optional(),
  fieldOfResearch: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export type ProjectFormData = z.infer<typeof projectFormSchema>

export const activityTypeSchema = z.enum([
  'CORE',
  'SUPPORTING_DIRECT',
  'SUPPORTING_DOMINANT_PURPOSE',
])

export const activityFormSchema = z
  .object({
  activityName: z.string().min(1, 'Activity name is required'),
  activityType: activityTypeSchema,
  activityDescription: z
    .string()
    .min(50, 'Activity description must be at least 50 characters'),
  hypothesis: z.string().optional(),
  experiment: z.string().optional(),
  observation: z.string().optional(),
  evaluation: z.string().optional(),
  conclusion: z.string().optional(),
  relatedCoreActivityId: z.string().optional(),
  dominantPurpose: z.string().optional(),
  isOverseasActivity: z.boolean(),
  overseasFindingId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      (data.activityType === 'SUPPORTING_DIRECT' ||
        data.activityType === 'SUPPORTING_DOMINANT_PURPOSE') &&
      !data.relatedCoreActivityId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Supporting activities must be linked to a core activity',
        path: ['relatedCoreActivityId'],
      })
    }

    if (data.activityType === 'SUPPORTING_DOMINANT_PURPOSE' && !data.dominantPurpose) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Dominant purpose justification is required',
        path: ['dominantPurpose'],
      })
    }
  })

export type ActivityFormData = z.infer<typeof activityFormSchema>
