/**
 * Product Families types
 * 
 * Per PRD §5.1: Product Families with configurable attributes
 * These extend the base types with domain-specific structures
 */

import type { BaseEntity } from '../common/types'

/**
 * Product Family attribute definition
 * Drives SKU generation, inventory tracking, and QC requirements
 */
export interface ProductFamilyAttribute {
  key: string                           // Snake_case identifier (e.g., 'rod_diameter_mm')
  label: string                         // Human-readable label (e.g., 'Rod Diameter (mm)')
  type: 'number' | 'text' | 'enum'      // Data type
  unit?: string                         // Optional unit of measurement
  level: 'sku' | 'lot' | 'unit'        // When this attribute is determined
  decideWhen: 'wo' | 'production'      // When the value is set
  showIn: Array<'wo' | 'inventory' | 'packing' | 'invoice'>  // Where to display
  validation?: {
    min?: number                        // For number types
    max?: number                        // For number types  
    step?: number                       // For number types
    enumOptions?: string[]              // For enum types
  }
  allowAppendOptions?: boolean          // Can users add new enum options (requires approval)
}

/**
 * Extended Product Family entity matching PRD requirements
 */
export interface ProductFamily extends BaseEntity {
  factory_id: string
  name: string
  code: string                          // Factory-unique identifier (e.g., 'EW', 'PVC')
  description?: string
  attributes: ProductFamilyAttribute[]  // Configurable attribute definitions
  sku_naming_rule?: string             // Template for SKU codes (e.g., '{metal}_{diameter}')
  default_unit?: string                // Default unit of measurement
  default_routing?: Record<string, unknown>     // Default production routing
  default_packing_rules?: Record<string, unknown>  // Default packing configuration
  schema_version: number               // For attribute schema evolution
  is_active: boolean
}

/**
 * Product Family creation input
 */
export interface CreateProductFamilyInput {
  factory_id: string
  name: string
  code: string
  description?: string
  attributes?: ProductFamilyAttribute[]
  sku_naming_rule?: string
  default_unit?: string
  default_routing?: Record<string, unknown>
  default_packing_rules?: Record<string, unknown>
  schema_version?: number
  is_active?: boolean
}

/**
 * Product Family update input
 */
export interface UpdateProductFamilyInput extends Partial<CreateProductFamilyInput> {
  version: number  // Required for optimistic locking
}

/**
 * Product Family list response with metadata
 */
export interface ProductFamilyListResponse {
  product_families: ProductFamily[]
  total: number
  page: number
  limit: number
  has_more: boolean
}

/**
 * Product Family statistics for dashboard
 */
export interface ProductFamilyStats {
  total: number
  active: number
  inactive: number
  by_factory: Record<string, number>
  recent_activity: {
    created_last_7_days: number
    updated_last_7_days: number
  }
}

/**
 * SKU naming rule validation result
 */
export interface SKUNamingValidation {
  valid: boolean
  errors: string[]
  variables_used: string[]
  sku_attributes_available: string[]
}

/**
 * Attribute validation result  
 */
export interface AttributeValidation {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Product Family with computed fields for UI
 */
export interface ProductFamilyWithMetadata extends ProductFamily {
  sku_count: number                     // Number of SKUs using this family
  active_sku_count: number             // Number of active SKUs
  last_used?: string                   // Last time this family was used in a WO
  can_delete: boolean                  // Whether family can be safely deleted
}

/**
 * Filter and sort options for listing
 */
export interface ProductFamilyFilters {
  factory_id?: string
  is_active?: boolean
  search?: string                      // Search in name, code, description
  has_skus?: boolean                   // Filter families that have/don't have SKUs
  created_after?: string               // ISO date string
  created_before?: string              // ISO date string
  updated_after?: string               // ISO date string 
  updated_before?: string              // ISO date string
}

export interface ProductFamilySortOptions {
  sort_by: 'name' | 'code' | 'factory_id' | 'created_at' | 'updated_at' | 'sku_count'
  sort_order: 'asc' | 'desc'
}

/**
 * Bulk operations support
 */
export interface BulkProductFamilyOperation {
  operation: 'activate' | 'deactivate' | 'delete'
  product_family_ids: string[]
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
 * Export/Import structures
 */
export interface ProductFamilyExport {
  factory_code: string
  code: string
  name: string
  description?: string
  attributes: ProductFamilyAttribute[]
  sku_naming_rule?: string
  default_unit?: string
  is_active: boolean
  created_at: string
}

export interface ProductFamilyImport extends Omit<ProductFamilyExport, 'created_at'> {
  // Import may not include timestamps
}