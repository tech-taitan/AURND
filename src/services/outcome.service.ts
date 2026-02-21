import { Document, HeadingLevel, Packer, Paragraph } from 'docx'
import { BaseService, ActionResult } from './base.service'
import { storageService } from './storage.service'
import { DocumentType, GeneratedDocument } from '@prisma/client'

export interface OutcomeLetterInput {
  approved: boolean
  offsetAmount: number
  paymentDate?: Date
  notes?: string
}

class OutcomeService extends BaseService {
  async generateConfirmationLetter(
    applicationId: string,
    input: OutcomeLetterInput
  ): Promise<ActionResult<GeneratedDocument>> {
    try {
      const application = await this.prisma.incomeYearApplication.findUnique({
        where: { id: applicationId },
        include: { client: true },
      })

      if (!application) {
        return { success: false, error: 'Application not found' }
      }

      const title = input.approved
        ? 'R&D Tax Incentive Outcome Confirmation'
        : 'R&D Tax Incentive Outcome Notice'

      const statusLine = input.approved
        ? 'Your R&D Tax Incentive application has been approved.'
        : 'Your R&D Tax Incentive application was not approved.'

      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
              new Paragraph({
                text: `Client: ${application.client.companyName}`,
              }),
              new Paragraph({
                text: `Income year end: ${application.incomeYearEnd.toLocaleDateString('en-AU')}`,
              }),
              new Paragraph({ text: '' }),
              new Paragraph({ text: statusLine }),
              new Paragraph({
                text: `Offset amount: ${new Intl.NumberFormat('en-AU', {
                  style: 'currency',
                  currency: 'AUD',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(input.offsetAmount)}`,
              }),
              ...(input.paymentDate
                ? [
                    new Paragraph({
                      text: `Payment date: ${input.paymentDate.toLocaleDateString('en-AU')}`,
                    }),
                  ]
                : []),
              ...(input.notes
                ? [new Paragraph({ text: `Notes: ${input.notes}` })]
                : []),
              new Paragraph({ text: '' }),
              new Paragraph({ text: 'Regards,' }),
              new Paragraph({ text: 'R&D Tax Incentive Team' }),
            ],
          },
        ],
      })

      const buffer = await Packer.toBuffer(doc)
      const fileName = `outcome-confirmation-${applicationId}.docx`
      const stored = await storageService.saveBuffer(
        buffer,
        fileName,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )

      const created = await this.prisma.generatedDocument.create({
        data: {
          applicationId,
          documentType: DocumentType.OUTCOME_CONFIRMATION,
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
}

export const outcomeService = new OutcomeService()
