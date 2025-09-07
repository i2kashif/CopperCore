/**
 * SKUs service layer
 * 
 * Per PRD §5.2: Business logic layer for SKU operations
 * Handles validation, business rules, audit logging, and factory scoping
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import type { 
  SKU, 
  CreateSKUInput, 
  UpdateSKUInput, 
  SKUFilters, 
  SKUSortOptions,
  SKUStats,
  BulkOperationResult,
  SKUWithMetadata,
  PendingApprovalSKU,
  SKUGenerationInput,
  SKUGenerationResult,
  AttributeValueValidation,
  SKUValidationResult
} from './types'
import { SKURepository } from './repository'
import { AuditService } from '../audit/service'

export class SKUService {
  private repository: SKURepository
  private auditService: AuditService

  constructor(private supabase: SupabaseClient<Database>) {
    this.repository = new SKURepository(supabase)
    this.auditService = new AuditService()
  }

  /**
   * Create a new SKU with validation and audit logging
   */
  async create(input: CreateSKUInput, userId: string): Promise<SKU> {
    // Validate the input
    const validation = await this.validateSKUInput(input)
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
    }

    // Validate attribute values against product family
    const attributeValidation = await this.validateAttributeValues(
      input.product_family_id,
      input.attribute_values
    )
    if (!attributeValidation.valid) {
      throw new Error(`Attribute validation failed: ${attributeValidation.errors.join(', ')}`)
    }

    // Set creator
    const createInput: CreateSKUInput = {
      ...input,
      created_by: userId
    }

    // Create the SKU
    const sku = await this.repository.create(createInput)

    // Log audit event
    await this.auditService.logEvent({
      entity_type: 'sku',
      entity_id: sku.id,
      action: 'CREATE',
      factory_id: sku.factory_id,
      user_id: userId,
      after_values: sku as unknown as Record<string, unknown>,
      reason: 'SKU created'
    })

    return sku
  }

  /**
   * Get SKU by ID with factory scoping
   */
  async getById(id: string, userId: string, includeMetadata = false): Promise<SKU | SKUWithMetadata> {
    const sku = includeMetadata 
      ? await this.repository.getByIdWithMetadata(id)
      : await this.repository.getById(id)

    // Factory scoping is handled by RLS policies
    return sku
  }

  /**
   * List SKUs with filtering, sorting, and pagination
   */
  async list(
    filters: SKUFilters = {},
    sort: SKUSortOptions = { sort_by: 'created_at', sort_order: 'desc' },
    page: number = 1,
    limit: number = 20,
    userId: string
  ): Promise<{ skus: SKU[]; total: number; has_more: boolean }> {
    // Factory scoping is handled by RLS policies
    return this.repository.list(filters, sort, page, limit)
  }

  /**
   * Update SKU with validation and audit logging
   */
  async update(id: string, input: UpdateSKUInput, userId: string): Promise<SKU> {
    // Get current SKU for audit trail
    const currentSKU = await this.repository.getById(id)
    
    // Validate update input
    if (input.attribute_values) {
      const attributeValidation = await this.validateAttributeValues(
        currentSKU.product_family_id,
        input.attribute_values
      )
      if (!attributeValidation.valid) {
        throw new Error(`Attribute validation failed: ${attributeValidation.errors.join(', ')}`)
      }
    }

    // Set updater
    const updateInput: UpdateSKUInput = {
      ...input,
      updated_by: userId
    }

    // Update the SKU
    const updatedSKU = await this.repository.update(id, updateInput)

    // Log audit event
    await this.auditService.logEvent({
      entity_type: 'sku',
      entity_id: id,
      action: 'UPDATE',
      factory_id: currentSKU.factory_id,
      user_id: userId,
      before_values: currentSKU as unknown as Record<string, unknown>,
      after_values: updatedSKU as unknown as Record<string, unknown>,
      reason: 'SKU updated'
    })

    return updatedSKU
  }

  /**
   * Approve or reject pending SKU (CEO/Director only)
   */
  async approvePendingSKU(
    skuId: string, 
    userId: string, 
    approve: boolean = true,
    reason?: string
  ): Promise<SKU> {
    // Get current SKU for audit trail
    const currentSKU = await this.repository.getById(skuId)
    
    if (currentSKU.status !== 'PENDING_APPROVAL') {
      throw new Error(`SKU is not pending approval: ${currentSKU.status}`)
    }

    // Approve/reject the SKU
    const updatedSKU = await this.repository.approvePendingSKU(skuId, userId, approve, reason)

    // Log audit event
    await this.auditService.logEvent({
      entity_type: 'sku',
      entity_id: skuId,
      action: approve ? 'APPROVE' : 'REJECT',
      factory_id: currentSKU.factory_id,
      user_id: userId,
      before_values: currentSKU as unknown as Record<string, unknown>,
      after_values: updatedSKU as unknown as Record<string, unknown>,
      reason: reason || (approve ? 'SKU approved' : 'SKU rejected')
    })

    return updatedSKU
  }

  /**
   * Delete SKU (soft delete)
   */
  async delete(id: string, userId: string, reason?: string): Promise<void> {
    // Get current SKU for audit trail
    const currentSKU = await this.repository.getById(id)

    // Perform soft delete
    await this.repository.softDelete(id, userId)

    // Log audit event
    await this.auditService.logEvent({
      entity_type: 'sku',
      entity_id: id,
      action: 'DELETE',
      factory_id: currentSKU.factory_id,
      user_id: userId,
      before_values: currentSKU as unknown as Record<string, unknown>,
      reason: reason || 'SKU deleted'
    })
  }

  /**
   * Get SKU statistics
   */
  async getStats(factoryId?: string, userId?: string): Promise<SKUStats> {
    // Factory scoping handled by RLS
    return this.repository.getStats(factoryId)
  }

  /**
   * Get pending approvals queue (CEO/Director only)
   */
  async getPendingApprovals(userId: string): Promise<PendingApprovalSKU[]> {
    // Access control handled by RLS
    return this.repository.getPendingApprovals()
  }

  /**
   * Bulk generate SKUs from attribute combinations
   */
  async generateSKUs(
    input: SKUGenerationInput, 
    userId: string
  ): Promise<SKUGenerationResult> {
    const result: SKUGenerationResult = {
      success: true,
      created_count: 0,
      preview_count: 0,
      skus: [],
      errors: []
    }

    // Validate product family
    const { data: productFamily, error: pfError } = await this.supabase
      .from('product_families')
      .select('*')
      .eq('id', input.product_family_id)
      .eq('factory_id', input.factory_id)
      .single()

    if (pfError || !productFamily) {
      throw new Error(`Product family not found: ${pfError?.message}`)
    }

    // Process each attribute combination
    for (let i = 0; i < input.attribute_combinations.length; i++) {
      const attributes = input.attribute_combinations[i]
      
      try {
        // Validate attributes
        const validation = await this.validateAttributeValues(
          input.product_family_id,
          attributes
        )
        
        if (!validation.valid) {
          result.errors.push(`Combination ${i + 1}: ${validation.errors.join(', ')}`)
          continue
        }

        // Generate SKU code and name
        const skuCode = await this.generateSKUCode(input.product_family_id, attributes)
        const skuName = this.generateSKUName(productFamily.name, attributes, input.name_template)

        const skuData = {
          sku_code: skuCode,
          name: skuName,
          attribute_values: attributes
        }

        if (input.preview_only) {
          result.skus.push(skuData)
          result.preview_count!++
        } else {
          // Create the actual SKU
          const createInput: CreateSKUInput = {
            factory_id: input.factory_id,
            product_family_id: input.product_family_id,
            name: skuName,
            attribute_values: attributes,
            unit_of_measure: productFamily.default_unit || 'meters',
            routing: productFamily.default_routing || undefined,
            packing_rules: productFamily.default_packing_rules || undefined
          }

          const newSKU = await this.repository.create(createInput)
          result.skus.push({
            ...skuData,
            id: newSKU.id
          })
          result.created_count++

          // Log audit event
          await this.auditService.logEvent({
            entity_type: 'sku',
            entity_id: newSKU.id,
            action: 'CREATE',
            factory_id: newSKU.factory_id,
            user_id: userId,
            after_values: newSKU as unknown as Record<string, unknown>,
            reason: 'Bulk SKU generation'
          })
        }
      } catch (error) {
        result.errors.push(
          `Combination ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    result.success = result.errors.length === 0
    return result
  }

  /**
   * Bulk operations
   */
  async bulkOperation(
    operation: 'activate' | 'deactivate' | 'approve' | 'reject' | 'delete',
    skuIds: string[],
    userId: string,
    reason?: string
  ): Promise<BulkOperationResult> {
    return this.repository.bulkOperation(operation, skuIds, userId, reason)
  }

  /**
   * Validate SKU input data
   */
  async validateSKUInput(input: CreateSKUInput): Promise<SKUValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    // Basic validation
    if (!input.name?.trim()) {
      errors.push('Name is required')
    }
    if (input.name && input.name.length > 255) {
      errors.push('Name must be 255 characters or less')
    }
    if (input.description && input.description.length > 1000) {
      errors.push('Description must be 1000 characters or less')
    }
    if (!input.factory_id) {
      errors.push('Factory ID is required')
    }
    if (!input.product_family_id) {
      errors.push('Product family ID is required')
    }

    // Validate factory exists
    if (input.factory_id) {
      const { data: factory, error } = await this.supabase
        .from('factories')
        .select('id')
        .eq('id', input.factory_id)
        .single()

      if (error || !factory) {
        errors.push('Factory not found')
      }
    }

    // Validate product family exists and belongs to factory
    if (input.factory_id && input.product_family_id) {
      const { data: productFamily, error } = await this.supabase
        .from('product_families')
        .select('id, factory_id')
        .eq('id', input.product_family_id)
        .eq('factory_id', input.factory_id)
        .single()

      if (error || !productFamily) {
        errors.push('Product family not found or does not belong to the specified factory')
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate attribute values against product family definition
   */
  async validateAttributeValues(
    productFamilyId: string,
    attributeValues: Record<string, unknown>
  ): Promise<AttributeValueValidation> {
    const errors: string[] = []
    const missing_required: string[] = []
    const invalid_values: Array<{
      attribute: string
      value: unknown
      reason: string
    }> = []

    // Get product family attributes
    const { data: productFamily, error } = await this.supabase
      .from('product_families')
      .select('attributes')
      .eq('id', productFamilyId)
      .single()

    if (error || !productFamily) {
      errors.push('Product family not found')
      return {
        valid: false,
        errors,
        missing_required,
        invalid_values
      }
    }

    const attributes = (productFamily.attributes as any[]) || []

    // Check each attribute definition
    for (const attr of attributes) {
      if (attr.level === 'sku') { // Only validate sku-level attributes
        const key = attr.key
        const value = attributeValues[key]

        // Check required attributes
        if (value === undefined || value === null) {
          missing_required.push(key)
          continue
        }

        // Type-specific validation
        switch (attr.type) {
          case 'number':
            if (typeof value !== 'number' && typeof value !== 'string') {
              invalid_values.push({
                attribute: key,
                value,
                reason: 'Must be a number'
              })
            } else {
              const numValue = typeof value === 'string' ? parseFloat(value) : value
              if (isNaN(numValue)) {
                invalid_values.push({
                  attribute: key,
                  value,
                  reason: 'Invalid number format'
                })
              } else {
                // Range validation
                if (attr.validation?.min !== undefined && numValue < attr.validation.min) {
                  invalid_values.push({
                    attribute: key,
                    value,
                    reason: `Below minimum value ${attr.validation.min}`
                  })
                }
                if (attr.validation?.max !== undefined && numValue > attr.validation.max) {
                  invalid_values.push({
                    attribute: key,
                    value,
                    reason: `Above maximum value ${attr.validation.max}`
                  })
                }
              }
            }
            break

          case 'enum':
            const enumOptions = attr.validation?.enumOptions || []
            if (!enumOptions.includes(value)) {
              invalid_values.push({
                attribute: key,
                value,
                reason: `Must be one of: ${enumOptions.join(', ')}`
              })
            }
            break

          case 'text':
            if (typeof value !== 'string') {
              invalid_values.push({
                attribute: key,
                value,
                reason: 'Must be a text value'
              })
            }
            break
        }
      }
    }

    return {
      valid: missing_required.length === 0 && invalid_values.length === 0,
      errors,
      missing_required,
      invalid_values
    }
  }

  /**
   * Private helper methods
   */
  private async generateSKUCode(
    productFamilyId: string, 
    attributeValues: Record<string, unknown>
  ): Promise<string> {
    // Use the database function to generate SKU code
    const { data, error } = await this.supabase
      .rpc('cc_generate_sku_code', {
        p_product_family_id: productFamilyId,
        p_attribute_values: attributeValues as any
      })

    if (error) {
      throw new Error(`Failed to generate SKU code: ${error.message}`)
    }

    return data
  }

  private generateSKUName(
    familyName: string,
    attributeValues: Record<string, unknown>,
    template?: string
  ): string {
    if (template) {
      // Use template with placeholders like {attribute_key}
      let name = template
      for (const [key, value] of Object.entries(attributeValues)) {
        name = name.replace(new RegExp(`{${key}}`, 'g'), String(value))
      }
      return name
    }

    // Default naming: family name + key attributes
    const keyAttributes = Object.entries(attributeValues)
      .filter(([_, value]) => value !== null && value !== undefined)
      .map(([key, value]) => `${key}=${value}`)
      .join(', ')

    return keyAttributes ? `${familyName} (${keyAttributes})` : familyName
  }
}
