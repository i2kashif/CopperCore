import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { UsersService } from './service'
import { authenticate, authorize } from '../../middleware/auth'
import { ListQuery, UserRole, ErrorCodes } from '../common/types'
import { createUserSchema, updateUserSchema, createErrorResponse } from '../common/validation'
import { z } from 'zod'

/**
 * Users API routes
 * 
 * Per PRD §5.12: Manage Company - Users management
 * Per PRD §2.2: Factory linkage - Many-to-many assignments
 * Per PRD §2.1: CEO/Director only for create/update/delete
 */

const usersService = new UsersService()

// Route parameter schemas
const userParamsSchema = z.object({
  id: z.string().uuid()
})

// Query parameter schemas for listing
const userQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  sort_by: z.enum(['username', 'first_name', 'last_name', 'email', 'role', 'created_at', 'updated_at']).default('username'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
  factory_id: z.string().uuid().optional(),
  is_active: z.coerce.boolean().optional()
})

export async function usersRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/users - List users
   * All roles, but filtered by factory scope for non-managers
   */
  fastify.get(
    '/api/users',
    {
      preHandler: [authenticate],
      schema: {
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            search: { type: 'string', maxLength: 200 },
            sort_by: { 
              type: 'string', 
              enum: ['username', 'first_name', 'last_name', 'email', 'role', 'created_at', 'updated_at'], 
              default: 'username' 
            },
            sort_order: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
            factory_id: { type: 'string', format: 'uuid' },
            is_active: { type: 'boolean' }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = userQuerySchema.parse(request.query) as ListQuery
        const result = await usersService.list(query, request.user!)
        
        if (result.success) {
          return reply.code(200).send(result)
        } else {
          const statusCode = result.error?.code === ErrorCodes.VALIDATION_ERROR ? 400 : 500
          return reply.code(statusCode).send(result)
        }
      } catch (error) {
        return reply.code(500).send(
          createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to list users')
        )
      }
    }
  )

  /**
   * GET /api/users/stats - Get user statistics
   * All roles, but filtered by factory scope for non-managers
   */
  fastify.get(
    '/api/users/stats',
    {
      preHandler: [authenticate]
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await usersService.getStats(request.user!)
        
        if (result.success) {
          return reply.code(200).send(result)
        } else {
          return reply.code(500).send(result)
        }
      } catch (error) {
        return reply.code(500).send(
          createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get user statistics')
        )
      }
    }
  )

  /**
   * GET /api/users/:id - Get single user
   * All roles, but access controlled by factory scope for non-managers
   */
  fastify.get(
    '/api/users/:id',
    {
      preHandler: [authenticate],
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = userParamsSchema.parse(request.params)
        const result = await usersService.getById(id, request.user!)
        
        if (result.success) {
          return reply.code(200).send(result)
        } else {
          const statusCode = (() => {
            switch (result.error?.code) {
              case ErrorCodes.NOT_FOUND: return 404
              case ErrorCodes.FORBIDDEN: return 403
              default: return 500
            }
          })()
          return reply.code(statusCode).send(result)
        }
      } catch (error) {
        return reply.code(500).send(
          createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get user')
        )
      }
    }
  )

  /**
   * POST /api/users - Create user
   * CEO/Director only
   */
  fastify.post(
    '/api/users',
    {
      preHandler: [
        authenticate, 
        authorize({ requireRole: [UserRole.CEO, UserRole.DIRECTOR] })
      ],
      schema: {
        body: {
          type: 'object',
          required: ['username', 'email', 'first_name', 'last_name', 'role'],
          properties: {
            username: { type: 'string', pattern: '^[a-zA-Z0-9_-]{3,50}$' },
            email: { type: 'string', format: 'email' },
            first_name: { type: 'string', pattern: '^[a-zA-Z\\s-]{1,100}$' },
            last_name: { type: 'string', pattern: '^[a-zA-Z\\s-]{1,100}$' },
            role: { type: 'string', enum: ['CEO', 'DIRECTOR', 'FACTORY_MANAGER', 'FACTORY_WORKER', 'OFFICE'] },
            is_active: { type: 'boolean', default: true },
            factory_ids: { 
              type: 'array',
              items: { type: 'string', format: 'uuid' },
              minItems: 0,
              maxItems: 10,
              default: []
            }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const input = createUserSchema.parse(request.body)
        const result = await usersService.create(input, request.user!)
        
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
          createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create user')
        )
      }
    }
  )

  /**
   * PUT /api/users/:id - Update user
   * CEO/Director only
   */
  fastify.put(
    '/api/users/:id',
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
            username: { type: 'string', pattern: '^[a-zA-Z0-9_-]{3,50}$' },
            email: { type: 'string', format: 'email' },
            first_name: { type: 'string', pattern: '^[a-zA-Z\\s-]{1,100}$' },
            last_name: { type: 'string', pattern: '^[a-zA-Z\\s-]{1,100}$' },
            role: { type: 'string', enum: ['CEO', 'DIRECTOR', 'FACTORY_MANAGER', 'FACTORY_WORKER', 'OFFICE'] },
            is_active: { type: 'boolean' },
            factory_ids: { 
              type: 'array',
              items: { type: 'string', format: 'uuid' },
              minItems: 0,
              maxItems: 10
            }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = userParamsSchema.parse(request.params)
        const input = updateUserSchema.parse(request.body)
        const result = await usersService.update(id, input, request.user!)
        
        if (result.success) {
          return reply.code(200).send(result)
        } else {
          const statusCode = (() => {
            switch (result.error?.code) {
              case ErrorCodes.NOT_FOUND: return 404
              case ErrorCodes.VALIDATION_ERROR: return 400
              case ErrorCodes.DUPLICATE_ENTRY: return 409
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
          createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update user')
        )
      }
    }
  )

  /**
   * DELETE /api/users/:id - Soft delete user
   * CEO/Director only
   */
  fastify.delete(
    '/api/users/:id',
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
        const { id } = userParamsSchema.parse(request.params)
        const query = request.query as { reason?: string }
        const result = await usersService.delete(id, request.user!, query.reason)
        
        if (result.success) {
          return reply.code(200).send(result)
        } else {
          const statusCode = (() => {
            switch (result.error?.code) {
              case ErrorCodes.NOT_FOUND: return 404
              case ErrorCodes.VALIDATION_ERROR: return 400
              default: return 500
            }
          })()
          return reply.code(statusCode).send(result)
        }
      } catch (error) {
        return reply.code(500).send(
          createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete user')
        )
      }
    }
  )
}