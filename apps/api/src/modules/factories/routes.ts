import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { FactoriesService } from './service'
import { authenticate, authorize } from '../../middleware/auth'
import { ListQuery, UserRole, ErrorCodes } from '../common/types'
import { createFactorySchema, updateFactorySchema, createErrorResponse } from '../common/validation'
import { z } from 'zod'

/**
 * Factories API routes
 * 
 * Per PRD §5.12: Manage Company - Factories management
 * Per PRD §2.1: CEO/Director only for create/update/delete
 * Per PRD §10: RLS enforcement via factory scoping
 */

const factoriesService = new FactoriesService()

// Route parameter schemas
const factoryParamsSchema = z.object({
  id: z.string().uuid()
})

// Query parameter schemas for listing
const factoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  sort_by: z.enum(['name', 'code', 'city', 'created_at', 'updated_at']).default('name'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
  factory_id: z.string().uuid().optional(),
  is_active: z.coerce.boolean().optional()
})

export async function factoriesRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/factories - List factories
   * All roles, factory-scoped for non-global users
   */
  fastify.get(
    '/api/factories',
    {
      preHandler: [authenticate],
      schema: {
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            search: { type: 'string', maxLength: 200 },
            sort_by: { type: 'string', enum: ['name', 'code', 'city', 'created_at', 'updated_at'], default: 'name' },
            sort_order: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
            factory_id: { type: 'string', format: 'uuid' },
            is_active: { type: 'boolean' }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = factoryQuerySchema.parse(request.query) as ListQuery
        const result = await factoriesService.list(query, request.user!)
        
        if (result.success) {
          return reply.code(200).send(result)
        } else {
          const statusCode = result.error?.code === ErrorCodes.VALIDATION_ERROR ? 400 : 500
          return reply.code(statusCode).send(result)
        }
      } catch (error) {
        return reply.code(500).send(
          createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to list factories')
        )
      }
    }
  )

  /**
   * GET /api/factories/stats - Get factory statistics
   * All roles, factory-scoped for non-global users
   */
  fastify.get(
    '/api/factories/stats',
    {
      preHandler: [authenticate]
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await factoriesService.getStats(request.user!)
        
        if (result.success) {
          return reply.code(200).send(result)
        } else {
          return reply.code(500).send(result)
        }
      } catch (error) {
        return reply.code(500).send(
          createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get factory statistics')
        )
      }
    }
  )

  /**
   * GET /api/factories/:id - Get single factory
   * All roles, factory-scoped for non-global users
   */
  fastify.get(
    '/api/factories/:id',
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
        const { id } = factoryParamsSchema.parse(request.params)
        const result = await factoriesService.getById(id, request.user!)
        
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
          createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get factory')
        )
      }
    }
  )

  /**
   * POST /api/factories - Create factory
   * CEO/Director only
   */
  fastify.post(
    '/api/factories',
    {
      preHandler: [
        authenticate, 
        authorize({ requireRole: [UserRole.CEO, UserRole.DIRECTOR] })
      ],
      schema: {
        body: {
          type: 'object',
          required: ['code', 'name', 'address', 'city'],  // Only require essential fields
          properties: {
            code: { type: 'string', pattern: '^[A-Z]{3,4}$' },
            name: { type: 'string', minLength: 1, maxLength: 200 },
            address: { type: 'string', minLength: 1, maxLength: 500 },
            city: { type: 'string', minLength: 1, maxLength: 100 },
            state: { type: 'string', maxLength: 100 },  // Optional
            postal_code: { type: 'string', maxLength: 20 },  // Optional
            country: { type: 'string', minLength: 1, maxLength: 100, default: 'Pakistan' },
            phone: { type: 'string', maxLength: 50 },
            email: { type: 'string', format: 'email' },
            contact_person: { type: 'string', pattern: '^[a-zA-Z\\s-]{1,100}$' },
            is_active: { type: 'boolean', default: true },
            fiscal_year_start: { type: 'string', format: 'date-time' }  // Optional
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const input = createFactorySchema.parse(request.body)
        const result = await factoriesService.create(input, request.user!)
        
        if (result.success) {
          return reply.code(201).send(result)
        } else {
          const statusCode = (() => {
            switch (result.error?.code) {
              case ErrorCodes.VALIDATION_ERROR: return 400
              case ErrorCodes.DUPLICATE_ENTRY: return 409
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
          createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create factory')
        )
      }
    }
  )

  /**
   * PUT /api/factories/:id - Update factory
   * CEO/Director only
   */
  fastify.put(
    '/api/factories/:id',
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
            code: { type: 'string', pattern: '^[A-Z]{3,4}$' },
            name: { type: 'string', minLength: 1, maxLength: 200 },
            address: { type: 'string', minLength: 1, maxLength: 500 },
            city: { type: 'string', minLength: 1, maxLength: 100 },
            state: { type: 'string', maxLength: 100 },  // Optional
            postal_code: { type: 'string', maxLength: 20 },  // Optional
            country: { type: 'string', minLength: 1, maxLength: 100 },
            phone: { type: 'string', maxLength: 50 },
            email: { type: 'string', format: 'email' },
            contact_person: { type: 'string', pattern: '^[a-zA-Z\\s-]{1,100}$' },
            is_active: { type: 'boolean' },
            fiscal_year_start: { type: 'string', format: 'date-time' }  // Optional
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = factoryParamsSchema.parse(request.params)
        const input = updateFactorySchema.parse(request.body)
        const result = await factoriesService.update(id, input, request.user!)
        
        if (result.success) {
          return reply.code(200).send(result)
        } else {
          const statusCode = (() => {
            switch (result.error?.code) {
              case ErrorCodes.NOT_FOUND: return 404
              case ErrorCodes.VALIDATION_ERROR: return 400
              case ErrorCodes.DUPLICATE_ENTRY: return 409
              case ErrorCodes.OPTIMISTIC_LOCK_ERROR: return 409
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
          createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update factory')
        )
      }
    }
  )

  /**
   * DELETE /api/factories/:id - Soft delete factory
   * CEO/Director only
   */
  fastify.delete(
    '/api/factories/:id',
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
        const { id } = factoryParamsSchema.parse(request.params)
        const query = request.query as { reason?: string }
        const result = await factoriesService.delete(id, request.user!, query.reason)
        
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
          createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete factory')
        )
      }
    }
  )
}