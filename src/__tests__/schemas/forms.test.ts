import { describe, it, expect } from 'vitest'
import { applicationFormSchema } from '@/schemas/application.schema'
import { clientFormSchema } from '@/schemas/client.schema'
import { expenditureFormSchema } from '@/schemas/expenditure.schema'
import { activityFormSchema, projectFormSchema } from '@/schemas/project.schema'
import { staffFormSchema } from '@/schemas/staff.schema'
import { timeAllocationFormSchema } from '@/schemas/time-allocation.schema'
import {
  exampleActivityForm,
  exampleApplicationForm,
  exampleClientForm,
  exampleExpenditureForm,
  exampleProjectForm,
  exampleStaffForm,
  exampleTimeAllocationForm,
  exampleSupportingActivityForm,
} from '../fixtures/data'

describe('Form schemas', () => {
  it('validates example client data', () => {
    expect(clientFormSchema.safeParse(exampleClientForm).success).toBe(true)
  })

  it('validates example application data', () => {
    expect(applicationFormSchema.safeParse(exampleApplicationForm).success).toBe(true)
  })

  it('validates example project data', () => {
    expect(projectFormSchema.safeParse(exampleProjectForm).success).toBe(true)
  })

  it('validates example activity data', () => {
    expect(activityFormSchema.safeParse(exampleActivityForm).success).toBe(true)
  })

  it('requires core activity link for supporting activities', () => {
    const invalid = { ...exampleSupportingActivityForm, relatedCoreActivityId: undefined }
    const result = activityFormSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('validates example staff data', () => {
    expect(staffFormSchema.safeParse(exampleStaffForm).success).toBe(true)
  })

  it('rejects staff with end date before start date', () => {
    const invalid = { ...exampleStaffForm, endDate: '2024-01-01' }
    const result = staffFormSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('validates example expenditure data', () => {
    expect(expenditureFormSchema.safeParse(exampleExpenditureForm).success).toBe(true)
  })

  it('requires RSP registration number for RSP expenditure', () => {
    const invalid = { ...exampleExpenditureForm, rspRegistrationNumber: undefined }
    const result = expenditureFormSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('validates example time allocation data', () => {
    expect(timeAllocationFormSchema.safeParse(exampleTimeAllocationForm).success).toBe(true)
  })

  it('rejects negative hours in time allocation', () => {
    const invalid = { ...exampleTimeAllocationForm, hoursAllocated: '-5' }
    const result = timeAllocationFormSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})
