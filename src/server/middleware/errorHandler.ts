/**
 * Error Handling Middleware
 * Centralized error handling for CopperCore ERP API
 */

import { Request, Response, NextFunction } from 'express'

export interface ApiError extends Error {
  status?: number
  code?: string
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error details (in production, use proper logging service)
  console.error('API Error:', {
    message: error.message,
    status: error.status,
    code: error.code,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  })

  // Determine status code
  const status = error.status || 500

  // Prepare error response
  const errorResponse: any = {
    error: true,
    message: error.message || 'Internal server error',
    status
  }

  // Add error code if available
  if (error.code) {
    errorResponse.code = error.code
  }

  // Don't leak stack traces in production
  if (process.env.NODE_ENV !== 'production' && error.stack) {
    errorResponse.stack = error.stack
  }

  res.status(status).json(errorResponse)
}

/**
 * Create an API error with status code
 */
export function createApiError(message: string, status: number = 500, code?: string): ApiError {
  const error = new Error(message) as ApiError
  error.status = status
  if (code) error.code = code
  return error
}

/**
 * Async handler wrapper to catch promise rejections
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}