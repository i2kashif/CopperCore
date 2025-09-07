// Storage utilities for CopperCore ERP
// Handles file operations with factory scoping and signed URLs

import { z } from 'zod'

// Storage bucket names (must match Supabase configuration)
export const STORAGE_BUCKETS = {
  QC_CERTIFICATES: 'qc-certificates',
  PACKING_LABELS: 'packing-labels', 
  DOCUMENT_TEMPLATES: 'document-templates',
  DISPATCH_DOCUMENTS: 'dispatch-documents',
} as const

export type StorageBucket = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS]

// File upload schema
export const fileUploadSchema = z.object({
  file: z.instanceof(File),
  bucket: z.enum([
    STORAGE_BUCKETS.QC_CERTIFICATES,
    STORAGE_BUCKETS.PACKING_LABELS,
    STORAGE_BUCKETS.DOCUMENT_TEMPLATES,
    STORAGE_BUCKETS.DISPATCH_DOCUMENTS,
  ]),
  path: z.string(),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
})

export type FileUpload = z.infer<typeof fileUploadSchema>

// File metadata schema
export const fileMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  bucket: z.string(),
  path: z.string(),
  size: z.number(),
  contentType: z.string(),
  factoryId: z.string().uuid(),
  uploadedBy: z.string().uuid(),
  uploadedAt: z.string().datetime(),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
})

export type FileMetadata = z.infer<typeof fileMetadataSchema>

// Path generators (consistent with database functions)
export class StoragePathGenerator {
  static qcCertificate(
    factoryId: string,
    puId: string,
    testType: string,
    extension = 'pdf'
  ): string {
    const timestamp = Date.now()
    return `${factoryId}/qc/${puId}_${testType}_${timestamp}.${extension}`
  }

  static packingLabel(
    factoryId: string,
    puCode: string,
    labelType = 'standard',
    extension = 'pdf'
  ): string {
    const timestamp = Date.now()
    return `${factoryId}/labels/${puCode}_${labelType}_${timestamp}.${extension}`
  }

  static dispatchDocument(
    factoryId: string,
    dnNumber: string,
    documentType: string,
    extension = 'pdf'
  ): string {
    const timestamp = Date.now()
    return `${factoryId}/${dnNumber}/${documentType}_${timestamp}.${extension}`
  }

  static documentTemplate(
    templateName: string,
    version: string,
    extension = 'pdf'
  ): string {
    return `templates/${templateName}_v${version}.${extension}`
  }
}

// File validation utilities
export class FileValidator {
  static readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  static readonly ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ]

  static validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > this.MAX_FILE_SIZE) {
      return { valid: false, error: 'File size exceeds 10MB limit' }
    }

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: 'Invalid file type. Only PDF and images allowed.' }
    }

    return { valid: true }
  }

  static validatePath(path: string, factoryId: string): { valid: boolean; error?: string } {
    // Path should start with factory ID
    if (!path.startsWith(factoryId)) {
      return { valid: false, error: 'Invalid path: must start with factory ID' }
    }

    // Path should not contain dangerous characters
    if (path.includes('..') || path.includes('//')) {
      return { valid: false, error: 'Invalid path: contains dangerous characters' }
    }

    return { valid: true }
  }
}

// Storage service interface (to be implemented with Supabase client)
export interface StorageService {
  upload(_upload: FileUpload): Promise<{ path: string; url?: string }>
  download(_bucket: StorageBucket, _path: string): Promise<Blob>
  getSignedUrl(_bucket: StorageBucket, _path: string, _expiresIn?: number): Promise<string>
  delete(_bucket: StorageBucket, _path: string): Promise<void>
  list(_bucket: StorageBucket, _prefix?: string): Promise<FileMetadata[]>
}

// Error classes
export class StorageError extends Error {
  public readonly code: string
  constructor(message: string, code: string) {
    super(message)
    this.name = 'StorageError'
    this.code = code
  }
}

export class AccessDeniedError extends StorageError {
  constructor(path: string) {
    super(`Access denied to file: ${path}`, 'ACCESS_DENIED')
  }
}

export class FileNotFoundError extends StorageError {
  constructor(path: string) {
    super(`File not found: ${path}`, 'FILE_NOT_FOUND')
  }
}

export class FileTooLargeError extends StorageError {
  constructor(size: number, maxSize: number) {
    super(`File size ${size} exceeds limit ${maxSize}`, 'FILE_TOO_LARGE')
  }
}

// Constants for file operations
export const FILE_AUDIT_ACTIONS = {
  UPLOAD: 'UPLOAD',
  DOWNLOAD: 'DOWNLOAD', 
  DELETE: 'DELETE',
} as const

export const QC_TEST_TYPES = {
  ELECTRICAL: 'electrical',
  PHYSICAL: 'physical',
  VISUAL: 'visual',
  PERFORMANCE: 'performance',
} as const

export const LABEL_TYPES = {
  STANDARD: 'standard',
  SHIPPING: 'shipping',
  QC_PASS: 'qc_pass',
  QC_HOLD: 'qc_hold',
} as const

export const DOCUMENT_TYPES = {
  DISPATCH_NOTE: 'dispatch_note',
  PACKING_LIST: 'packing_list',
  INVOICE: 'invoice',
  CERTIFICATE: 'certificate',
} as const
