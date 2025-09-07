import { z } from 'zod'

// Optimistic Locking Error Types
export const conflictErrorSchema = z.object({
  error: z.literal('VERSION_CONFLICT'),
  message: z.string(),
  currentVersion: z.number(),
  expectedVersion: z.number(),
  httpStatus: z.literal(409),
})

export const notFoundErrorSchema = z.object({
  error: z.literal('RECORD_NOT_FOUND'),
  message: z.string(),
  httpStatus: z.literal(404),
})

export const updateErrorSchema = z.object({
  error: z.literal('UPDATE_FAILED'),
  message: z.string(),
  httpStatus: z.literal(500),
})

export type ConflictError = z.infer<typeof conflictErrorSchema>
export type NotFoundError = z.infer<typeof notFoundErrorSchema>
export type UpdateError = z.infer<typeof updateErrorSchema>

// API Response wrapper with error handling
export const apiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.union([conflictErrorSchema, notFoundErrorSchema, updateErrorSchema]),
})

export const apiSuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    httpStatus: z.literal(200),
  })

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>
export type ApiSuccessResponse<T> = {
  success: true
  data: T
  httpStatus: 200
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

// Shape returned by DB functions (via SQL JSONB)
type DbFunctionSuccess<T> = {
  success: true
  data: T
  http_status: 200
}

type DbFunctionConflict = {
  success: false
  error: 'VERSION_CONFLICT'
  message?: string
  current_version: number
  expected_version: number
  http_status: 409
}

type DbFunctionNotFound = {
  success: false
  error: 'RECORD_NOT_FOUND'
  message?: string
  http_status: 404
}

type DbFunctionUpdateFailed = {
  success: false
  error: 'UPDATE_FAILED'
  message: string
  http_status: 500
}

export type DbFunctionResult<T> =
  | DbFunctionSuccess<T>
  | DbFunctionConflict
  | DbFunctionNotFound
  | DbFunctionUpdateFailed

// Error handling utilities
export class OptimisticLockingError extends Error {
  constructor(
    public readonly currentVersion: number,
    public readonly expectedVersion: number,
    message?: string
  ) {
    super(message || `Version conflict: expected ${expectedVersion}, found ${currentVersion}`)
    this.name = 'OptimisticLockingError'
  }
}

export class RecordNotFoundError extends Error {
  constructor(message?: string) {
    super(message || 'Record not found')
    this.name = 'RecordNotFoundError'
  }
}

// Helper function to handle database function results
export function handleDbFunctionResult<T>(result: DbFunctionResult<T>): ApiResponse<T> {
  if (result.success) {
    return {
      success: true,
      data: result.data,
      httpStatus: 200,
    }
  }

  if (result.error === 'VERSION_CONFLICT') {
    return {
      success: false,
      error: {
        error: 'VERSION_CONFLICT',
        message: result.message ?? `Version conflict: expected ${result.expected_version}, found ${result.current_version}`,
        currentVersion: result.current_version,
        expectedVersion: result.expected_version,
        httpStatus: 409,
      },
    }
  }

  if (result.error === 'RECORD_NOT_FOUND') {
    return {
      success: false,
      error: {
        error: 'RECORD_NOT_FOUND',
        message: result.message ?? 'Record not found',
        httpStatus: 404,
      },
    }
  }

  return {
    success: false,
    error: {
      error: 'UPDATE_FAILED',
      message: result.message,
      httpStatus: 500,
    },
  }
}

// Retry logic for optimistic locking conflicts
export async function retryOnConflict<T>(
  operation: () => Promise<ApiResponse<T>>,
  maxRetries = 3,
  backoffMs = 100
): Promise<ApiResponse<T>> {
  let lastError: ApiErrorResponse | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation()
      
      if (result.success) {
        return result
      }

      // Only retry on version conflicts
      if (result.error.error === 'VERSION_CONFLICT' && attempt < maxRetries) {
        lastError = result
        await new Promise(resolve => setTimeout(resolve, backoffMs * (attempt + 1)))
        continue
      }

      return result
    } catch (error) {
      if (attempt === maxRetries) {
        throw error
      }
      await new Promise(resolve => setTimeout(resolve, backoffMs * (attempt + 1)))
    }
  }

  return lastError!
}
