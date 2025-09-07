import { getSupabaseClient } from '../../lib/supabase'
import type { Database } from '../../types/database'
import type { ProductFamily, UserContext, ListQuery } from '../common/types'

/**
 * Product Families repository - Database access layer
 * 
 * Per PRD §5.1: Product Families with configurable attributes
 * Per PRD §10: Factory scoping via RLS policies
 */

type ProductFamilyTable = Database['public']['Tables']['product_families']
type ProductFamilyRow = ProductFamilyTable['Row']
type ProductFamilyInsert = ProductFamilyTable['Insert']
type ProductFamilyUpdate = ProductFamilyTable['Update']

export class ProductFamiliesRepository {
  private getSupabase() {
    return getSupabaseClient()
  }

  /**
   * List product families with filtering and pagination
   */
  async list(query: ListQuery, userContext: UserContext) {
    let dbQuery = this.getSupabase()
      .from('product_families')
      .select('*', { count: 'exact' })
    
    // Apply factory scoping - RLS will handle this automatically
    if (query.factory_id) {
      dbQuery = dbQuery.eq('factory_id', query.factory_id)
    }
    
    // Apply filters
    if (query.is_active !== undefined) {
      dbQuery = dbQuery.eq('is_active', query.is_active)
    }
    
    if (query.search) {
      dbQuery = dbQuery.or(
        `code.ilike.%${query.search}%,name.ilike.%${query.search}%,description.ilike.%${query.search}%`
      )
    }
    
    // Apply sorting
    const sortBy = query.sort_by || 'name'
    const sortOrder = query.sort_order || 'asc'
    dbQuery = dbQuery.order(sortBy, { ascending: sortOrder === 'asc' })
    
    // Apply pagination
    if (query.page && query.limit) {
      const offset = (query.page - 1) * query.limit
      dbQuery = dbQuery.range(offset, offset + query.limit - 1)
    }
    
    return dbQuery
  }

  /**
   * Get product family by ID
   */
  async getById(id: string) {
    return this.getSupabase()
      .from('product_families')
      .select('*')
      .eq('id', id)
      .single()
  }

  /**
   * Get product family by code within factory
   */
  async getByCode(factoryId: string, code: string) {
    return this.getSupabase()
      .from('product_families')
      .select('*')
      .eq('factory_id', factoryId)
      .eq('code', code)
      .single()
  }

  /**
   * Check if code exists in factory
   */
  async codeExistsInFactory(factoryId: string, code: string, excludeId?: string) {
    let query = this.getSupabase()
      .from('product_families')
      .select('id')
      .eq('factory_id', factoryId)
      .eq('code', code)
    
    if (excludeId) {
      query = query.neq('id', excludeId)
    }
    
    return query.single()
  }

  /**
   * Create new product family
   */
  async create(input: ProductFamilyInsert) {
    return this.getSupabase()
      .from('product_families')
      .insert(input)
      .select()
      .single()
  }

  /**
   * Update product family with optimistic locking
   */
  async update(id: string, input: ProductFamilyUpdate, expectedVersion: number) {
    return this.getSupabase()
      .from('product_families')
      .update(input)
      .eq('id', id)
      .eq('version', expectedVersion)
      .select()
      .single()
  }

  /**
   * Soft delete product family
   */
  async softDelete(id: string, updatedBy: string, currentVersion: number) {
    const now = new Date().toISOString()
    
    return this.getSupabase()
      .from('product_families')
      .update({
        is_active: false,
        updated_at: now,
        updated_by: updatedBy,
        version: currentVersion + 1
      })
      .eq('id', id)
      .eq('version', currentVersion)
      .select()
      .single()
  }

  /**
   * Count SKUs using this product family
   */
  async countActiveSKUs(productFamilyId: string) {
    return this.getSupabase()
      .from('skus')
      .select('*', { count: 'exact', head: true })
      .eq('product_family_id', productFamilyId)
      .eq('is_active', true)
  }

  /**
   * Get statistics for dashboard
   */
  async getStatistics(factoryId?: string) {
    let query = this.getSupabase()
      .from('product_families')
      .select('is_active, factory_id')
    
    if (factoryId) {
      query = query.eq('factory_id', factoryId)
    }
    
    return query
  }

  /**
   * Validate factory exists
   */
  async factoryExists(factoryId: string) {
    return this.getSupabase()
      .from('factories')
      .select('id')
      .eq('id', factoryId)
      .eq('is_active', true)
      .single()
  }
}