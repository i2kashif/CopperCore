import { FastifyRequest, FastifyReply } from 'fastify'
import { OptimisticLockingError, RecordNotFoundError, handleDbFunctionResult } from '@coppercore/shared/errors'

// Middleware to handle optimistic locking errors
export async function optimisticLockingErrorHandler(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (error instanceof OptimisticLockingError) {
    return reply.status(409).send({
      success: false,
      error: {
        error: 'VERSION_CONFLICT',
        message: error.message,
        currentVersion: error.currentVersion,
        expectedVersion: error.expectedVersion,
        httpStatus: 409,
      },
    })
  }

  if (error instanceof RecordNotFoundError) {
    return reply.status(404).send({
      success: false,
      error: {
        error: 'RECORD_NOT_FOUND',
        message: error.message,
        httpStatus: 404,
      },
    })
  }

  // Let other errors bubble up
  throw error
}

// Helper to validate version header
export function validateVersionHeader(request: FastifyRequest): number {
  const versionHeader = request.headers['if-match'] || request.headers['x-version']
  
  if (!versionHeader) {
    throw new Error('Version header (If-Match or X-Version) is required for updates')
  }

  const version = parseInt(versionHeader as string, 10)
  
  if (isNaN(version) || version < 1) {
    throw new Error('Version header must be a positive integer')
  }

  return version
}

// Helper to set version header in responses
export function setVersionHeader(reply: FastifyReply, version: number): void {
  reply.header('ETag', `"${version}"`)
  reply.header('X-Version', version.toString())
}

// Example middleware usage in route handler
export interface OptimisticUpdateRequest extends FastifyRequest {
  Body: {
    data: Record<string, any>
  }
  Params: {
    id: string
  }
}

// Example route handler with optimistic locking
export async function updateWorkOrderHandler(
  request: OptimisticUpdateRequest,
  reply: FastifyReply
) {
  try {
    const { id } = request.params as { id: string }
    const expectedVersion = validateVersionHeader(request)
    const updateData = (request.body as any).data

    // Call database function with optimistic locking  
    const result = await (request.server as any).supabase
      .rpc('update_work_order_safe', {
        p_id: id,
        p_expected_version: expectedVersion,
        p_target_quantity: updateData.target_quantity,
        p_current_quantity: updateData.current_quantity,
        p_status: updateData.status,
        p_priority: updateData.priority,
      })

    const response = handleDbFunctionResult(result.data)

    if (!response.success) {
      if (response.error.error === 'VERSION_CONFLICT') {
        return reply.status(409).send(response)
      }
      if (response.error.error === 'RECORD_NOT_FOUND') {
        return reply.status(404).send(response)
      }
      return reply.status(500).send(response)
    }

    // Set version header for successful updates
    setVersionHeader(reply, (response.data as any).version)

    return reply.status(200).send(response)

  } catch (error) {
    request.log.error(error, 'Optimistic locking error in work order update')
    
    return reply.status(400).send({
      success: false,
      error: {
        error: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Invalid request',
        httpStatus: 400,
      },
    })
  }
}

// Plugin to register optimistic locking middleware
export async function optimisticLockingPlugin(fastify: any) {
  // Register error handler
  fastify.setErrorHandler(optimisticLockingErrorHandler)

  // Add utility methods to fastify instance
  fastify.decorate('validateVersion', validateVersionHeader)
  fastify.decorate('setVersionHeader', setVersionHeader)
  fastify.decorate('handleDbResult', handleDbFunctionResult)
}