/**
 * Guest Data Service
 *
 * Provides CRUD operations backed by browser localStorage.
 * All data is stored under a single key 'rd_guest_data'.
 * Returns ActionResult<T> for compatibility with existing UI patterns.
 */

import type { ActionResult } from '@/types/actions'
import { calculateRegistrationDeadline } from './tax-offset-calculator.service'

// ---------- Type definitions for guest data ----------

export interface GuestClient {
  id: string
  companyName: string
  abn: string
  acn?: string
  incorporationType: string
  isConsolidatedGroup: boolean
  isExemptControlled: boolean
  aggregatedTurnover?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  address?: {
    street?: string
    suburb?: string
    state?: string
    postcode?: string
    country?: string
  }
  incomeYearEndMonth: number
  incomeYearEndDay: number
  createdAt: string
  updatedAt: string
}

export interface GuestProject {
  id: string
  clientId: string
  projectName: string
  projectCode?: string
  status: string
  projectDescription: string
  technicalHypothesis?: string
  methodology?: string
  technicalUncertainty?: string
  expectedOutcome?: string
  industryCode?: string
  fieldOfResearch?: string
  startDate?: string
  endDate?: string
  createdAt: string
  updatedAt: string
}

export interface GuestActivity {
  id: string
  projectId: string
  activityName: string
  activityType: string
  activityDescription: string
  hypothesis?: string
  experiment?: string
  observation?: string
  evaluation?: string
  conclusion?: string
  relatedCoreActivityId?: string
  dominantPurpose?: string
  isOverseasActivity: boolean
  overseasFindingId?: string
  createdAt: string
  updatedAt: string
}

export interface GuestApplication {
  id: string
  clientId: string
  incomeYearStart: string
  incomeYearEnd: string
  ausIndustryNumber?: string
  registrationStatus: string
  registrationDate?: string
  claimStatus: string
  refundableOffset?: number
  nonRefundableOffset?: number
  createdAt: string
  updatedAt: string
}

export interface GuestExpenditure {
  id: string
  applicationId: string
  projectId?: string
  activityId?: string
  expenditureType: string
  amountExGst: string
  gstAmount?: string
  isAssociateExpense: boolean
  isPaid: boolean
  paymentDate?: string
  isOverseasExpense: boolean
  description: string
  invoiceNumber?: string
  invoiceDate?: string
  supplierName?: string
  supplierAbn?: string
  rspRegistrationNumber?: string
  periodStart?: string
  periodEnd?: string
  createdAt: string
  updatedAt: string
}

export interface GuestStaff {
  id: string
  clientId: string
  name: string
  position?: string
  employeeId?: string
  annualSalary?: string
  onCosts?: string
  hourlyRate?: string
  startDate?: string
  endDate?: string
  createdAt: string
  updatedAt: string
}

export interface GuestTimeAllocation {
  id: string
  staffMemberId: string
  activityId: string
  periodStart: string
  periodEnd: string
  hoursAllocated: string
  percentageOfTime?: string
  description?: string
  createdAt: string
  updatedAt: string
}

interface GuestData {
  clients: GuestClient[]
  projects: GuestProject[]
  activities: GuestActivity[]
  applications: GuestApplication[]
  expenditures: GuestExpenditure[]
  staff: GuestStaff[]
  timeAllocations: GuestTimeAllocation[]
}

export interface GuestDashboardStats {
  totalClients: number
  activeApplications: number
  totalExpenditure: number
  expectedOffset: number
}

export interface GuestUpcomingDeadline {
  clientId: string
  clientName: string
  deadline: Date
  type: string
  daysRemaining: number
}

const STORAGE_KEY = 'rd_guest_data'

function emptyData(): GuestData {
  return {
    clients: [],
    projects: [],
    activities: [],
    applications: [],
    expenditures: [],
    staff: [],
    timeAllocations: [],
  }
}

export class GuestDataService {
  private data: GuestData

  constructor() {
    this.data = this.load()
  }

  // ---------- Persistence ----------

  private load(): GuestData {
    if (typeof window === 'undefined') return emptyData()
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return emptyData()
      return JSON.parse(raw) as GuestData
    } catch {
      return emptyData()
    }
  }

  private save(): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data))
  }

  refresh(): void {
    this.data = this.load()
  }

  clearAll(): void {
    this.data = emptyData()
    this.save()
  }

  exportData(): string {
    return JSON.stringify(this.data, null, 2)
  }

  importData(json: string): ActionResult<void> {
    try {
      const parsed = JSON.parse(json) as GuestData
      if (!parsed.clients || !Array.isArray(parsed.clients)) {
        return { success: false, error: 'Invalid data format' }
      }
      this.data = parsed
      this.save()
      return { success: true, data: undefined }
    } catch {
      return { success: false, error: 'Invalid JSON' }
    }
  }

  // ---------- Dashboard ----------

  getStats(): GuestDashboardStats {
    const totalClients = this.data.clients.length
    const activeApplications = this.data.applications.filter(
      (a) => a.claimStatus !== 'COMPLETED'
    ).length

    let totalExpenditure = 0
    let expectedOffset = 0

    for (const app of this.data.applications) {
      if (app.claimStatus === 'COMPLETED') continue
      const appExpenditures = this.data.expenditures.filter(
        (e) => e.applicationId === app.id
      )
      const appTotal = appExpenditures.reduce(
        (sum, e) => sum + Number(e.amountExGst || 0),
        0
      )
      totalExpenditure += appTotal
      if (app.refundableOffset) {
        expectedOffset += app.refundableOffset
      } else if (app.nonRefundableOffset) {
        expectedOffset += app.nonRefundableOffset
      } else {
        expectedOffset += appTotal * 0.435
      }
    }

    return { totalClients, activeApplications, totalExpenditure, expectedOffset }
  }

  getUpcomingDeadlines(limit: number = 5): GuestUpcomingDeadline[] {
    const now = new Date()
    const deadlines: GuestUpcomingDeadline[] = []

    for (const client of this.data.clients) {
      const currentYear = now.getFullYear()
      let fyEndDate = new Date(
        currentYear,
        client.incomeYearEndMonth - 1,
        client.incomeYearEndDay
      )
      if (fyEndDate < now) {
        fyEndDate = new Date(
          currentYear + 1,
          client.incomeYearEndMonth - 1,
          client.incomeYearEndDay
        )
      }
      const registrationDeadline = calculateRegistrationDeadline(fyEndDate)
      const daysRemaining = Math.ceil(
        (registrationDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysRemaining > 0 && daysRemaining <= 180) {
        deadlines.push({
          clientId: client.id,
          clientName: client.companyName,
          deadline: registrationDeadline,
          type: 'Registration Deadline',
          daysRemaining,
        })
      }
    }

    return deadlines
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, limit)
  }

  // ---------- Clients ----------

  listClients(search?: string): { data: GuestClient[]; total: number } {
    let filtered = this.data.clients
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.companyName.toLowerCase().includes(q) ||
          c.abn.includes(q) ||
          c.contactName?.toLowerCase().includes(q)
      )
    }
    return { data: filtered, total: filtered.length }
  }

  getClient(id: string): ActionResult<GuestClient> {
    const client = this.data.clients.find((c) => c.id === id)
    if (!client) return { success: false, error: 'Client not found' }
    return { success: true, data: client }
  }

  createClient(input: Omit<GuestClient, 'id' | 'createdAt' | 'updatedAt'>): ActionResult<GuestClient> {
    const now = new Date().toISOString()
    const client: GuestClient = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }
    this.data.clients.push(client)
    this.save()
    return { success: true, data: client }
  }

  updateClient(id: string, input: Partial<GuestClient>): ActionResult<GuestClient> {
    const idx = this.data.clients.findIndex((c) => c.id === id)
    if (idx === -1) return { success: false, error: 'Client not found' }
    this.data.clients[idx] = {
      ...this.data.clients[idx],
      ...input,
      id,
      updatedAt: new Date().toISOString(),
    }
    this.save()
    return { success: true, data: this.data.clients[idx] }
  }

  deleteClient(id: string): ActionResult<void> {
    const idx = this.data.clients.findIndex((c) => c.id === id)
    if (idx === -1) return { success: false, error: 'Client not found' }
    this.data.clients.splice(idx, 1)
    // Cascade delete related data
    const projectIds = this.data.projects.filter((p) => p.clientId === id).map((p) => p.id)
    this.data.projects = this.data.projects.filter((p) => p.clientId !== id)
    const activityIds = this.data.activities
      .filter((a) => projectIds.includes(a.projectId))
      .map((a) => a.id)
    this.data.activities = this.data.activities.filter(
      (a) => !projectIds.includes(a.projectId)
    )
    this.data.applications = this.data.applications.filter((a) => a.clientId !== id)
    this.data.expenditures = this.data.expenditures.filter(
      (e) => !this.data.applications.some((a) => a.clientId === id && a.id === e.applicationId)
    )
    this.data.staff = this.data.staff.filter((s) => s.clientId !== id)
    this.data.timeAllocations = this.data.timeAllocations.filter(
      (t) => !activityIds.includes(t.activityId)
    )
    this.save()
    return { success: true, data: undefined }
  }

  // ---------- Projects ----------

  listProjects(clientId?: string): GuestProject[] {
    if (clientId) {
      return this.data.projects.filter((p) => p.clientId === clientId)
    }
    return this.data.projects
  }

  getProject(id: string): ActionResult<GuestProject> {
    const project = this.data.projects.find((p) => p.id === id)
    if (!project) return { success: false, error: 'Project not found' }
    return { success: true, data: project }
  }

  createProject(clientId: string, input: Omit<GuestProject, 'id' | 'clientId' | 'createdAt' | 'updatedAt'>): ActionResult<GuestProject> {
    const now = new Date().toISOString()
    const project: GuestProject = {
      ...input,
      id: crypto.randomUUID(),
      clientId,
      createdAt: now,
      updatedAt: now,
    }
    this.data.projects.push(project)
    this.save()
    return { success: true, data: project }
  }

  updateProject(id: string, input: Partial<GuestProject>): ActionResult<GuestProject> {
    const idx = this.data.projects.findIndex((p) => p.id === id)
    if (idx === -1) return { success: false, error: 'Project not found' }
    this.data.projects[idx] = {
      ...this.data.projects[idx],
      ...input,
      id,
      updatedAt: new Date().toISOString(),
    }
    this.save()
    return { success: true, data: this.data.projects[idx] }
  }

  deleteProject(id: string): ActionResult<void> {
    const idx = this.data.projects.findIndex((p) => p.id === id)
    if (idx === -1) return { success: false, error: 'Project not found' }
    this.data.projects.splice(idx, 1)
    const activityIds = this.data.activities.filter((a) => a.projectId === id).map((a) => a.id)
    this.data.activities = this.data.activities.filter((a) => a.projectId !== id)
    this.data.timeAllocations = this.data.timeAllocations.filter(
      (t) => !activityIds.includes(t.activityId)
    )
    this.save()
    return { success: true, data: undefined }
  }

  getProjectsWithCounts(clientId?: string): (GuestProject & { _count: { activities: number }; clientName?: string })[] {
    const projects = clientId
      ? this.data.projects.filter((p) => p.clientId === clientId)
      : this.data.projects
    return projects.map((p) => ({
      ...p,
      _count: {
        activities: this.data.activities.filter((a) => a.projectId === p.id).length,
      },
      clientName: this.data.clients.find((c) => c.id === p.clientId)?.companyName,
    }))
  }

  // ---------- Activities ----------

  listActivities(projectId: string): GuestActivity[] {
    return this.data.activities.filter((a) => a.projectId === projectId)
  }

  getActivitiesByClient(clientId: string): GuestActivity[] {
    const projectIds = this.data.projects
      .filter((p) => p.clientId === clientId)
      .map((p) => p.id)
    return this.data.activities.filter((a) => projectIds.includes(a.projectId))
  }

  getCoreActivities(projectId: string): GuestActivity[] {
    return this.data.activities.filter(
      (a) => a.projectId === projectId && a.activityType === 'CORE'
    )
  }

  getActivity(id: string): ActionResult<GuestActivity> {
    const activity = this.data.activities.find((a) => a.id === id)
    if (!activity) return { success: false, error: 'Activity not found' }
    return { success: true, data: activity }
  }

  createActivity(projectId: string, input: Omit<GuestActivity, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>): ActionResult<GuestActivity> {
    const now = new Date().toISOString()
    const activity: GuestActivity = {
      ...input,
      id: crypto.randomUUID(),
      projectId,
      createdAt: now,
      updatedAt: now,
    }
    this.data.activities.push(activity)
    this.save()
    return { success: true, data: activity }
  }

  updateActivity(id: string, input: Partial<GuestActivity>): ActionResult<GuestActivity> {
    const idx = this.data.activities.findIndex((a) => a.id === id)
    if (idx === -1) return { success: false, error: 'Activity not found' }
    this.data.activities[idx] = {
      ...this.data.activities[idx],
      ...input,
      id,
      updatedAt: new Date().toISOString(),
    }
    this.save()
    return { success: true, data: this.data.activities[idx] }
  }

  deleteActivity(id: string): ActionResult<void> {
    const idx = this.data.activities.findIndex((a) => a.id === id)
    if (idx === -1) return { success: false, error: 'Activity not found' }
    this.data.activities.splice(idx, 1)
    this.data.timeAllocations = this.data.timeAllocations.filter((t) => t.activityId !== id)
    this.save()
    return { success: true, data: undefined }
  }

  // ---------- Applications ----------

  listApplications(clientId?: string): GuestApplication[] {
    if (clientId) {
      return this.data.applications.filter((a) => a.clientId === clientId)
    }
    return this.data.applications
  }

  getApplication(id: string): ActionResult<GuestApplication> {
    const app = this.data.applications.find((a) => a.id === id)
    if (!app) return { success: false, error: 'Application not found' }
    return { success: true, data: app }
  }

  createApplication(clientId: string, input: Omit<GuestApplication, 'id' | 'clientId' | 'claimStatus' | 'createdAt' | 'updatedAt'>): ActionResult<GuestApplication> {
    const now = new Date().toISOString()
    const app: GuestApplication = {
      ...input,
      id: crypto.randomUUID(),
      clientId,
      claimStatus: 'NOT_STARTED',
      createdAt: now,
      updatedAt: now,
    }
    this.data.applications.push(app)
    this.save()
    return { success: true, data: app }
  }

  updateApplication(id: string, input: Partial<GuestApplication>): ActionResult<GuestApplication> {
    const idx = this.data.applications.findIndex((a) => a.id === id)
    if (idx === -1) return { success: false, error: 'Application not found' }
    this.data.applications[idx] = {
      ...this.data.applications[idx],
      ...input,
      id,
      updatedAt: new Date().toISOString(),
    }
    this.save()
    return { success: true, data: this.data.applications[idx] }
  }

  deleteApplication(id: string): ActionResult<void> {
    const idx = this.data.applications.findIndex((a) => a.id === id)
    if (idx === -1) return { success: false, error: 'Application not found' }
    this.data.applications.splice(idx, 1)
    this.data.expenditures = this.data.expenditures.filter((e) => e.applicationId !== id)
    this.save()
    return { success: true, data: undefined }
  }

  getApplicationsWithDetails(): (GuestApplication & { clientName: string; expenditureTotal: number })[] {
    return this.data.applications.map((app) => {
      const client = this.data.clients.find((c) => c.id === app.clientId)
      const expenditures = this.data.expenditures.filter((e) => e.applicationId === app.id)
      const expenditureTotal = expenditures.reduce(
        (sum, e) => sum + Number(e.amountExGst || 0),
        0
      )
      return {
        ...app,
        clientName: client?.companyName ?? 'Unknown',
        expenditureTotal,
      }
    })
  }

  // ---------- Expenditures ----------

  listExpenditures(applicationId: string): GuestExpenditure[] {
    return this.data.expenditures.filter((e) => e.applicationId === applicationId)
  }

  getExpenditure(id: string): ActionResult<GuestExpenditure> {
    const exp = this.data.expenditures.find((e) => e.id === id)
    if (!exp) return { success: false, error: 'Expenditure not found' }
    return { success: true, data: exp }
  }

  createExpenditure(applicationId: string, input: Omit<GuestExpenditure, 'id' | 'applicationId' | 'createdAt' | 'updatedAt'>): ActionResult<GuestExpenditure> {
    const now = new Date().toISOString()
    const exp: GuestExpenditure = {
      ...input,
      id: crypto.randomUUID(),
      applicationId,
      createdAt: now,
      updatedAt: now,
    }
    this.data.expenditures.push(exp)
    this.save()
    return { success: true, data: exp }
  }

  updateExpenditure(id: string, input: Partial<GuestExpenditure>): ActionResult<GuestExpenditure> {
    const idx = this.data.expenditures.findIndex((e) => e.id === id)
    if (idx === -1) return { success: false, error: 'Expenditure not found' }
    this.data.expenditures[idx] = {
      ...this.data.expenditures[idx],
      ...input,
      id,
      updatedAt: new Date().toISOString(),
    }
    this.save()
    return { success: true, data: this.data.expenditures[idx] }
  }

  deleteExpenditure(id: string): ActionResult<void> {
    const idx = this.data.expenditures.findIndex((e) => e.id === id)
    if (idx === -1) return { success: false, error: 'Expenditure not found' }
    this.data.expenditures.splice(idx, 1)
    this.save()
    return { success: true, data: undefined }
  }

  // ---------- Staff ----------

  listStaff(clientId: string): (GuestStaff & { _count: { timeAllocations: number } })[] {
    return this.data.staff
      .filter((s) => s.clientId === clientId)
      .map((s) => ({
        ...s,
        _count: {
          timeAllocations: this.data.timeAllocations.filter(
            (t) => t.staffMemberId === s.id
          ).length,
        },
      }))
  }

  getStaff(id: string): ActionResult<GuestStaff & { timeAllocations: (GuestTimeAllocation & { activity?: GuestActivity; project?: GuestProject })[] }> {
    const staff = this.data.staff.find((s) => s.id === id)
    if (!staff) return { success: false, error: 'Staff member not found' }
    const timeAllocations = this.data.timeAllocations
      .filter((t) => t.staffMemberId === id)
      .map((t) => {
        const activity = this.data.activities.find((a) => a.id === t.activityId)
        const project = activity
          ? this.data.projects.find((p) => p.id === activity.projectId)
          : undefined
        return { ...t, activity, project }
      })
    return { success: true, data: { ...staff, timeAllocations } }
  }

  createStaff(clientId: string, input: Omit<GuestStaff, 'id' | 'clientId' | 'createdAt' | 'updatedAt'>): ActionResult<GuestStaff> {
    const now = new Date().toISOString()
    const staff: GuestStaff = {
      ...input,
      id: crypto.randomUUID(),
      clientId,
      createdAt: now,
      updatedAt: now,
    }
    this.data.staff.push(staff)
    this.save()
    return { success: true, data: staff }
  }

  updateStaff(id: string, input: Partial<GuestStaff>): ActionResult<GuestStaff> {
    const idx = this.data.staff.findIndex((s) => s.id === id)
    if (idx === -1) return { success: false, error: 'Staff member not found' }
    this.data.staff[idx] = {
      ...this.data.staff[idx],
      ...input,
      id,
      updatedAt: new Date().toISOString(),
    }
    this.save()
    return { success: true, data: this.data.staff[idx] }
  }

  deleteStaff(id: string): ActionResult<void> {
    const idx = this.data.staff.findIndex((s) => s.id === id)
    if (idx === -1) return { success: false, error: 'Staff member not found' }
    this.data.staff.splice(idx, 1)
    this.data.timeAllocations = this.data.timeAllocations.filter(
      (t) => t.staffMemberId !== id
    )
    this.save()
    return { success: true, data: undefined }
  }

  // ---------- Time Allocations ----------

  listTimeAllocations(staffId: string): GuestTimeAllocation[] {
    return this.data.timeAllocations.filter((t) => t.staffMemberId === staffId)
  }

  getTimeAllocation(id: string): ActionResult<GuestTimeAllocation> {
    const ta = this.data.timeAllocations.find((t) => t.id === id)
    if (!ta) return { success: false, error: 'Time allocation not found' }
    return { success: true, data: ta }
  }

  createTimeAllocation(input: Omit<GuestTimeAllocation, 'id' | 'createdAt' | 'updatedAt'>): ActionResult<GuestTimeAllocation> {
    const now = new Date().toISOString()
    const ta: GuestTimeAllocation = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }
    this.data.timeAllocations.push(ta)
    this.save()
    return { success: true, data: ta }
  }

  updateTimeAllocation(id: string, input: Partial<GuestTimeAllocation>): ActionResult<GuestTimeAllocation> {
    const idx = this.data.timeAllocations.findIndex((t) => t.id === id)
    if (idx === -1) return { success: false, error: 'Time allocation not found' }
    this.data.timeAllocations[idx] = {
      ...this.data.timeAllocations[idx],
      ...input,
      id,
      updatedAt: new Date().toISOString(),
    }
    this.save()
    return { success: true, data: this.data.timeAllocations[idx] }
  }

  deleteTimeAllocation(id: string): ActionResult<void> {
    const idx = this.data.timeAllocations.findIndex((t) => t.id === id)
    if (idx === -1) return { success: false, error: 'Time allocation not found' }
    this.data.timeAllocations.splice(idx, 1)
    this.save()
    return { success: true, data: undefined }
  }

  // ---------- Client Stats (for detail page) ----------

  getClientStats(clientId: string): {
    projectCount: number
    applicationCount: number
    totalExpenditure: number
    staffCount: number
  } {
    const projectCount = this.data.projects.filter((p) => p.clientId === clientId).length
    const applicationCount = this.data.applications.filter((a) => a.clientId === clientId).length
    const appIds = this.data.applications.filter((a) => a.clientId === clientId).map((a) => a.id)
    const totalExpenditure = this.data.expenditures
      .filter((e) => appIds.includes(e.applicationId))
      .reduce((sum, e) => sum + Number(e.amountExGst || 0), 0)
    const staffCount = this.data.staff.filter((s) => s.clientId === clientId).length
    return { projectCount, applicationCount, totalExpenditure, staffCount }
  }

  // ---------- Compliance (basic checks) ----------

  getComplianceOverview(clientId?: string) {
    const clients = clientId
      ? this.data.clients.filter((c) => c.id === clientId)
      : this.data.clients

    const checks: { category: string; status: string; message: string; clientName: string; clientId: string }[] = []

    for (const client of clients) {
      const projects = this.data.projects.filter((p) => p.clientId === client.id)
      const applications = this.data.applications.filter((a) => a.clientId === client.id)

      // Check: Has projects
      if (projects.length === 0) {
        checks.push({
          category: 'Project Documentation',
          status: 'WARNING',
          message: 'No R&D projects registered',
          clientName: client.companyName,
          clientId: client.id,
        })
      }

      // Check: Projects have activities
      for (const project of projects) {
        const activities = this.data.activities.filter((a) => a.projectId === project.id)
        if (activities.length === 0) {
          checks.push({
            category: 'Activity Documentation',
            status: 'WARNING',
            message: `Project "${project.projectName}" has no activities`,
            clientName: client.companyName,
            clientId: client.id,
          })
        }

        // Check: Core activity exists
        const coreActivities = activities.filter((a) => a.activityType === 'CORE')
        if (activities.length > 0 && coreActivities.length === 0) {
          checks.push({
            category: 'Activity Documentation',
            status: 'FAIL',
            message: `Project "${project.projectName}" has no core R&D activity`,
            clientName: client.companyName,
            clientId: client.id,
          })
        }

        // Check: Activities have H-E-C documentation
        for (const activity of activities) {
          if (activity.activityType === 'CORE') {
            const hecFields = [activity.hypothesis, activity.experiment, activity.conclusion]
            const filledCount = hecFields.filter(Boolean).length
            if (filledCount < 3) {
              checks.push({
                category: 'HEC Documentation',
                status: filledCount === 0 ? 'FAIL' : 'WARNING',
                message: `Activity "${activity.activityName}" has incomplete H-E-C documentation (${filledCount}/3)`,
                clientName: client.companyName,
                clientId: client.id,
              })
            } else {
              checks.push({
                category: 'HEC Documentation',
                status: 'PASS',
                message: `Activity "${activity.activityName}" has complete H-E-C documentation`,
                clientName: client.companyName,
                clientId: client.id,
              })
            }
          }
        }
      }

      // Check: Applications have expenditures
      for (const app of applications) {
        const expenditures = this.data.expenditures.filter((e) => e.applicationId === app.id)
        if (expenditures.length === 0) {
          checks.push({
            category: 'Expenditure',
            status: 'WARNING',
            message: `Application ${new Date(app.incomeYearStart).getFullYear()}-${new Date(app.incomeYearEnd).getFullYear()} has no expenditures`,
            clientName: client.companyName,
            clientId: client.id,
          })
        }
      }

      // Check: Registration deadline
      const now = new Date()
      const currentYear = now.getFullYear()
      let fyEndDate = new Date(currentYear, client.incomeYearEndMonth - 1, client.incomeYearEndDay)
      if (fyEndDate < now) {
        fyEndDate = new Date(currentYear + 1, client.incomeYearEndMonth - 1, client.incomeYearEndDay)
      }
      const deadline = calculateRegistrationDeadline(fyEndDate)
      const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (daysRemaining <= 30) {
        checks.push({
          category: 'Registration',
          status: 'FAIL',
          message: `Registration deadline in ${daysRemaining} days`,
          clientName: client.companyName,
          clientId: client.id,
        })
      } else if (daysRemaining <= 90) {
        checks.push({
          category: 'Registration',
          status: 'WARNING',
          message: `Registration deadline in ${daysRemaining} days`,
          clientName: client.companyName,
          clientId: client.id,
        })
      } else {
        checks.push({
          category: 'Registration',
          status: 'PASS',
          message: `Registration deadline in ${daysRemaining} days`,
          clientName: client.companyName,
          clientId: client.id,
        })
      }
    }

    const passing = checks.filter((c) => c.status === 'PASS').length
    const warnings = checks.filter((c) => c.status === 'WARNING').length
    const failing = checks.filter((c) => c.status === 'FAIL').length

    return { checks, passing, warnings, failing }
  }
}
