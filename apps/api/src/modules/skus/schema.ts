/**
 * SKUs validation schemas
 * 
 * Per PRD §5.2: Input validation for SKU operations
 * Split into manageable files to keep under 500 lines per file requirement
 */

import { z } from 'zod'

/**
 * Base SKU attribute value schema
 * Validates attribute values against expected types
 */
export const AttributeValueSchema = z.record(
  z.string(), 
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.record(z.unknown()),
    z.array(z.unknown())
  ])
).describe('SKU attribute values as key-value pairs')

/**
 * SKU status enum
 */
export const SKUStatusSchema = z.enum(['ACTIVE', 'PENDING_APPROVAL', 'REJECTED', 'DISABLED'])
  .describe('SKU approval and lifecycle status')

/**
 * Create SKU input validation
 */
export const CreateSKUInputSchema = z.object({
  factory_id: z.string().uuid().describe('Factory ID where SKU belongs'),
  product_family_id: z.string().uuid().describe('Product family this SKU belongs to'),
  name: z.string().min(1).max(255).describe('SKU display name'),
  description: z.string().max(1000).optional().describe('Optional description'),
  attribute_values: AttributeValueSchema.describe('SKU-level attribute values from product family'),
  unit_of_measure: z.string().min(1).max(50).default('meters').describe('Unit of measurement'),
  routing: z.record(z.unknown()).optional().describe('Manufacturing routing steps'),
  packing_rules: z.record(z.unknown()).optional().describe('Packaging requirements'),
  status: SKUStatusSchema.default('ACTIVE').describe('Initial status'),
  is_active: z.boolean().default(true).describe('Whether SKU is active')
}).strict().describe('Input for creating a new SKU')

/**
 * Update SKU input validation
 */
export const UpdateSKUInputSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  attribute_values: AttributeValueSchema.optional(),
  unit_of_measure: z.string().min(1).max(50).optional(),
  routing: z.record(z.unknown()).optional().nullable(),
  packing_rules: z.record(z.unknown()).optional().nullable(),
  status: SKUStatusSchema.optional(),
  is_active: z.boolean().optional(),
  version: z.number().int().positive().describe('Version for optimistic locking')
}).strict().describe('Input for updating an existing SKU')

/**
 * SKU filters for listing
 */
export const SKUFiltersSchema = z.object({
  factory_id: z.string().uuid().optional(),
  product_family_id: z.string().uuid().optional(),
  status: SKUStatusSchema.optional(),
  is_active: z.boolean().optional(),
  search: z.string().max(255).optional().describe('Search in name, sku_code, description'),
  attribute_search: AttributeValueSchema.optional().describe('Search by attribute values'),
  has_inventory: z.boolean().optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  updated_after: z.string().datetime().optional(),
  updated_before: z.string().datetime().optional(),
  approved_by: z.string().uuid().optional(),
  created_by: z.string().uuid().optional()
}).strict().describe('Filters for SKU listing')

/**
 * SKU sort options
 */
export const SKUSortOptionsSchema = z.object({
  sort_by: z.enum(['name', 'sku_code', 'factory_id', 'product_family_id', 'status', 'created_at', 'updated_at', 'approved_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
}).strict().describe('Sort options for SKU listing')

/**
 * Pagination schema
 */
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20)
}).strict().describe('Pagination parameters')

/**
 * Bulk operation schema
 */
export const BulkSKUOperationSchema = z.object({
  operation: z.enum(['activate', 'deactivate', 'approve', 'reject', 'delete']),
  sku_ids: z.array(z.string().uuid()).min(1).max(100).describe('SKU IDs to operate on'),
  reason: z.string().max(500).optional().describe('Reason for bulk operation')
}).strict().describe('Bulk operations on multiple SKUs')

/**
 * Pending SKU approval schema
 */
export const PendingSKUApprovalSchema = z.object({
  sku_id: z.string().uuid().describe('SKU ID to approve/reject'),
  action: z.enum(['approve', 'reject']).describe('Approval action'),
  reason: z.string().max(500).optional().describe('Reason for approval/rejection')
}).strict().describe('SKU approval decision')

/**
 * SKU generation input schema (for bulk creation)
 */
export const SKUGenerationInputSchema = z.object({
  factory_id: z.string().uuid().describe('Factory ID'),
  product_family_id: z.string().uuid().describe('Product family ID'),
  attribute_combinations: z.array(AttributeValueSchema).min(1).max(1000)
    .describe('Array of attribute value combinations to generate SKUs'),
  name_template: z.string().max(255).optional()
    .describe('Optional template for SKU names, uses placeholders like {attribute_key}'),
  preview_only: z.boolean().default(false)
    .describe('If true, return preview without creating SKUs')
}).strict().describe('Input for generating multiple SKUs from combinations')

/**
 * Advanced filter schema
 */
export const AttributeFilterSchema = z.object({
  attribute_key: z.string().min(1).describe('Attribute key to filter on'),
  operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in', 'contains']).describe('Filter operator'),
  value: z.unknown().describe('Filter value')
}).strict().describe('Individual attribute filter')

export const AdvancedSKUFiltersSchema = SKUFiltersSchema.extend({
  attribute_filters: z.array(AttributeFilterSchema).optional().describe('Advanced attribute-based filters'),
  product_family_filters: z.object({
    category: z.string().optional(),
    has_routing: z.boolean().optional(),
    has_packing_rules: z.boolean().optional()
  }).optional().describe('Product family related filters'),
  factory_filters: z.object({
    factory_codes: z.array(z.string()).optional(),
    regions: z.array(z.string()).optional()
  }).optional().describe('Factory related filters')
}).describe('Advanced filtering options for complex SKU queries')

/**
 * Export/Import schemas
 */
export const SKUExportSchema = z.object({
  factory_codes: z.array(z.string()).optional().describe('Export SKUs from specific factories'),
  product_family_ids: z.array(z.string().uuid()).optional().describe('Export SKUs from specific product families'),
  include_inactive: z.boolean().default(false).describe('Include inactive SKUs'),
  format: z.enum(['json', 'csv', 'xlsx']).default('json').describe('Export format')
}).strict().describe('SKU export options')

export const SKUImportSchema = z.object({
  factory_code: z.string().min(1).max(50),
  product_family_code: z.string().min(1).max(50),
  sku_code: z.string().min(1).max(100).optional().describe('Optional, will be generated if not provided'),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  attribute_values: AttributeValueSchema,
  unit_of_measure: z.string().min(1).max(50).default('meters'),
  status: SKUStatusSchema.default('ACTIVE'),
  is_active: z.boolean().default(true)
}).strict().describe('SKU import record')

/**
 * Customer cross-reference schema (PRD §3.6)
 */
export const CustomerSKUCrossRefSchema = z.object({
  sku_id: z.string().uuid().describe('Internal SKU ID'),
  customer_id: z.string().uuid().describe('Customer ID'),
  customer_sku_code: z.string().min(1).max(100).describe('Customer\'s SKU code'),
  customer_description: z.string().max(500).describe('Customer\'s description'),
  valid_from: z.string().datetime().describe('Valid from date'),
  valid_until: z.string().datetime().optional().describe('Valid until date (optional)'),
  is_active: z.boolean().default(true).describe('Whether cross-ref is active')
}).strict().describe('Customer SKU cross-reference mapping')

/**
 * Request parameters schemas
 */
export const GetSKUParamsSchema = z.object({
  id: z.string().uuid().describe('SKU ID')
}).strict()

export const GetSKUQuerySchema = z.object({
  include_metadata: z.boolean().default(false).describe('Include computed metadata fields')
}).strict()

export const ListSKUsQuerySchema = PaginationSchema.merge(SKUFiltersSchema).merge(SKUSortOptionsSchema)
  .describe('Query parameters for listing SKUs')

export const GetSKUStatsQuerySchema = z.object({
  factory_id: z.string().uuid().optional().describe('Filter stats by factory'),
  product_family_id: z.string().uuid().optional().describe('Filter stats by product family'),
  date_range: z.object({
    from: z.string().datetime(),
    to: z.string().datetime()
  }).optional().describe('Date range for statistics')
}).strict().describe('Query parameters for SKU statistics')

/**
 * Response schemas (for documentation)
 */
export const SKUResponseSchema = z.object({
  id: z.string().uuid(),
  factory_id: z.string().uuid(),
  product_family_id: z.string().uuid(),
  sku_code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  attribute_values: AttributeValueSchema,
  unit_of_measure: z.string(),
  routing: z.record(z.unknown()).nullable(),
  packing_rules: z.record(z.unknown()).nullable(),
  status: SKUStatusSchema,
  sku_attributes: z.record(z.unknown()).optional(),
  created_by: z.string().uuid().nullable(),
  updated_by: z.string().uuid().nullable(),
  approved_by: z.string().uuid().nullable(),
  approved_at: z.string().datetime().nullable(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  version: z.number().int()
}).strict().describe('SKU entity response')

export const SKUListResponseSchema = z.object({
  skus: z.array(SKUResponseSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  has_more: z.boolean()
}).strict().describe('SKU list response with pagination')

export const SKUStatsResponseSchema = z.object({
  total: z.number().int().min(0),
  active: z.number().int().min(0),
  pending_approval: z.number().int().min(0),
  rejected: z.number().int().min(0),
  disabled: z.number().int().min(0),
  by_factory: z.record(z.string(), z.number().int().min(0)),
  by_product_family: z.record(z.string(), z.object({
    family_name: z.string(),
    count: z.number().int().min(0)
  })),
  recent_activity: z.object({
    created_last_7_days: z.number().int().min(0),
    approved_last_7_days: z.number().int().min(0),
    updated_last_7_days: z.number().int().min(0)
  })
}).strict().describe('SKU statistics response')

/**
 * Error response schema
 */
export const SKUErrorResponseSchema = z.object({
  error: z.string().describe('Error message'),
  code: z.string().optional().describe('Error code'),
  details: z.record(z.unknown()).optional().describe('Additional error details'),
  field_errors: z.record(z.string(), z.array(z.string())).optional().describe('Field-specific validation errors')
}).strict().describe('Error response format')