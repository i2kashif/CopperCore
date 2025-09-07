import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { ProductFamiliesService } from './service'
import { authenticate } from '../../middleware/auth'
import { ErrorCodes } from '../common/types'
import type { ListQuery } from '../common/types'
import { createErrorResponse } from '../common/validation'
import { 
  createProductFamilySchema, 
  updateProductFamilySchema,
  productFamilyParamsSchema,
  productFamilyQuerySchema,
  deleteProductFamilySchema
} from './schema'
import { z } from 'zod'

/**
 * Product Families API routes
 * 
 * Per PRD §5.1: Product Families with configurable attributes
 * Per PRD §5.12: Manage Company - Product Families management
 * Per PRD §2.1: CEO/Director can manage across all factories, others are factory-scoped
 * Per PRD §10: RLS enforcement via factory scoping
 */

const productFamiliesService = new ProductFamiliesService()

export async function productFamiliesRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/product-families - List product families
   * All roles, factory-scoped for non-global users
   */
  fastify.get(
    '/api/product-families',
    {
      preHandler: [authenticate],
      schema: {
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            search: { type: 'string', maxLength: 200 },
            sort_by: { type: 'string', enum: ['name', 'code', 'factory_id', 'created_at', 'updated_at'], default: 'name' },
            sort_order: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
            factory_id: { type: 'string', format: 'uuid' },
            is_active: { type: 'boolean' }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = productFamilyQuerySchema.parse(request.query) as ListQuery
        const result = await productFamiliesService.list(query, request.user!)
        
        if (result.success) {
          return reply.code(200).send(result)
        } else {
          const statusCode = result.error?.code === ErrorCodes.VALIDATION_ERROR ? 400 : 
                           result.error?.code === ErrorCodes.FACTORY_SCOPE_VIOLATION ? 403 : 500
          return reply.code(statusCode).send(result)
        }
      } catch (error) {
        return reply.code(500).send(
          createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to list product families')
        )
      }
    }
  )

  /**
   * GET /api/product-families/stats - Get product family statistics
   * All roles, factory-scoped for non-global users
   */
  fastify.get(
    '/api/product-families/stats',
    {
      preHandler: [authenticate],
      schema: {
        querystring: {
          type: 'object',
          properties: {
            factory_id: { type: 'string', format: 'uuid' }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = request.query as { factory_id?: string }
        const result = await productFamiliesService.getStats(request.user!, query.factory_id)
        
        if (result.success) {
          return reply.code(200).send(result)
        } else {
          const statusCode = result.error?.code === ErrorCodes.FACTORY_SCOPE_VIOLATION ? 403 : 500
          return reply.code(statusCode).send(result)
        }
      } catch (error) {
        return reply.code(500).send(
          createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get product family statistics')
        )
      }
    }
  )

  /**
   * GET /api/product-families/:id - Get single product family
   * All roles, factory-scoped for non-global users
   */
  fastify.get(
    '/api/product-families/:id',
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
        const { id } = productFamilyParamsSchema.parse(request.params)
        const result = await productFamiliesService.getById(id, request.user!)
        
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
          createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get product family')
        )
      }
    }
  )

  /**
   * POST /api/product-families - Create product family
   * All roles, but factory-scoped for non-global users
   */
  fastify.post(
    '/api/product-families',
    {
      preHandler: [authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['factory_id', 'name', 'code'],
          properties: {
            factory_id: { type: 'string', format: 'uuid' },
            name: { type: 'string', minLength: 1, maxLength: 200 },
            code: { type: 'string', pattern: '^[A-Z0-9_-]{2,20}$' },
            description: { type: 'string', maxLength: 1000 },
            attributes: {
              type: 'array',
              items: {
                type: 'object',
                required: ['key', 'label', 'type', 'level', 'decideWhen', 'showIn'],
                properties: {
                  key: { type: 'string', pattern: '^[a-z_][a-z0-9_]*$', minLength: 1, maxLength: 50 },
                  label: { type: 'string', minLength: 1, maxLength: 100 },
                  type: { type: 'string', enum: ['number', 'text', 'enum'] },
                  unit: { type: 'string', maxLength: 20 },
                  level: { type: 'string', enum: ['sku', 'lot', 'unit'] },
                  decideWhen: { type: 'string', enum: ['wo', 'production'] },
                  showIn: { type: 'array', minItems: 1, items: { type: 'string', enum: ['wo', 'inventory', 'packing', 'invoice'] } },
                  validation: {
                    type: 'object',
                    properties: {
                      min: { type: 'number' },
                      max: { type: 'number' },
                      step: { type: 'number' },
                      enumOptions: { type: 'array', items: { type: 'string', minLength: 1 } }
                    },
                    additionalProperties: false
                  },
                  allowAppendOptions: { type: 'boolean' }
                },
                additionalProperties: false
              },
              default: []
            },
            sku_naming_rule: { type: 'string', maxLength: 200 },
            default_unit: { type: 'string', maxLength: 20 },
            default_routing: { type: 'object', additionalProperties: true },
            default_packing_rules: { type: 'object', additionalProperties: true },
            schema_version: { type: 'integer', minimum: 1, default: 1 },
            is_active: { type: 'boolean', default: true }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const input = createProductFamilySchema.parse(request.body)
        const result = await productFamiliesService.create(input, request.user!)
        
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
          createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create product family')
        )
      }
    }
  )

  /**
   * PUT /api/product-families/:id - Update product family
   * All roles, but factory-scoped for non-global users
   */
  fastify.put(
    '/api/product-families/:id',
    {
      preHandler: [authenticate],
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
            factory_id: { type: 'string', format: 'uuid' },
            name: { type: 'string', minLength: 1, maxLength: 200 },
            code: { type: 'string', pattern: '^[A-Z0-9_-]{2,20}$' },
            description: { type: 'string', maxLength: 1000 },
            attributes: {
              type: 'array',
              items: {
                type: 'object',
                required: ['key', 'label', 'type', 'level', 'decideWhen', 'showIn'],
                properties: {
                  key: { type: 'string', pattern: '^[a-z_][a-z0-9_]*$', minLength: 1, maxLength: 50 },
                  label: { type: 'string', minLength: 1, maxLength: 100 },
                  type: { type: 'string', enum: ['number', 'text', 'enum'] },
                  unit: { type: 'string', maxLength: 20 },
                  level: { type: 'string', enum: ['sku', 'lot', 'unit'] },
                  decideWhen: { type: 'string', enum: ['wo', 'production'] },
                  showIn: { type: 'array', minItems: 1, items: { type: 'string', enum: ['wo', 'inventory', 'packing', 'invoice'] } },
                  validation: {
                    type: 'object',
                    properties: {
                      min: { type: 'number' },
                      max: { type: 'number' },
                      step: { type: 'number' },
                      enumOptions: { type: 'array', items: { type: 'string', minLength: 1 } }
                    },
                    additionalProperties: false
                  },
                  allowAppendOptions: { type: 'boolean' }
                },
                additionalProperties: false
              }
            },
            sku_naming_rule: { type: 'string', maxLength: 200 },
            default_unit: { type: 'string', maxLength: 20 },
            default_routing: { type: 'object', additionalProperties: true },
            default_packing_rules: { type: 'object', additionalProperties: true },
            schema_version: { type: 'integer', minimum: 1 },
            is_active: { type: 'boolean' }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = productFamilyParamsSchema.parse(request.params)
        const input = updateProductFamilySchema.parse(request.body)
        const result = await productFamiliesService.update(id, input, request.user!)
        
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
          createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update product family')
        )
      }
    }
  )

  /**
   * DELETE /api/product-families/:id - Soft delete product family
   * All roles, but factory-scoped for non-global users
   */
  fastify.delete(
    '/api/product-families/:id',
    {
      preHandler: [authenticate],
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
        const { id } = productFamilyParamsSchema.parse(request.params)
        const query = request.query as { reason?: string }
        const result = await productFamiliesService.delete(id, request.user!, query.reason)
        
        if (result.success) {
          return reply.code(200).send(result)
        } else {
          const statusCode = (() => {
            switch (result.error?.code) {
              case ErrorCodes.NOT_FOUND: return 404
              case ErrorCodes.VALIDATION_ERROR: return 400
              case ErrorCodes.FACTORY_SCOPE_VIOLATION: return 403
              default: return 500
            }
          })()
          return reply.code(statusCode).send(result)
        }
      } catch (error) {
        return reply.code(500).send(
          createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete product family')
        )
      }
    }
  )
}
