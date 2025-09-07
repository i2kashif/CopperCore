/**
 * SKUs routes
 * 
 * Per PRD §5.2: REST API endpoints for SKU operations
 * Handles HTTP requests, validation, error handling, and response formatting
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { 
  CreateSKUInput, 
  UpdateSKUInput, 
  SKUFilters, 
  SKUSortOptions
} from './types'

import { SKUService } from './service'
import { authenticate } from '../../middleware/auth'
import { createErrorResponse } from '../common/validation'
import { ErrorCodes } from '../common/types'
import { getSupabaseClient } from '../../lib/supabase'

export async function skuRoutes(fastify: FastifyInstance) {
  const supabase = getSupabaseClient()
  const skuService = new SKUService(supabase)

  // Authentication middleware for all routes
  fastify.addHook('onRequest', authenticate)

  /**
   * Get all SKUs with filtering, sorting, and pagination
   * GET /
   */
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as any
      const userId = (request as any).user.id
      
      const filters: SKUFilters = {
        factory_id: query.factory_id,
        product_family_id: query.product_family_id,
        status: query.status,
        is_active: query.is_active,
        search: query.search,
        created_after: query.created_after,
        created_before: query.created_before,
        updated_after: query.updated_after,
        updated_before: query.updated_before,
        approved_by: query.approved_by,
        created_by: query.created_by
      }

      const sort: SKUSortOptions = {
        sort_by: query.sort_by || 'created_at',
        sort_order: query.sort_order || 'desc'
      }

      const result = await skuService.list(
        filters,
        sort,
        query.page || 1,
        query.limit || 20,
        userId
      )

      return reply.code(200).send({
        skus: result.skus,
        total: result.total,
        page: query.page || 1,
        limit: query.limit || 20,
        has_more: result.has_more
      })
    } catch (error) {
      request.log.error(error, 'Failed to list SKUs')
      return reply.code(500).send(
        createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to list SKUs')
      )
    }
  })

  /**
   * Create a new SKU
   * POST /
   */
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const input = request.body as CreateSKUInput
      const userId = (request as any).user.id

      const sku = await skuService.create(input, userId)
      return reply.code(201).send(sku)
    } catch (error) {
      request.log.error(error, 'Failed to create SKU')
      if (error instanceof Error) {
        if (error.message.includes('validation failed') || error.message.includes('attribute validation')) {
          return reply.code(400).send(
            createErrorResponse(ErrorCodes.VALIDATION_ERROR, error.message)
          )
        }
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          return reply.code(409).send(
            createErrorResponse(ErrorCodes.DUPLICATE_ENTRY, error.message)
          )
        }
      }
      return reply.code(500).send(
        createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create SKU')
      )
    }
  })

  /**
   * Get SKU by ID
   * GET /:id
   */
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }
      const { include_metadata } = request.query as { include_metadata?: boolean }
      const userId = (request as any).user.id

      const sku = await skuService.getById(id, userId, include_metadata)
      return reply.code(200).send(sku)
    } catch (error) {
      request.log.error(error, 'Failed to get SKU')
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.code(404).send(
          createErrorResponse(ErrorCodes.NOT_FOUND, 'SKU not found')
        )
      }
      return reply.code(500).send(
        createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get SKU')
      )
    }
  })

  /**
   * Update SKU
   * PUT /:id
   */
  fastify.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }
      const input = request.body as UpdateSKUInput
      const userId = (request as any).user.id

      const sku = await skuService.update(id, input, userId)
      return reply.code(200).send(sku)
    } catch (error) {
      request.log.error(error, 'Failed to update SKU')
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return reply.code(404).send(
            createErrorResponse(ErrorCodes.NOT_FOUND, 'SKU not found')
          )
        }
        if (error.message.includes('version conflict') || error.message.includes('concurrent update')) {
          return reply.code(409).send(
            createErrorResponse(ErrorCodes.OPTIMISTIC_LOCK_ERROR, error.message)
          )
        }
        if (error.message.includes('validation failed')) {
          return reply.code(400).send(
            createErrorResponse(ErrorCodes.VALIDATION_ERROR, error.message)
          )
        }
      }
      return reply.code(500).send(
        createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update SKU')
      )
    }
  })

  /**
   * Delete SKU (soft delete)
   * DELETE /:id
   */
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }
      const userId = (request as any).user.id

      await skuService.delete(id, userId)
      return reply.code(204).send()
    } catch (error) {
      request.log.error(error, 'Failed to delete SKU')
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.code(404).send(
          createErrorResponse(ErrorCodes.NOT_FOUND, 'SKU not found')
        )
      }
      return reply.code(500).send(
        createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete SKU')
      )
    }
  })

  /**
   * Get SKU statistics
   * GET /stats
   */
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { factory_id } = request.query as { factory_id?: string }
      const userId = (request as any).user.id

      const stats = await skuService.getStats(factory_id, userId)
      return reply.code(200).send(stats)
    } catch (error) {
      request.log.error(error, 'Failed to get SKU stats')
      return reply.code(500).send(
        createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get SKU statistics')
      )
    }
  })

  /**
   * Get pending approvals queue (CEO/Director only)
   * GET /pending-approvals
   */
  fastify.get('/pending-approvals', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.id

      const pendingApprovals = await skuService.getPendingApprovals(userId)
      return reply.code(200).send(pendingApprovals)
    } catch (error) {
      request.log.error(error, 'Failed to get pending approvals')
      return reply.code(500).send(
        createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get pending approvals')
      )
    }
  })

  /**
   * Approve or reject pending SKU (CEO/Director only)
   * POST /approve
   */
  fastify.post('/approve', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { sku_id, action, reason } = request.body as {
        sku_id: string
        action: 'approve' | 'reject'
        reason?: string
      }
      const userId = (request as any).user.id

      const sku = await skuService.approvePendingSKU(
        sku_id,
        userId,
        action === 'approve',
        reason
      )
      
      return reply.code(200).send(sku)
    } catch (error) {
      request.log.error(error, 'Failed to approve/reject SKU')
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return reply.code(404).send(
            createErrorResponse(ErrorCodes.NOT_FOUND, 'SKU not found')
          )
        }
        if (error.message.includes('not pending approval')) {
          return reply.code(400).send(
            createErrorResponse(ErrorCodes.VALIDATION_ERROR, error.message)
          )
        }
      }
      return reply.code(500).send(
        createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to approve/reject SKU')
      )
    }
  })

  // Health check endpoint
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.code(200).send({
      status: 'ok',
      service: 'SKUs API',
      timestamp: new Date().toISOString()
    })
  })
}