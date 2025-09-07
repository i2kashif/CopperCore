/**
 * SKUs/Catalog types
 * 
 * Per PRD §5.2: Product catalog with SKU variants
 * These extend the base types with domain-specific structures for SKU management
 */

import type { BaseEntity } from '../common/types'
import type { ProductFamilyAttribute } from '../product-families/types'

/**
 * SKU entity matching PRD requirements §3.2, §5.2
 */
export interface SKU extends BaseEntity {
  factory_id: string
  product_family_id: string
  sku_code: string                     // Auto-generated from naming rules
  name: string
  description?: string
  attribute_values: Record<string, unknown>  // SKU-level attributes from product family
  unit_of_measure: string
  routing?: Record<string, unknown>           // Manufacturing routing (inherits from family)
  packing_rules?: Record<string, unknown>     // Packaging requirements (inherits from family)
  status: 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED' | 'DISABLED'
  sku_attributes?: Record<string, unknown>    // Legacy field, use attribute_values instead
  created_by?: string
  updated_by?: string
  approved_by?: string
  approved_at?: string
  is_active: boolean
}

/**
 * SKU creation input
 */
export interface CreateSKUInput {
  factory_id: string
  product_family_id: string
  name: string
  description?: string
  attribute_values: Record<string, unknown>   // Must contain all sku-level attributes
  unit_of_measure?: string
  routing?: Record<string, unknown>
  packing_rules?: Record<string, unknown>
  status?: 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED' | 'DISABLED'
  is_active?: boolean
  created_by?: string
}

/**
 * SKU update input
 */
export interface UpdateSKUInput extends Partial<Omit<CreateSKUInput, 'factory_id' | 'product_family_id'>> {
  version: number  // Required for optimistic locking
  updated_by?: string
}

/**
 * SKU list response with metadata
 */
export interface SKUListResponse {
  skus: SKU[]
  total: number
  page: number
  limit: number
  has_more: boolean
}

/**
 * SKU statistics for dashboard
 */
export interface SKUStats {
  total: number
  active: number
  pending_approval: number
  rejected: number
  disabled: number
  by_factory: Record<string, number>
  by_product_family: Record<string, {
    family_name: string
    count: number
  }>
  recent_activity: {
    created_last_7_days: number
    approved_last_7_days: number
    updated_last_7_days: number
  }
}

/**
 * SKU with computed fields for UI
 */
export interface SKUWithMetadata extends SKU {
  product_family_name: string          // Product family name for display
  product_family_code: string          // Product family code for display
  factory_name: string                 // Factory name for display
  inventory_lots_count: number         // Number of inventory lots
  work_orders_count: number            // Number of work orders using this SKU
  last_produced?: string               // Last production date
  last_sold?: string                   // Last sale date
  can_delete: boolean                  // Whether SKU can be safely deleted
}

/**
 * Filter and sort options for listing
 */
export interface SKUFilters {
  factory_id?: string
  product_family_id?: string
  status?: 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED' | 'DISABLED'
  is_active?: boolean
  search?: string                      // Search in name, sku_code, description
  attribute_search?: Record<string, unknown>  // Search by attribute values
  has_inventory?: boolean              // Filter SKUs that have/don't have inventory
  created_after?: string               // ISO date string
  created_before?: string              // ISO date string
  updated_after?: string               // ISO date string 
  updated_before?: string              // ISO date string
  approved_by?: string                 // Filter by approver
  created_by?: string                  // Filter by creator
}

export interface SKUSortOptions {
  sort_by: 'name' | 'sku_code' | 'factory_id' | 'product_family_id' | 'status' | 'created_at' | 'updated_at' | 'approved_at'
  sort_order: 'asc' | 'desc'
}

/**
 * Bulk operations support
 */
export interface BulkSKUOperation {
  operation: 'activate' | 'deactivate' | 'approve' | 'reject' | 'delete'
  sku_ids: string[]
  reason?: string
}

export interface BulkOperationResult {
  success: boolean
  processed: number
  failed: number
  errors: Array<{
    id: string
    error: string
  }>
}

/**
 * SKU validation structures
 */
export interface SKUValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface AttributeValueValidation {
  valid: boolean
  errors: string[]
  missing_required: string[]
  invalid_values: Array<{
    attribute: string
    value: unknown
    reason: string
  }>
}

/**
 * On-the-fly SKU creation (PRD §5.2)
 */
export interface PendingSKURequest {
  factory_id: string
  product_family_id: string
  name: string
  attribute_values: Record<string, unknown>
  requested_by: string
  reason?: string
  allow_proceed_without_approval?: boolean  // Policy-based toggle
}

export interface PendingSKUApproval {
  sku_id: string
  approved_by: string
  action: 'approve' | 'reject'
  reason?: string
}

/**
 * SKU generation from product family
 */
export interface SKUGenerationInput {
  factory_id: string
  product_family_id: string
  attribute_combinations: Array<Record<string, unknown>>  // Grid of sku-level attribute values
  name_template?: string                // Optional name template, defaults to family name + attributes
  preview_only?: boolean               // Just return preview without creating
}

export interface SKUGenerationResult {
  success: boolean
  created_count: number
  preview_count?: number
  skus: Array<{
    sku_code: string
    name: string
    attribute_values: Record<string, unknown>
    id?: string  // Only present if actually created
  }>
  errors: string[]
}

/**
 * Export/Import structures
 */
export interface SKUExport {
  factory_code: string
  product_family_code: string
  sku_code: string
  name: string
  description?: string
  attribute_values: Record<string, unknown>
  unit_of_measure: string
  status: string
  is_active: boolean
  created_at: string
}

export interface SKUImport extends Omit<SKUExport, 'created_at'> {
  // Import may not include timestamps
}

/**
 * SKU approval queue for admin
 */
export interface PendingApprovalSKU {
  id: string
  factory_id: string
  factory_name: string
  product_family_id: string
  product_family_name: string
  sku_code: string
  name: string
  attribute_values: Record<string, unknown>
  created_by: string
  created_by_email?: string
  created_at: string
  reason?: string
  related_work_order?: string          // If created during FG receipt
}

/**
 * SKU analytics and reporting
 */
export interface SKUAnalytics {
  total_skus: number
  active_skus: number
  factories_with_skus: number
  top_product_families: Array<{
    family_id: string
    family_name: string
    sku_count: number
    active_sku_count: number
  }>
  pending_approvals_count: number
  creation_trend: Array<{
    date: string
    created: number
    approved: number
  }>
}

/**
 * Customer SKU cross-reference (PRD §3.6)
 */
export interface CustomerSKUCrossRef {
  id: string
  sku_id: string
  customer_id: string
  customer_sku_code: string
  customer_description: string
  valid_from: string
  valid_until?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Search and indexing support
 */
export interface SKUSearchResult {
  sku: SKU
  relevance_score: number
  matched_fields: string[]
  highlight?: {
    name?: string
    description?: string
    sku_code?: string
  }
}

/**
 * Advanced filtering for complex queries
 */
export interface AdvancedSKUFilters extends SKUFilters {
  attribute_filters: Array<{
    attribute_key: string
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains'
    value: unknown
  }>
  product_family_filters: {
    category?: string
    has_routing?: boolean
    has_packing_rules?: boolean
  }
  factory_filters: {
    factory_codes?: string[]
    regions?: string[]
  }
}
