import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { UserFactoryAssignmentsService } from './service'
import { authenticate, authorize } from '../../middleware/auth'
import { UserRole, ErrorCodes } from '../common/types'
import { createUserFactoryAssignmentSchema, updateUserFactoryAssignmentSchema, createErrorResponse } from '../common/validation'
import { z } from 'zod'

/**
 * User-Factory Assignments API routes
 * 
 * Per PRD §2.2: Factory linkage & visibility - Many-to-many assignments
 * Per PRD §5.12: Manage Company - User-factory assignment management
 */

const assignmentsService = new UserFactoryAssignmentsService()

// Route parameter schemas
const assignmentParamsSchema = z.object({
  id: z.string().uuid()
})

const userParamsSchema = z.object({
  userId: z.string().uuid()
})

const factoryParamsSchema = z.object({
  factoryId: z.string().uuid()
})

// Bulk assignment schema
const bulkAssignmentSchema = z.object({
  user_id: z.string().uuid(),
  factory_ids: z.array(z.string().uuid()).min(1).max(10)
})

export async function userFactoryAssignmentsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/users/:userId/factories - Get user's assigned factories
   * All roles, but non-managers can only see their own assignments
   */
  fastify.get(
    '/api/users/:userId/factories',
    {
      preHandler: [authenticate],
      schema: {
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string', format: 'uuid' }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userId } = userParamsSchema.parse(request.params)
        const result = await assignmentsService.getUserFactories(userId, request.user!)
        
        if (result.success) {
          return reply.code(200).send(result)
        } else {
          const statusCode = result.error?.code === ErrorCodes.FORBIDDEN ? 403 : 500
          return reply.code(statusCode).send(result)
        }
      } catch (error) {
        return reply.code(500).send(
          createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get user factory assignments')
        )
      }
    }
  )

  /**
   * GET /api/factories/:factoryId/users - Get factory's assigned users
   * All roles, factory-scoped for non-global users
   */
  fastify.get(
    '/api/factories/:factoryId/users',
    {
      preHandler: [authenticate],
      schema: {
        params: {
          type: 'object',
          required: ['factoryId'],
          properties: {
            factoryId: { type: 'string', format: 'uuid' }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { factoryId } = factoryParamsSchema.parse(request.params)
        const result = await assignmentsService.getFactoryUsers(factoryId, request.user!)
        
        if (result.success) {
          return reply.code(200).send(result)
        } else {
          const statusCode = result.error?.code === ErrorCodes.FACTORY_SCOPE_VIOLATION ? 403 : 500
          return reply.code(statusCode).send(result)
        }
      } catch (error) {
        return reply.code(500).send(
          createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get factory user assignments')
        )
      }
    }
  )

  /**
   * POST /api/user-factory-assignments - Create user-factory assignment
   * CEO/Director only
   */
  fastify.post(
    '/api/user-factory-assignments',
    {
      preHandler: [
        authenticate, 
        authorize({ requireRole: [UserRole.CEO, UserRole.DIRECTOR] })
      ],
      schema: {
        body: {
          type: 'object',
          required: ['user_id', 'factory_id'],
          properties: {
            user_id: { type: 'string', format: 'uuid' },
            factory_id: { type: 'string', format: 'uuid' },
            is_active: { type: 'boolean', default: true }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const input = createUserFactoryAssignmentSchema.parse(request.body)
        const result = await assignmentsService.create(input, request.user!)
        
        if (result.success) {
          return reply.code(201).send(result)
        } else {
          const statusCode = (() => {
            switch (result.error?.code) {
              case ErrorCodes.VALIDATION_ERROR: return 400
              case ErrorCodes.DUPLICATE_ENTRY: return 409
              case ErrorCodes.FACTORY_SCOPE_VIOLATION: return 403
              default: return 500
            }
          })()
          return reply.code(statusCode).send(result)
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send(
            createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid input data', error.errors)
          )
        }
        return reply.code(500).send(
          createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create assignment')
        )
      }
    }
  )

  /**
   * POST /api/user-factory-assignments/bulk - Bulk assign user to multiple factories
   * CEO/Director only
   */
  fastify.post(
    '/api/user-factory-assignments/bulk',
    {
      preHandler: [
        authenticate, 
        authorize({ requireRole: [UserRole.CEO, UserRole.DIRECTOR] })
      ],
      schema: {
        body: {
          type: 'object',
          required: ['user_id', 'factory_ids'],
          properties: {
            user_id: { type: 'string', format: 'uuid' },
            factory_ids: {
              type: 'array',
              items: { type: 'string', format: 'uuid' },
              minItems: 1,
              maxItems: 10
            }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const input = bulkAssignmentSchema.parse(request.body)
        const result = await assignmentsService.bulkAssign(
          input.user_id, 
          input.factory_ids, 
          request.user!
        )
        
        if (result.success) {
          return reply.code(200).send(result)
        } else {
          const statusCode = (() => {
            switch (result.error?.code) {
              case ErrorCodes.VALIDATION_ERROR: return 400
              case ErrorCodes.FACTORY_SCOPE_VIOLATION: return 403
              default: return 500
            }
          })()
          return reply.code(statusCode).send(result)
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send(
            createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid input data', error.errors)
          )
        }
        return reply.code(500).send(
          createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to bulk assign user to factories')
        )
      }
    }
  )

  /**
   * PUT /api/user-factory-assignments/:id - Update user-factory assignment
   * CEO/Director only
   */
  fastify.put(
    '/api/user-factory-assignments/:id',
    {
      preHandler: [
        authenticate, 
        authorize({ requireRole: [UserRole.CEO, UserRole.DIRECTOR] })
      ],
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' }
          }
        },
        body: {
          type: 'object',
          required: ['version'],
          properties: {
            version: { type: 'integer', minimum: 1 },
            is_active: { type: 'boolean' }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = assignmentParamsSchema.parse(request.params)
        const input = updateUserFactoryAssignmentSchema.parse(request.body)
        const result = await assignmentsService.update(id, input, request.user!)
        
        if (result.success) {
          return reply.code(200).send(result)
        } else {
          const statusCode = (() => {
            switch (result.error?.code) {
              case ErrorCodes.NOT_FOUND: return 404
              case ErrorCodes.VALIDATION_ERROR: return 400
              case ErrorCodes.OPTIMISTIC_LOCK_ERROR: return 409
              case ErrorCodes.FACTORY_SCOPE_VIOLATION: return 403
              default: return 500
            }
          })()
          return reply.code(statusCode).send(result)
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send(
            createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid input data', error.errors)
          )
        }
        return reply.code(500).send(
          createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update assignment')
        )
      }
    }
  )

  /**
   * DELETE /api/user-factory-assignments/:id - Remove user-factory assignment
   * CEO/Director only
   */
  fastify.delete(
    '/api/user-factory-assignments/:id',
    {
      preHandler: [
        authenticate, 
        authorize({ requireRole: [UserRole.CEO, UserRole.DIRECTOR] })
      ],
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' }
          }
        },
        querystring: {
          type: 'object',
          properties: {
            reason: { type: 'string', maxLength: 1000 }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = assignmentParamsSchema.parse(request.params)
        const query = request.query as { reason?: string }
        const result = await assignmentsService.remove(id, request.user!, query.reason)
        
        if (result.success) {
          return reply.code(200).send(result)
        } else {
          const statusCode = (() => {
            switch (result.error?.code) {
              case ErrorCodes.NOT_FOUND: return 404
              case ErrorCodes.FACTORY_SCOPE_VIOLATION: return 403
              default: return 500
            }
          })()
          return reply.code(statusCode).send(result)
        }
      } catch (error) {
        return reply.code(500).send(
          createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to remove assignment')
        )
      }
    }
  )

  /**
   * GET /api/user-factory-assignments/stats - Get assignment statistics
   * All roles, but filtered by factory scope for non-global users
   */
  fastify.get(
    '/api/user-factory-assignments/stats',
    {
      preHandler: [authenticate]
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await assignmentsService.getStats(request.user!)
        
        if (result.success) {
          return reply.code(200).send(result)
        } else {
          return reply.code(500).send(result)
        }
      } catch (error) {
        return reply.code(500).send(
          createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get assignment statistics')
        )
      }
    }
  )
}