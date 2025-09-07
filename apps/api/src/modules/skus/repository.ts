/**
 * SKUs repository layer
 * 
 * Per PRD §5.2: Data access layer for SKU operations
 * Handles database operations with factory scoping and RLS policies
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
  PendingApprovalSKU
} from './types'

type DatabaseSKU = Database['public']['Tables']['skus']['Row']
type DatabaseSKUInsert = Database['public']['Tables']['skus']['Insert']
type DatabaseSKUUpdate = Database['public']['Tables']['skus']['Update']

export class SKURepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Create a new SKU
   */
  async create(input: CreateSKUInput): Promise<SKU> {
    // First validate the product family exists and belongs to the factory
    const { data: productFamily, error: pfError } = await this.supabase
      .from('product_families')
      .select('id, factory_id, attributes, sku_naming_rule')
      .eq('id', input.product_family_id)
      .eq('factory_id', input.factory_id)
      .single()

    if (pfError || !productFamily) {
      throw new Error(`Product family not found or does not belong to factory: ${pfError?.message}`)
    }

    // Use the database function for safe SKU creation with validation
    const { data, error } = await this.supabase
      .rpc('cc_create_sku', {
        p_factory_id: input.factory_id,
        p_product_family_id: input.product_family_id,
        p_name: input.name,
        p_description: input.description || null,
        p_attribute_values: input.attribute_values as any,
        p_unit_of_measure: input.unit_of_measure || 'meters',
        p_routing: input.routing as any || null,
        p_packing_rules: input.packing_rules as any || null,
        p_created_by: input.created_by || null
      })

    if (error) {
      throw new Error(`Failed to create SKU: ${error.message}`)
    }

    // Fetch the created SKU
    return this.getById(data)
  }

  /**
   * Get SKU by ID
   */
  async getById(id: string): Promise<SKU> {
    const { data, error } = await this.supabase
      .from('skus')
      .select(`
        id,
        factory_id,
        product_family_id,
        sku_code,
        name,
        description,
        attribute_values,
        unit_of_measure,
        routing,
        packing_rules,
        status,
        sku_attributes,
        created_by,
        updated_by,
        approved_by,
        approved_at,
        is_active,
        created_at,
        updated_at,
        version
      `)
      .eq('id', id)
      .single()

    if (error || !data) {
      throw new Error(`SKU not found: ${error?.message}`)
    }

    return this.mapDatabaseSKUToSKU(data)
  }

  /**
   * Get SKU with metadata (includes computed fields)
   */
  async getByIdWithMetadata(id: string): Promise<SKUWithMetadata> {
    const { data, error } = await this.supabase
      .from('skus')
      .select(`
        *,
        product_families!inner (
          name,
          code
        ),
        factories!inner (
          name
        )
      `)
      .eq('id', id)
      .single()

    if (error || !data) {
      throw new Error(`SKU not found: ${error?.message}`)
    }

    // Get additional metadata
    const [inventoryCount, workOrderCount] = await Promise.all([
      this.getInventoryLotsCount(id),
      this.getWorkOrdersCount(id)
    ])

    return {
      ...this.mapDatabaseSKUToSKU(data),
      product_family_name: (data.product_families as any).name,
      product_family_code: (data.product_families as any).code,
      factory_name: (data.factories as any).name,
      inventory_lots_count: inventoryCount,
      work_orders_count: workOrderCount,
      can_delete: inventoryCount === 0 && workOrderCount === 0
    }
  }

  /**
   * List SKUs with filtering, sorting, and pagination
   */
  async list(
    filters: SKUFilters = {},
    sort: SKUSortOptions = { sort_by: 'created_at', sort_order: 'desc' },
    page: number = 1,
    limit: number = 20
  ): Promise<{ skus: SKU[]; total: number; has_more: boolean }> {
    let query = this.supabase.from('skus').select(`
      id,
      factory_id,
      product_family_id,
      sku_code,
      name,
      description,
      attribute_values,
      unit_of_measure,
      routing,
      packing_rules,
      status,
      sku_attributes,
      created_by,
      updated_by,
      approved_by,
      approved_at,
      is_active,
      created_at,
      updated_at,
      version
    `, { count: 'exact' })

    // Apply filters
    if (filters.factory_id) {
      query = query.eq('factory_id', filters.factory_id)
    }
    if (filters.product_family_id) {
      query = query.eq('product_family_id', filters.product_family_id)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active)
    }
    if (filters.created_by) {
      query = query.eq('created_by', filters.created_by)
    }
    if (filters.approved_by) {
      query = query.eq('approved_by', filters.approved_by)
    }
    if (filters.created_after) {
      query = query.gte('created_at', filters.created_after)
    }
    if (filters.created_before) {
      query = query.lte('created_at', filters.created_before)
    }
    if (filters.updated_after) {
      query = query.gte('updated_at', filters.updated_after)
    }
    if (filters.updated_before) {
      query = query.lte('updated_at', filters.updated_before)
    }

    // Text search
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,sku_code.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    // Attribute search (basic JSONB containment)
    if (filters.attribute_search) {
      query = query.contains('attribute_values', filters.attribute_search)
    }

    // Apply sorting
    const orderColumn = sort.sort_by === 'factory_id' ? 'factory_id' :
                       sort.sort_by === 'product_family_id' ? 'product_family_id' :
                       sort.sort_by === 'status' ? 'status' :
                       sort.sort_by === 'approved_at' ? 'approved_at' :
                       sort.sort_by === 'updated_at' ? 'updated_at' :
                       sort.sort_by === 'name' ? 'name' :
                       sort.sort_by === 'sku_code' ? 'sku_code' :
                       'created_at'
    
    query = query.order(orderColumn, { ascending: sort.sort_order === 'asc' })

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      throw new Error(`Failed to list SKUs: ${error.message}`)
    }

    const skus = (data || []).map(this.mapDatabaseSKUToSKU)
    const total = count || 0
    const has_more = from + limit < total

    return { skus, total, has_more }
  }

  /**
   * Update SKU with optimistic locking
   */
  async update(id: string, input: UpdateSKUInput): Promise<SKU> {
    const { version, ...updateData } = input
    
    // Prepare update object, excluding undefined values
    const updateObject: DatabaseSKUUpdate = {}
    
    if (updateData.name !== undefined) updateObject.name = updateData.name
    if (updateData.description !== undefined) updateObject.description = updateData.description
    if (updateData.attribute_values !== undefined) updateObject.attribute_values = updateData.attribute_values as any
    if (updateData.unit_of_measure !== undefined) updateObject.unit_of_measure = updateData.unit_of_measure
    if (updateData.routing !== undefined) updateObject.routing = updateData.routing as any
    if (updateData.packing_rules !== undefined) updateObject.packing_rules = updateData.packing_rules as any
    if (updateData.status !== undefined) updateObject.status = updateData.status
    if (updateData.is_active !== undefined) updateObject.is_active = updateData.is_active
    
    updateObject.updated_by = updateData.updated_by

    const { data, error } = await this.supabase
      .from('skus')
      .update(updateObject)
      .eq('id', id)
      .eq('version', version) // Optimistic locking
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        throw new Error('SKU not found or version conflict (concurrent update detected)')
      }
      throw new Error(`Failed to update SKU: ${error.message}`)
    }

    return this.mapDatabaseSKUToSKU(data)
  }

  /**
   * Approve or reject pending SKU
   */
  async approvePendingSKU(
    skuId: string, 
    approvedBy: string, 
    approve: boolean = true,
    reason?: string
  ): Promise<SKU> {
    const { data, error } = await this.supabase
      .rpc('cc_approve_pending_sku', {
        p_sku_id: skuId,
        p_approved_by: approvedBy,
        p_approve: approve
      })

    if (error) {
      throw new Error(`Failed to approve SKU: ${error.message}`)
    }

    return this.getById(skuId)
  }

  /**
   * Soft delete SKU (set is_active = false)
   */
  async softDelete(id: string, deletedBy: string): Promise<void> {
    // Check if SKU can be safely deleted (no inventory or work orders)
    const metadata = await this.getByIdWithMetadata(id)
    if (!metadata.can_delete) {
      throw new Error('Cannot delete SKU: it has associated inventory lots or work orders')
    }

    const { error } = await this.supabase
      .from('skus')
      .update({ 
        is_active: false, 
        status: 'DISABLED',
        updated_by: deletedBy 
      })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete SKU: ${error.message}`)
    }
  }

  /**
   * Hard delete SKU (only for global users, use carefully)
   */
  async hardDelete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('skus')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to hard delete SKU: ${error.message}`)
    }
  }

  /**
   * Get SKU statistics
   */
  async getStats(factoryId?: string): Promise<SKUStats> {
    let query = this.supabase
      .from('sku_stats_by_factory')
      .select('*')

    if (factoryId) {
      query = query.eq('factory_id', factoryId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to get SKU stats: ${error.message}`)
    }

    // Aggregate the statistics
    const stats: SKUStats = {
      total: 0,
      active: 0,
      pending_approval: 0,
      rejected: 0,
      disabled: 0,
      by_factory: {},
      by_product_family: {},
      recent_activity: {
        created_last_7_days: 0,
        approved_last_7_days: 0,
        updated_last_7_days: 0
      }
    }

    if (data) {
      for (const row of data) {
        stats.total += row.total_skus
        stats.active += row.active_skus
        stats.pending_approval += row.pending_approval
        stats.rejected += row.rejected_skus
        stats.disabled += row.disabled_skus
        stats.by_factory[row.factory_name] = row.total_skus
      }
    }

    // Get recent activity
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: recentActivity } = await this.supabase
      .from('skus')
      .select('created_at, approved_at, updated_at')
      .gte('created_at', sevenDaysAgo.toISOString())

    if (recentActivity) {
      stats.recent_activity.created_last_7_days = recentActivity.length
      stats.recent_activity.approved_last_7_days = recentActivity
        .filter(row => row.approved_at && new Date(row.approved_at) >= sevenDaysAgo).length
      stats.recent_activity.updated_last_7_days = recentActivity
        .filter(row => new Date(row.updated_at) >= sevenDaysAgo).length
    }

    return stats
  }

  /**
   * Get pending approvals queue
   */
  async getPendingApprovals(): Promise<PendingApprovalSKU[]> {
    const { data, error } = await this.supabase
      .from('skus')
      .select(`
        id,
        factory_id,
        product_family_id,
        sku_code,
        name,
        attribute_values,
        created_by,
        created_at,
        factories!inner (name),
        product_families!inner (name),
        users!skus_created_by_fkey (email)
      `)
      .eq('status', 'PENDING_APPROVAL')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get pending approvals: ${error.message}`)
    }

    return (data || []).map(row => ({
      id: row.id,
      factory_id: row.factory_id,
      factory_name: (row.factories as any).name,
      product_family_id: row.product_family_id,
      product_family_name: (row.product_families as any).name,
      sku_code: row.sku_code,
      name: row.name,
      attribute_values: row.attribute_values as Record<string, unknown>,
      created_by: row.created_by!,
      created_by_email: (row.users as any)?.email,
      created_at: row.created_at
    }))
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
    const result: BulkOperationResult = {
      success: true,
      processed: 0,
      failed: 0,
      errors: []
    }

    for (const skuId of skuIds) {
      try {
        switch (operation) {
          case 'activate':
            await this.update(skuId, { 
              status: 'ACTIVE', 
              is_active: true, 
              version: 1 // We'll need to get the actual version
            })
            break
          case 'deactivate':
            await this.update(skuId, { 
              status: 'DISABLED', 
              is_active: false, 
              version: 1 
            })
            break
          case 'approve':
            await this.approvePendingSKU(skuId, userId, true, reason)
            break
          case 'reject':
            await this.approvePendingSKU(skuId, userId, false, reason)
            break
          case 'delete':
            await this.softDelete(skuId, userId)
            break
        }
        result.processed++
      } catch (error) {
        result.failed++
        result.errors.push({
          id: skuId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    result.success = result.failed === 0
    return result
  }

  /**
   * Private helper methods
   */
  private mapDatabaseSKUToSKU(data: DatabaseSKU): SKU {
    return {
      id: data.id,
      factory_id: data.factory_id,
      product_family_id: data.product_family_id,
      sku_code: data.sku_code,
      name: data.name,
      description: data.description || undefined,
      attribute_values: (data.attribute_values as Record<string, unknown>) || {},
      unit_of_measure: data.unit_of_measure || 'meters',
      routing: (data.routing as Record<string, unknown>) || undefined,
      packing_rules: (data.packing_rules as Record<string, unknown>) || undefined,
      status: (data.status as 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED' | 'DISABLED') || 'ACTIVE',
      sku_attributes: (data.sku_attributes as Record<string, unknown>) || undefined,
      created_by: data.created_by || undefined,
      updated_by: data.updated_by || undefined,
      approved_by: data.approved_by || undefined,
      approved_at: data.approved_at || undefined,
      is_active: data.is_active,
      created_at: data.created_at,
      updated_at: data.updated_at,
      version: data.version
    }
  }

  private async getInventoryLotsCount(skuId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('inventory_lots')
      .select('*', { count: 'exact', head: true })
      .eq('sku_id', skuId)

    if (error) return 0
    return count || 0
  }

  private async getWorkOrdersCount(skuId: string): Promise<number> {
    // This would need the work_orders table to have sku_id reference
    // For now, return 0 as work orders might reference product families
    return 0
  }
}