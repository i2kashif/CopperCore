import { ProductFamily, UserContext, ApiResponse, ListQuery, OptimisticLockError, ErrorCodes } from '../common/types'
import { 
  createErrorResponse, 
  createSuccessResponse,
  validateFactoryScope,
  listQuerySchema
} from '../common/validation'
import { AuditService } from '../audit/service'
import { ProductFamiliesRepository } from './repository'
import { 
  createProductFamilySchema, 
  updateProductFamilySchema,
  validateAttributes,
  validateSKUNamingRule
} from './schema'
import { z } from 'zod'

/**
 * Product Families service - handles CRUD operations with RLS enforcement
 * 
 * Per PRD §5.1: Product Families with configurable attributes
 * Per PRD §10: Security - Factory scoping enforced
 * Per PRD §2.1: CEO/Director have global access, others are scoped
 */

export class ProductFamiliesService {
  private auditService = new AuditService()
  private repository = new ProductFamiliesRepository()

  /**
   * List product families with factory scoping
   */
  async list(query: ListQuery, userContext: UserContext): Promise<ApiResponse<ProductFamily[]>> {
    try {
      // Validate query parameters
      const validatedQuery = listQuerySchema.parse(query)
      
      // Apply factory scoping validation if specific factory requested
      if (validatedQuery.factory_id && !validateFactoryScope(userContext.factory_ids, validatedQuery.factory_id, userContext.is_global)) {
        return createErrorResponse(ErrorCodes.FACTORY_SCOPE_VIOLATION, 'Access denied for factory')
      }
      
      // If user is not global and has no factories, return empty result
      if (!userContext.is_global && userContext.factory_ids.length === 0) {
        return createSuccessResponse([], { total: 0, page: validatedQuery.page, limit: validatedQuery.limit })
      }
      
      const { data: productFamilies, error, count } = await this.repository.list(validatedQuery, userContext)
      
      if (error) {
        console.error('Failed to list product families:', error)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch product families')
      }
      
      return createSuccessResponse(productFamilies || [], {
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
      
      console.error('Unexpected error in list product families:', error)
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Unexpected error occurred')
    }
  }

  /**
   * Get single product family by ID
   */
  async getById(id: string, userContext: UserContext): Promise<ApiResponse<ProductFamily>> {
    try {
      const { data: productFamily, error } = await this.repository.getById(id)
      
      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return createErrorResponse(ErrorCodes.NOT_FOUND, 'Product family not found')
        }
        
        console.error('Failed to get product family:', error)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch product family')
      }
      
      // Validate factory scope
      if (!validateFactoryScope(userContext.factory_ids, productFamily.factory_id, userContext.is_global)) {
        return createErrorResponse(ErrorCodes.FACTORY_SCOPE_VIOLATION, 'Access denied for factory')
      }
      
      return createSuccessResponse(productFamily, {
        user_role: userContext.role,
        factory_id: productFamily.factory_id
      })
    } catch (error) {
      console.error('Unexpected error in get product family:', error)
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Unexpected error occurred')
    }
  }

  /**
   * Create new product family
   */
  async create(
    input: z.infer<typeof createProductFamilySchema>, 
    userContext: UserContext
  ): Promise<ApiResponse<ProductFamily>> {
    try {
      // Validate input
      const validatedInput = createProductFamilySchema.parse(input)
      
      // Validate factory scope
      if (!validateFactoryScope(userContext.factory_ids, validatedInput.factory_id, userContext.is_global)) {
        return createErrorResponse(ErrorCodes.FACTORY_SCOPE_VIOLATION, 'Access denied for factory')
      }
      
      // Validate attributes
      if (validatedInput.attributes) {
        const attributeErrors = validateAttributes(validatedInput.attributes)
        if (attributeErrors.length > 0) {
          return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid attributes', attributeErrors)
        }
        
        // Validate SKU naming rule if provided
        if (validatedInput.sku_naming_rule && !validateSKUNamingRule(validatedInput.sku_naming_rule, validatedInput.attributes)) {
          return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'SKU naming rule uses attributes that are not sku-level')
        }
      }
      
      // Check if factory exists
      const { error: factoryError } = await this.repository.factoryExists(validatedInput.factory_id)
      if (factoryError) {
        return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Factory does not exist or is not active')
      }
      
      // Check if product family code already exists in factory
      const { data: existing } = await this.repository.codeExistsInFactory(validatedInput.factory_id, validatedInput.code)
      if (existing) {
        return createErrorResponse(ErrorCodes.DUPLICATE_ENTRY, 'Product family code already exists in this factory')
      }
      
      const now = new Date().toISOString()
      const productFamilyData = {
        ...validatedInput,
        created_at: now,
        updated_at: now,
        created_by: userContext.user_id,
        updated_by: userContext.user_id,
        version: 1
      }
      
      const { data: productFamily, error } = await this.repository.create(productFamilyData)
      
      if (error) {
        console.error('Failed to create product family:', error)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create product family')
      }
      
      // Log audit event
      await this.auditService.logEvent({
        entity_type: 'ProductFamily',
        entity_id: productFamily.id,
        action: 'CREATE',
        factory_id: productFamily.factory_id,
        user_id: userContext.user_id,
        after_values: productFamily,
        session_id: userContext.session_id
      })
      
      return createSuccessResponse(productFamily, {
        user_role: userContext.role,
        factory_id: productFamily.factory_id
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid input data', error.errors)
      }
      
      console.error('Unexpected error in create product family:', error)
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Unexpected error occurred')
    }
  }

  /**
   * Update product family
   */
  async update(
    id: string,
    input: z.infer<typeof updateProductFamilySchema>,
    userContext: UserContext
  ): Promise<ApiResponse<ProductFamily>> {
    try {
      // Validate input
      const validatedInput = updateProductFamilySchema.parse(input)
      const { version, ...updateData } = validatedInput
      
      // Get current product family for optimistic locking and audit trail
      const { data: currentProductFamily, error: fetchError } = await this.repository.getById(id)
      
      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return createErrorResponse(ErrorCodes.NOT_FOUND, 'Product family not found')
        }
        console.error('Failed to fetch product family for update:', fetchError)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch product family')
      }
      
      // Validate factory scope for current factory
      if (!validateFactoryScope(userContext.factory_ids, currentProductFamily.factory_id, userContext.is_global)) {
        return createErrorResponse(ErrorCodes.FACTORY_SCOPE_VIOLATION, 'Access denied for factory')
      }
      
      // Check optimistic locking
      if (currentProductFamily.version !== version) {
        const lockError: OptimisticLockError = new Error('Version mismatch') as OptimisticLockError
        lockError.name = 'OptimisticLockError'
        lockError.currentVersion = currentProductFamily.version
        lockError.attemptedVersion = version
        lockError.entity = 'ProductFamily'
        lockError.id = id
        
        return createErrorResponse(
          ErrorCodes.OPTIMISTIC_LOCK_ERROR, 
          'Product family has been modified by another user', 
          {
            currentVersion: currentProductFamily.version,
            attemptedVersion: version
          }
        )
      }
      
      // Validate new factory scope if factory_id is being changed
      if (updateData.factory_id && updateData.factory_id !== currentProductFamily.factory_id) {
        if (!validateFactoryScope(userContext.factory_ids, updateData.factory_id, userContext.is_global)) {
          return createErrorResponse(ErrorCodes.FACTORY_SCOPE_VIOLATION, 'Access denied for new factory')
        }
      }
      
      // Validate attributes if provided
      if (updateData.attributes) {
        const attributeErrors = validateAttributes(updateData.attributes)
        if (attributeErrors.length > 0) {
          return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid attributes', attributeErrors)
        }
        
        // Validate SKU naming rule
        const skuNamingRule = updateData.sku_naming_rule || currentProductFamily.sku_naming_rule
        if (skuNamingRule && !validateSKUNamingRule(skuNamingRule, updateData.attributes)) {
          return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'SKU naming rule uses attributes that are not sku-level')
        }
      }
      
      // Check if new code conflicts (if code is being updated)
      if (updateData.code && updateData.code !== currentProductFamily.code) {
        const factoryId = updateData.factory_id || currentProductFamily.factory_id
        const { data: existing } = await this.repository.codeExistsInFactory(factoryId, updateData.code, id)
        
        if (existing) {
          return createErrorResponse(ErrorCodes.DUPLICATE_ENTRY, 'Product family code already exists in this factory')
        }
      }
      
      const now = new Date().toISOString()
      const productFamilyUpdate = {
        ...updateData,
        updated_at: now,
        updated_by: userContext.user_id,
        version: currentProductFamily.version + 1
      }
      
      const { data: productFamily, error } = await this.repository.update(id, productFamilyUpdate, version)
      
      if (error) {
        console.error('Failed to update product family:', error)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update product family')
      }
      
      // Log audit event
      await this.auditService.logEvent({
        entity_type: 'ProductFamily',
        entity_id: productFamily.id,
        action: 'UPDATE',
        factory_id: productFamily.factory_id,
        user_id: userContext.user_id,
        before_values: currentProductFamily,
        after_values: productFamily,
        session_id: userContext.session_id
      })
      
      return createSuccessResponse(productFamily, {
        user_role: userContext.role,
        factory_id: productFamily.factory_id
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid input data', error.errors)
      }
      
      console.error('Unexpected error in update product family:', error)
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Unexpected error occurred')
    }
  }

  /**
   * Soft delete product family
   */
  async delete(
    id: string, 
    userContext: UserContext,
    reason?: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    try {
      // Get current product family
      const { data: currentProductFamily, error: fetchError } = await this.repository.getById(id)
      
      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return createErrorResponse(ErrorCodes.NOT_FOUND, 'Product family not found')
        }
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch product family')
      }
      
      // Validate factory scope
      if (!validateFactoryScope(userContext.factory_ids, currentProductFamily.factory_id, userContext.is_global)) {
        return createErrorResponse(ErrorCodes.FACTORY_SCOPE_VIOLATION, 'Access denied for factory')
      }
      
      // Check for dependencies (SKUs using this product family)
      const { count: skuCount } = await this.repository.countActiveSKUs(id)
      
      if (skuCount && skuCount > 0) {
        return createErrorResponse(
          ErrorCodes.VALIDATION_ERROR, 
          'Cannot delete product family with active SKUs',
          { active_skus: skuCount }
        )
      }
      
      const { data: productFamily, error } = await this.repository.softDelete(id, userContext.user_id, currentProductFamily.version)
      
      if (error) {
        console.error('Failed to delete product family:', error)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete product family')
      }
      
      // Log audit event
      await this.auditService.logEvent({
        entity_type: 'ProductFamily',
        entity_id: id,
        action: 'DELETE',
        factory_id: productFamily.factory_id,
        user_id: userContext.user_id,
        before_values: currentProductFamily,
        after_values: productFamily,
        reason: reason || 'Soft delete via API',
        session_id: userContext.session_id
      })
      
      return createSuccessResponse({ success: true }, {
        user_role: userContext.role,
        factory_id: productFamily.factory_id
      })
    } catch (error) {
      console.error('Unexpected error in delete product family:', error)
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Unexpected error occurred')
    }
  }

  /**
   * Get product family statistics (for dashboard)
   */
  async getStats(userContext: UserContext, factoryId?: string): Promise<ApiResponse<{
    total: number
    active: number
    inactive: number
    by_factory: Record<string, number>
  }>> {
    try {
      // Apply factory scoping validation if specific factory requested
      if (factoryId && !validateFactoryScope(userContext.factory_ids, factoryId, userContext.is_global)) {
        return createErrorResponse(ErrorCodes.FACTORY_SCOPE_VIOLATION, 'Access denied for factory')
      }
      
      const { data: productFamilies, error } = await this.repository.getStatistics(factoryId)
      
      if (error) {
        console.error('Failed to get product family stats:', error)
        return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch product family statistics')
      }
      
      // Filter results based on user's factory access
      const filteredFamilies = (productFamilies || []).filter(pf => 
        userContext.is_global || userContext.factory_ids.includes(pf.factory_id)
      )
      
      const stats = filteredFamilies.reduce((acc, productFamily) => {
        acc.total++
        if (productFamily.is_active) {
          acc.active++
        } else {
          acc.inactive++
        }
        acc.by_factory[productFamily.factory_id] = (acc.by_factory[productFamily.factory_id] || 0) + 1
        return acc
      }, {
        total: 0,
        active: 0,
        inactive: 0,
        by_factory: {} as Record<string, number>
      })
      
      return createSuccessResponse(stats, {
        user_role: userContext.role,
        factory_id: factoryId
      })
    } catch (error) {
      console.error('Unexpected error in get product family stats:', error)
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Unexpected error occurred')
    }
  }
}