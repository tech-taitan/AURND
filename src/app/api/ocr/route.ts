import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { promisify } from 'util'
import { execFile } from 'child_process'
import { storageService } from '@/services/storage.service'
import { promises as fs } from 'fs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit, rateLimitConfigs } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

const execFileAsync = promisify(execFile)

function extractFields(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)

  const invoiceNumberMatch = lines
    .map((line) => line.match(/invoice\s*(no\.?|number|#)\s*[:#]?\s*([A-Z0-9-]+)/i))
    .find(Boolean)

  const dateMatch = lines
    .map((line) => line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/))
    .find(Boolean)

  const totalLine = lines
    .find((line) => /total\b/i.test(line) && !/subtotal/i.test(line))

  const gstLine = lines.find((line) => /\bgst\b|tax\b/i.test(line))

  const amountPattern = /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/

  const totalMatch = totalLine ? totalLine.match(amountPattern) : null
  const gstMatch = gstLine ? gstLine.match(amountPattern) : null

  const supplierName = lines.find(
    (line) => !/invoice|total|tax|gst|date/i.test(line) && line.length > 3
  )

  return {
    supplierName: supplierName || null,
    invoiceNumber: invoiceNumberMatch?.[2] || null,
    invoiceDate: dateMatch?.[1] || null,
    totalAmount: totalMatch?.[1] || null,
    gstAmount: gstMatch?.[1] || null,
  }
}

function normalizeDate(value: string | null) {
  if (!value) return null
  const parts = value.split(/[\/\-]/).map((part) => part.trim())
  if (parts.length !== 3) return null
  const [first, second, third] = parts
  const year = third.length === 2 ? `20${third}` : third
  const month = second.padStart(2, '0')
  const day = first.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function POST(request: NextRequest) {
  // Rate limiting (heavier operation)
  const rateLimitResult = checkRateLimit(request, rateLimitConfigs.heavy)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many OCR requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': rateLimitResult.reset.toString() } }
    )
  }

  // Authentication
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const fileUrl: string | undefined = body?.fileUrl

    if (!fileUrl) {
      return NextResponse.json({ error: 'fileUrl is required' }, { status: 400 })
    }

    const filePath = storageService.resolveUploadPath(fileUrl)
    if (!filePath) {
      return NextResponse.json({ error: 'Invalid file URL' }, { status: 400 })
    }

    await fs.access(filePath)

    const pythonPath = process.env.OCR_PYTHON_PATH || 'python'
    const scriptPath = path.join(process.cwd(), 'scripts', 'ocr', 'paddleocr.py')

    logger.info('Starting OCR processing', { fileUrl, userId: session.user.id })

    const { stdout } = await execFileAsync(pythonPath, [scriptPath, filePath], {
      timeout: 120000,
      maxBuffer: 5 * 1024 * 1024,
    })

    const parsed = JSON.parse(stdout || '{}')
    if (parsed.error) {
      logger.error('OCR processing failed', new Error(parsed.error), { fileUrl, userId: session.user.id })
      return NextResponse.json({ error: parsed.error }, { status: 500 })
    }

    const fields = extractFields(parsed.text || '')
    logger.info('OCR processing completed', { fileUrl, userId: session.user.id })

    return NextResponse.json({
      data: {
        text: parsed.text || '',
        lines: parsed.lines || [],
        fields: {
          ...fields,
          invoiceDate: normalizeDate(fields.invoiceDate),
        },
      },
    })
  } catch (error) {
    logger.error('Error running OCR', error)
    return NextResponse.json({ error: 'Failed to run OCR' }, { status: 500 })
  }
}
