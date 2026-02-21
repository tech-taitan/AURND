/**
 * Application Drafter Service
 *
 * Generates a complete R&D application draft using AI.
 */

import type { ApplicationDraft } from '@/types/ai-review'
import { prisma } from '@/lib/db'
import { getGeminiService } from './gemini.service'
import {
  buildApplicationDrafterPrompt,
  getApplicationDrafterSystemInstruction,
  parseApplicationDrafterResponse,
} from './prompts/application-drafter'

export class ApplicationDrafterService {
  async draft(applicationId: string, organisationId: string): Promise<ApplicationDraft> {
    const application = await prisma.incomeYearApplication.findFirst({
      where: {
        id: applicationId,
        client: { organisationId },
      },
      include: {
        client: true,
        expenditures: true,
      },
    })

    if (!application) {
      throw new Error('Application not found or access denied')
    }

    const projects = await prisma.rDProject.findMany({
      where: { clientId: application.clientId },
      include: {
        activities: {
          include: {
            timeAllocations: {
              include: { staffMember: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const activities = projects.flatMap((project) =>
      project.activities.map((activity) => ({
        id: activity.id,
        projectId: project.id,
        activityName: activity.activityName,
        activityType: activity.activityType,
        activityDescription: activity.activityDescription,
        hypothesis: activity.hypothesis,
        experiment: activity.experiment,
        observation: activity.observation,
        evaluation: activity.evaluation,
        conclusion: activity.conclusion,
      }))
    )

    const totalAmount = application.expenditures.reduce(
      (sum, exp) => sum + Number(exp.amountExGst),
      0
    )

    const byCategory = application.expenditures.reduce<Record<string, number>>((acc, exp) => {
      const key = exp.expenditureType
      acc[key] = (acc[key] ?? 0) + Number(exp.amountExGst)
      return acc
    }, {})

    const prompt = buildApplicationDrafterPrompt({
      client: {
        companyName: application.client.companyName,
        abn: application.client.abn,
        incorporationType: application.client.incorporationType,
      },
      projects: projects.map((project) => ({
        id: project.id,
        projectName: project.projectName,
        projectDescription: project.projectDescription,
        technicalHypothesis: project.technicalHypothesis,
        methodology: project.methodology,
        technicalUncertainty: project.technicalUncertainty,
        expectedOutcome: project.expectedOutcome,
      })),
      activities,
      expenditureSummary: {
        totalAmount,
        byCategory,
      },
    })

    const gemini = getGeminiService()

    const response = await gemini.generateContent(prompt, {
      systemInstruction: getApplicationDrafterSystemInstruction(),
      temperature: 0.3,
      maxOutputTokens: 4096,
      jsonMode: true,
    })

    const draft = parseApplicationDrafterResponse(response.text)

    if (!draft.executiveSummary || !draft.projectNarratives || !draft.activityDescriptions) {
      throw new Error('Application draft response missing required fields')
    }

    return draft
  }
}

let instance: ApplicationDrafterService | null = null

export function getApplicationDrafterService(): ApplicationDrafterService {
  if (!instance) {
    instance = new ApplicationDrafterService()
  }
  return instance
}

export function resetApplicationDrafterService(): void {
  instance = null
}
