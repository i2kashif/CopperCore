import { getSupabaseClient, getFactoryScopedClient } from '../../lib/supabase'
import { Factory, UserContext, ApiResponse, ListQuery, OptimisticLockError, ErrorCodes } from '../common/types'
import { 
  createFactorySchema, 
  updateFactorySchema, 
  listQuerySchema,
  createErrorResponse, 
  createSuccessResponse,
  validateFactoryScope 
} from '../common/validation'
import { AuditService } from '../audit/service'
import { z } from 'zod'

/**
 * Factories service - handles CRUD operations with RLS enforcement
 * 
 * Per PRD §5.12: Manage Company (Factories, Users, Opening Stock)
 * Per PRD §10: Security - Factory scoping enforced
 * Per PRD §2.1: CEO/Director have global access, others are scoped
 */

export class FactoriesService {
  private auditService = new AuditService()
  
  private getSupabase() {
    return getSupabaseClient()
  }

  /**
   * List factories with factory scoping
   */
  async list(query: ListQuery, userContext: UserContext): Promise<ApiResponse<Factory[]>> {
    try {
      // Validate query parameters
      const validatedQuery = listQuerySchema.parse(query)
      
      // Build query with factory scoping
      let dbQuery = this.getSupabase()
        .from('factories')
        .select('*', { count: 'exact' })
      
      // Apply factory scoping unless user is global
      if (!userContext.is_global) {
        if (userContext.factory_ids.length === 0) {
          return createSuccessResponse([], { total: 0, page: validatedQuery.page, limit: validatedQuery.limit })
        }
        dbQuery = dbQuery.in('id', userContext.factory_ids)
      }
      
      // Apply filters
      if (validatedQuery.is_active !== undefined) {
        dbQuery = dbQuery.eq('is_active', validatedQuery.is_active)
      }
      
      if (validatedQuery.search) {
        dbQuery = dbQuery.or(
          `code.ilike.%${validatedQuery.search}%,name.ilike.%${validatedQuery.search}%,city.ilike.%${validatedQuery.search}%`
        )
      }
      
      // Apply sorting
      const sortBy = validatedQuery.sort_by || 'name'
      const sortOrder = validatedQuery.sort_order || 'asc'
      dbQuery = dbQuery.order(sortBy, { ascending: sortOrder === 'asc' })
      
      // Apply pagination
      const offset = (validatedQuery.page - 1) * validatedQuery.limit
      dbQuery = dbQuery.range(offset, offset + validatedQuery.limit - 1)
      
      const { data: factories, error, count } = await dbQuery
      
      if (error) {
        console.error('Failed to list factories:', error)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch factories')
      }
      
      return createSuccessResponse(factories || [], {
        total: count || 0,
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        user_role: userContext.role,
        factory_id: validatedQuery.factory_id
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid query parameters', error.errors)
      }
      
      console.error('Unexpected error in list factories:', error)
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Unexpected error occurred')
    }
  }

  /**
   * Get single factory by ID
   */
  async getById(id: string, userContext: UserContext): Promise<ApiResponse<Factory>> {
    try {
      // Validate factory scope
      if (!validateFactoryScope(userContext.factory_ids, id, userContext.is_global)) {
        return createErrorResponse(ErrorCodes.FACTORY_SCOPE_VIOLATION, 'Access denied for factory')
      }
      
      const { data: factory, error } = await this.getSupabase()
        .from('factories')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return createErrorResponse(ErrorCodes.NOT_FOUND, 'Factory not found')
        }
        
        console.error('Failed to get factory:', error)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch factory')
      }
      
      return createSuccessResponse(factory, {
        user_role: userContext.role,
        factory_id: id
      })
    } catch (error) {
      console.error('Unexpected error in get factory:', error)
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Unexpected error occurred')
    }
  }

  /**
   * Create new factory (CEO/Director only)
   */
  async create(
    input: z.infer<typeof createFactorySchema>, 
    userContext: UserContext
  ): Promise<ApiResponse<Factory>> {
    try {
      // Validate input
      const validatedInput = createFactorySchema.parse(input)
      
      // Check if factory code already exists
      const { data: existing } = await this.getSupabase()
        .from('factories')
        .select('id')
        .eq('code', validatedInput.code)
        .single()
      
      if (existing) {
        return createErrorResponse(ErrorCodes.DUPLICATE_ENTRY, 'Factory code already exists')
      }
      
      const now = new Date().toISOString()
      const factoryData = {
        ...validatedInput,
        created_at: now,
        updated_at: now,
        created_by: userContext.user_id,
        updated_by: userContext.user_id,
        version: 1
      }
      
      const { data: factory, error } = await this.getSupabase()
        .from('factories')
        .insert(factoryData)
        .select()
        .single()
      
      if (error) {
        console.error('Failed to create factory:', error)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create factory')
      }
      
      // Log audit event
      await this.auditService.logEvent({
        entity_type: 'Factory',
        entity_id: factory.id,
        action: 'CREATE',
        factory_id: factory.id,
        user_id: userContext.user_id,
        after_values: factory,
        session_id: userContext.session_id
      })
      
      return createSuccessResponse(factory, {
        user_role: userContext.role,
        factory_id: factory.id
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid input data', error.errors)
      }
      
      console.error('Unexpected error in create factory:', error)
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Unexpected error occurred')
    }
  }

  /**
   * Update factory (CEO/Director only)
   */
  async update(
    id: string,
    input: z.infer<typeof updateFactorySchema>,
    userContext: UserContext
  ): Promise<ApiResponse<Factory>> {
    try {
      // Validate input
      const validatedInput = updateFactorySchema.parse(input)
      const { version, ...updateData } = validatedInput
      
      // Get current factory for optimistic locking and audit trail
      const { data: currentFactory, error: fetchError } = await this.getSupabase()
        .from('factories')
        .select('*')
        .eq('id', id)
        .single()
      
      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return createErrorResponse(ErrorCodes.NOT_FOUND, 'Factory not found')
        }
        console.error('Failed to fetch factory for update:', fetchError)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch factory')
      }
      
      // Check optimistic locking
      if (currentFactory.version !== version) {
        const lockError: OptimisticLockError = new Error('Version mismatch') as OptimisticLockError
        lockError.name = 'OptimisticLockError'
        lockError.currentVersion = currentFactory.version
        lockError.attemptedVersion = version
        lockError.entity = 'Factory'
        lockError.id = id
        
        return createErrorResponse(
          ErrorCodes.OPTIMISTIC_LOCK_ERROR, 
          'Factory has been modified by another user', 
          {
            currentVersion: currentFactory.version,
            attemptedVersion: version
          }
        )
      }
      
      // Check if new code conflicts (if code is being updated)
      if (updateData.code && updateData.code !== currentFactory.code) {
        const { data: existing } = await this.getSupabase()
          .from('factories')
          .select('id')
          .eq('code', updateData.code)
          .neq('id', id)
          .single()
        
        if (existing) {
          return createErrorResponse(ErrorCodes.DUPLICATE_ENTRY, 'Factory code already exists')
        }
      }
      
      const now = new Date().toISOString()
      const factoryUpdate = {
        ...updateData,
        updated_at: now,
        updated_by: userContext.user_id,
        version: currentFactory.version + 1
      }
      
      const { data: factory, error } = await this.getSupabase()
        .from('factories')
        .update(factoryUpdate)
        .eq('id', id)
        .eq('version', version) // Double-check version in DB
        .select()
        .single()
      
      if (error) {
        console.error('Failed to update factory:', error)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update factory')
      }
      
      // Log audit event
      await this.auditService.logEvent({
        entity_type: 'Factory',
        entity_id: factory.id,
        action: 'UPDATE',
        factory_id: factory.id,
        user_id: userContext.user_id,
        before_values: currentFactory,
        after_values: factory,
        session_id: userContext.session_id
      })
      
      return createSuccessResponse(factory, {
        user_role: userContext.role,
        factory_id: factory.id
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid input data', error.errors)
      }
      
      console.error('Unexpected error in update factory:', error)
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Unexpected error occurred')
    }
  }

  /**
   * Soft delete factory (CEO/Director only)
   */
  async delete(
    id: string, 
    userContext: UserContext,
    reason?: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    try {
      // Get current factory
      const { data: currentFactory, error: fetchError } = await this.getSupabase()
        .from('factories')
        .select('*')
        .eq('id', id)
        .single()
      
      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return createErrorResponse(ErrorCodes.NOT_FOUND, 'Factory not found')
        }
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch factory')
      }
      
      // Check for dependencies (users assigned to this factory)
      const { count: userCount } = await this.getSupabase()
        .from('user_factory_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('factory_id', id)
        .eq('is_active', true)
      
      if (userCount && userCount > 0) {
        return createErrorResponse(
          ErrorCodes.VALIDATION_ERROR, 
          'Cannot delete factory with active user assignments',
          { active_users: userCount }
        )
      }
      
      const now = new Date().toISOString()
      const { data: factory, error } = await this.getSupabase()
        .from('factories')
        .update({
          is_active: false,
          updated_at: now,
          updated_by: userContext.user_id,
          version: currentFactory.version + 1
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('Failed to delete factory:', error)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete factory')
      }
      
      // Log audit event
      await this.auditService.logEvent({
        entity_type: 'Factory',
        entity_id: id,
        action: 'DELETE',
        factory_id: id,
        user_id: userContext.user_id,
        before_values: currentFactory,
        after_values: factory,
        reason: reason || 'Soft delete via API',
        session_id: userContext.session_id
      })
      
      return createSuccessResponse({ success: true }, {
        user_role: userContext.role,
        factory_id: id
      })
    } catch (error) {
      console.error('Unexpected error in delete factory:', error)
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Unexpected error occurred')
    }
  }

  /**
   * Get factory statistics (for dashboard)
   */
  async getStats(userContext: UserContext): Promise<ApiResponse<{
    total: number
    active: number
    inactive: number
    by_country: Record<string, number>
  }>> {
    try {
      // Build base query with factory scoping
      let baseQuery = this.getSupabase().from('factories').select('is_active, country')
      
      if (!userContext.is_global) {
        if (userContext.factory_ids.length === 0) {
          return createSuccessResponse({
            total: 0,
            active: 0,
            inactive: 0,
            by_country: {}
          })
        }
        baseQuery = baseQuery.in('id', userContext.factory_ids)
      }
      
      const { data: factories, error } = await baseQuery
      
      if (error) {
        console.error('Failed to get factory stats:', error)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch factory statistics')
      }
      
      const stats = (factories || []).reduce((acc, factory) => {
        acc.total++
        if (factory.is_active) {
          acc.active++
        } else {
          acc.inactive++
        }
        acc.by_country[factory.country] = (acc.by_country[factory.country] || 0) + 1
        return acc
      }, {
        total: 0,
        active: 0,
        inactive: 0,
        by_country: {} as Record<string, number>
      })
      
      return createSuccessResponse(stats, {
        user_role: userContext.role
      })
    } catch (error) {
      console.error('Unexpected error in get factory stats:', error)
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Unexpected error occurred')
    }
  }
}