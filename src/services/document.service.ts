import { Document, HeadingLevel, Packer, Paragraph } from 'docx'
import type { ApplicationDraft } from '@/types/ai-review'
import { BaseService, ActionResult } from './base.service'
import { storageService } from './storage.service'
import { DocumentType, GeneratedDocument } from '@prisma/client'

class DocumentService extends BaseService {
  async generateActivityDescription(
    applicationId: string
  ): Promise<ActionResult<GeneratedDocument>> {
    try {
      const application = await this.prisma.incomeYearApplication.findUnique({
        where: { id: applicationId },
        include: {
          client: true,
        },
      })

      if (!application) {
        return { success: false, error: 'Application not found' }
      }

      const projects = await this.prisma.rDProject.findMany({
        where: { clientId: application.clientId },
        include: { activities: true },
        orderBy: { createdAt: 'asc' },
      })

      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                text: `R&D Activity Description - ${application.client.companyName}`,
                heading: HeadingLevel.TITLE,
              }),
              new Paragraph({
                text: `Income year end: ${application.incomeYearEnd.toLocaleDateString('en-AU')}`,
              }),
              new Paragraph({ text: '' }),
              ...projects.flatMap((project) => {
                const projectParagraphs: Paragraph[] = [
                  new Paragraph({
                    text: project.projectName,
                    heading: HeadingLevel.HEADING_1,
                  }),
                  new Paragraph({ text: project.projectDescription }),
                ]

                const activityParagraphs = project.activities.flatMap((activity) => {
                  const items: Paragraph[] = [
                    new Paragraph({
                      text: `${activity.activityName} (${activity.activityType})`,
                      heading: HeadingLevel.HEADING_2,
                    }),
                    new Paragraph({ text: activity.activityDescription }),
                  ]

                  if (activity.hypothesis) {
                    items.push(
                      new Paragraph({ text: `Hypothesis: ${activity.hypothesis}` })
                    )
                  }
                  if (activity.experiment) {
                    items.push(
                      new Paragraph({ text: `Experiment: ${activity.experiment}` })
                    )
                  }
                  if (activity.observation) {
                    items.push(
                      new Paragraph({ text: `Observation: ${activity.observation}` })
                    )
                  }
                  if (activity.evaluation) {
                    items.push(
                      new Paragraph({ text: `Evaluation: ${activity.evaluation}` })
                    )
                  }
                  if (activity.conclusion) {
                    items.push(
                      new Paragraph({ text: `Conclusion: ${activity.conclusion}` })
                    )
                  }

                  return items
                })

                return [...projectParagraphs, ...activityParagraphs, new Paragraph({ text: '' })]
              }),
            ],
          },
        ],
      })

      const buffer = await Packer.toBuffer(doc)
      const fileName = `activity-description-${applicationId}.docx`
      const stored = await storageService.saveBuffer(
        buffer,
        fileName,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )

      const created = await this.prisma.generatedDocument.create({
        data: {
          applicationId,
          documentType: DocumentType.ACTIVITY_DESCRIPTION,
          fileName: stored.fileName,
          fileUrl: stored.url,
          fileSize: stored.size,
          version: 1,
        },
      })

      return { success: true, data: created }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  async generateFullPack(
    applicationId: string,
    draft?: ApplicationDraft
  ): Promise<ActionResult<GeneratedDocument[]>> {
    try {
      const application = await this.prisma.incomeYearApplication.findUnique({
        where: { id: applicationId },
        include: {
          client: true,
          expenditures: true,
        },
      })

      if (!application) {
        return { success: false, error: 'Application not found' }
      }

      const projects = await this.prisma.rDProject.findMany({
        where: { clientId: application.clientId },
        include: { activities: true },
        orderBy: { createdAt: 'asc' },
      })

      const timeAllocations = await this.prisma.timeAllocation.findMany({
        where: { activity: { project: { clientId: application.clientId } } },
        include: { staffMember: true, activity: true },
      })

      const createdDocuments: GeneratedDocument[] = []

      const createDocBuffer = async (title: string, paragraphs: Paragraph[]) => {
        const doc = new Document({
          sections: [
            {
              children: [
                new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
                ...paragraphs,
              ],
            },
          ],
        })

        return Packer.toBuffer(doc)
      }

      // Cover page
      const coverBuffer = await createDocBuffer(
        `R&D Application Pack - ${application.client.companyName}`,
        [
          new Paragraph({
            text: `Income year end: ${application.incomeYearEnd.toLocaleDateString('en-AU')}`,
          }),
        ]
      )

      const coverStored = await storageService.saveBuffer(
        coverBuffer,
        `cover-page-${applicationId}.docx`,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )

      createdDocuments.push(
        await this.prisma.generatedDocument.create({
          data: {
            applicationId,
            documentType: DocumentType.REGISTRATION_FORM,
            fileName: coverStored.fileName,
            fileUrl: coverStored.url,
            fileSize: coverStored.size,
            version: 1,
          },
        })
      )

      // Activity descriptions
      const activityParagraphs = draft
        ? draft.activityDescriptions.flatMap((activity) => {
            const items: Paragraph[] = [
              new Paragraph({
                text: `${activity.activityName} (${activity.activityType})`,
                heading: HeadingLevel.HEADING_2,
              }),
              new Paragraph({ text: activity.hypothesis }),
              new Paragraph({ text: activity.experiment }),
              new Paragraph({ text: activity.observation }),
              new Paragraph({ text: activity.evaluation }),
              new Paragraph({ text: activity.conclusion }),
            ]

            if (activity.uncertaintyStatement) {
              items.push(
                new Paragraph({ text: `Uncertainty: ${activity.uncertaintyStatement}` })
              )
            }

            return items
          })
        : projects.flatMap((project) => {
        const projectParagraphs: Paragraph[] = [
          new Paragraph({ text: project.projectName, heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: project.projectDescription }),
        ]

        const activityDocs = project.activities.flatMap((activity) => {
          const items: Paragraph[] = [
            new Paragraph({
              text: `${activity.activityName} (${activity.activityType})`,
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({ text: activity.activityDescription }),
          ]

          if (activity.hypothesis) items.push(new Paragraph({ text: `Hypothesis: ${activity.hypothesis}` }))
          if (activity.experiment) items.push(new Paragraph({ text: `Experiment: ${activity.experiment}` }))
          if (activity.observation) items.push(new Paragraph({ text: `Observation: ${activity.observation}` }))
          if (activity.evaluation) items.push(new Paragraph({ text: `Evaluation: ${activity.evaluation}` }))
          if (activity.conclusion) items.push(new Paragraph({ text: `Conclusion: ${activity.conclusion}` }))

          return items
        })

        return [...projectParagraphs, ...activityDocs, new Paragraph({ text: '' })]
      })

      const activityBuffer = await createDocBuffer(
        `Activity Descriptions - ${application.client.companyName}`,
        activityParagraphs
      )

      const activityStored = await storageService.saveBuffer(
        activityBuffer,
        `activity-descriptions-${applicationId}.docx`,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )

      createdDocuments.push(
        await this.prisma.generatedDocument.create({
          data: {
            applicationId,
            documentType: DocumentType.ACTIVITY_DESCRIPTION,
            fileName: activityStored.fileName,
            fileUrl: activityStored.url,
            fileSize: activityStored.size,
            version: 1,
          },
        })
      )

      // Expenditure summary
      const total = application.expenditures.reduce(
        (sum, exp) => sum + Number(exp.amountExGst),
        0
      )
      const byType = application.expenditures.reduce<Record<string, number>>((acc, exp) => {
        acc[exp.expenditureType] = (acc[exp.expenditureType] ?? 0) + Number(exp.amountExGst)
        return acc
      }, {})

      const expenditureParagraphs: Paragraph[] = [
        new Paragraph({ text: `Total notional deductions: ${total.toFixed(2)}` }),
        ...Object.entries(byType).map(
          ([type, amount]) => new Paragraph({ text: `${type}: ${amount.toFixed(2)}` })
        ),
      ]

      if (draft?.expenditureSummary?.narrative) {
        expenditureParagraphs.push(
          new Paragraph({ text: '' }),
          new Paragraph({ text: draft.expenditureSummary.narrative })
        )
      }

      const expenditureBuffer = await createDocBuffer(
        `Expenditure Summary - ${application.client.companyName}`,
        expenditureParagraphs
      )

      const expenditureStored = await storageService.saveBuffer(
        expenditureBuffer,
        `expenditure-summary-${applicationId}.docx`,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )

      createdDocuments.push(
        await this.prisma.generatedDocument.create({
          data: {
            applicationId,
            documentType: DocumentType.EXPENDITURE_SUMMARY,
            fileName: expenditureStored.fileName,
            fileUrl: expenditureStored.url,
            fileSize: expenditureStored.size,
            version: 1,
          },
        })
      )

      // Staff allocations
      const allocationParagraphs = timeAllocations.map(
        (allocation) =>
          new Paragraph({
            text: `${allocation.staffMember.name} - ${allocation.hoursAllocated.toString()} hours on ${allocation.activity.activityName}`,
          })
      )

      const allocationBuffer = await createDocBuffer(
        `Staff Allocations - ${application.client.companyName}`,
        allocationParagraphs.length > 0
          ? allocationParagraphs
          : [new Paragraph({ text: 'No staff allocations recorded.' })]
      )

      const allocationStored = await storageService.saveBuffer(
        allocationBuffer,
        `staff-allocations-${applicationId}.docx`,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )

      createdDocuments.push(
        await this.prisma.generatedDocument.create({
          data: {
            applicationId,
            documentType: DocumentType.TIME_ALLOCATION_REPORT,
            fileName: allocationStored.fileName,
            fileUrl: allocationStored.url,
            fileSize: allocationStored.size,
            version: 1,
          },
        })
      )

      return { success: true, data: createdDocuments }
    } catch (error) {
      return { success: false, error: this.handleError(error) }
    }
  }

  async listByApplication(applicationId: string): Promise<GeneratedDocument[]> {
    return this.prisma.generatedDocument.findMany({
      where: { applicationId },
      orderBy: { generatedAt: 'desc' },
    })
  }
}

export const documentService = new DocumentService()
