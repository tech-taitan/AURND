import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'

export interface StoredFile {
  fileName: string
  url: string
  mimeType: string
  size: number
}

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

class StorageService {
  private async ensureUploadDir() {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
  }

  async saveFile(file: File): Promise<StoredFile> {
    await this.ensureUploadDir()

    const extension = path.extname(file.name) || ''
    const safeBase = crypto.randomUUID()
    const fileName = `${safeBase}${extension}`
    const filePath = path.join(UPLOAD_DIR, fileName)

    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(filePath, buffer)

    return {
      fileName: file.name,
      url: `/uploads/${fileName}`,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
    }
  }

  async saveBuffer(
    buffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<StoredFile> {
    await this.ensureUploadDir()

    const extension = path.extname(originalName) || ''
    const safeBase = crypto.randomUUID()
    const fileName = `${safeBase}${extension}`
    const filePath = path.join(UPLOAD_DIR, fileName)

    await fs.writeFile(filePath, buffer)

    return {
      fileName: originalName,
      url: `/uploads/${fileName}`,
      mimeType,
      size: buffer.length,
    }
  }

  resolveUploadPath(fileUrl: string): string | null {
    if (!fileUrl.startsWith('/uploads/')) return null
    const resolved = path.join(UPLOAD_DIR, fileUrl.replace('/uploads/', ''))
    if (!resolved.startsWith(UPLOAD_DIR)) return null
    return resolved
  }
}

export const storageService = new StorageService()
