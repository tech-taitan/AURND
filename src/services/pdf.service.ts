import { PDFDocument, StandardFonts } from 'pdf-lib'
import JSZip from 'jszip'

export async function generatePdfFromText(
  text: string,
  options?: { title?: string }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const { width, height } = page.getSize()
  const fontSize = 12
  const lineHeight = fontSize * 1.4
  const margin = 50
  const maxWidth = width - margin * 2

  let cursorY = height - margin

  if (options?.title) {
    page.drawText(options.title, {
      x: margin,
      y: cursorY,
      size: 16,
      font,
    })
    cursorY -= lineHeight * 2
  }

  const words = text.split(/\s+/)
  let line = ''

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word
    const textWidth = font.widthOfTextAtSize(testLine, fontSize)

    if (textWidth > maxWidth) {
      page.drawText(line, { x: margin, y: cursorY, size: fontSize, font })
      cursorY -= lineHeight
      line = word

      if (cursorY < margin) {
        cursorY = height - margin
        pdfDoc.addPage()
      }
    } else {
      line = testLine
    }
  }

  if (line) {
    page.drawText(line, { x: margin, y: cursorY, size: fontSize, font })
  }

  return pdfDoc.save()
}

export async function generatePdfFromDocx(docxBuffer: Buffer): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(docxBuffer)
  const documentXml = await zip.file('word/document.xml')?.async('string')

  if (!documentXml) {
    throw new Error('Invalid DOCX file: missing document.xml')
  }

  const text = documentXml
    .replace(/<w:p[\s\S]*?>/g, '\n')
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")

  return generatePdfFromText(text.trim())
}
