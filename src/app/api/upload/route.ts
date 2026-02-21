import { NextRequest, NextResponse } from 'next/server'
import { storageService } from '@/services/storage.service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit, rateLimitConfigs } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

// Allowed MIME types for upload
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/msword', // .doc
  'application/vnd.ms-excel', // .xls
  'text/csv',
  'text/plain',
]

// Magic bytes for common file types
const MAGIC_BYTES: Record<string, number[]> = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
  'image/png': [0x89, 0x50, 0x4e, 0x47], // PNG
  'image/jpeg': [0xff, 0xd8, 0xff], // JPEG
  'image/gif': [0x47, 0x49, 0x46], // GIF
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF (WebP container)
}

function validateMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType)
}

async function validateFileContent(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 8).arrayBuffer()
  const bytes = new Uint8Array(buffer)
  
  // Check magic bytes for known types
  const magicBytes = MAGIC_BYTES[file.type]
  if (magicBytes) {
    return magicBytes.every((byte, i) => bytes[i] === byte)
  }
  
  // For other types, trust the MIME type if it's in allowed list
  return validateMimeType(file.type)
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = checkRateLimit(request, rateLimitConfigs.upload)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many uploads. Please try again later.' },
      { status: 429, headers: { 'Retry-After': rateLimitResult.reset.toString() } }
    )
  }

  // Authentication
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File exceeds 10MB limit' }, { status: 413 })
    }

    // Validate MIME type
    if (!validateMimeType(file.type)) {
      logger.warn('Invalid file type upload attempt', { 
        mimeType: file.type, 
        userId: session.user.id 
      })
      return NextResponse.json({ 
        error: 'Invalid file type. Allowed: PDF, images, Word, Excel, CSV, text files' 
      }, { status: 400 })
    }

    // Validate file content (magic bytes)
    const isValidContent = await validateFileContent(file)
    if (!isValidContent) {
      logger.warn('File content does not match MIME type', { 
        mimeType: file.type, 
        userId: session.user.id 
      })
      return NextResponse.json({ 
        error: 'File content does not match declared type' 
      }, { status: 400 })
    }

    const stored = await storageService.saveFile(file)
    logger.info('File uploaded', { 
      fileName: stored.fileName, 
      size: stored.size,
      userId: session.user.id 
    })
    
    return NextResponse.json({ data: stored })
  } catch (error) {
    logger.error('Error uploading file', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
