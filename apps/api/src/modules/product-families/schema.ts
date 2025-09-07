import { z } from 'zod'

/**
 * Product Family validation schemas
 * 
 * Per PRD §5.1: Product Families with configurable attributes
 * Supports complex attribute definitions for SKU generation
 */

// Product Family attribute definition schema
export const productFamilyAttributeSchema = z.object({
  key: z.string().min(1).max(50).regex(/^[a-z_][a-z0-9_]*$/, 'Attribute key must be snake_case'),
  label: z.string().min(1).max(100),
  type: z.enum(['number', 'text', 'enum']),
  unit: z.string().max(20).optional(),
  level: z.enum(['sku', 'lot', 'unit']),
  decideWhen: z.enum(['wo', 'production']),
  showIn: z.array(z.enum(['wo', 'inventory', 'packing', 'invoice'])).min(1),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(), 
    step: z.number().positive().optional(),
    enumOptions: z.array(z.string().min(1)).optional()
  }).optional(),
  allowAppendOptions: z.boolean().default(false)
})

// Create product family schema
export const createProductFamilySchema = z.object({
  factory_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  code: z.string().regex(/^[A-Z0-9_-]{2,20}$/, 'Code must be 2-20 characters, uppercase letters, numbers, underscore, hyphen'),
  description: z.string().max(1000).optional(),
  attributes: z.array(productFamilyAttributeSchema).default([]),
  sku_naming_rule: z.string().max(200).optional(),
  default_unit: z.string().max(20).optional(),
  default_routing: z.record(z.unknown()).optional(),
  default_packing_rules: z.record(z.unknown()).optional(),
  schema_version: z.number().int().min(1).default(1),
  is_active: z.boolean().default(true)
})

// Update product family schema
export const updateProductFamilySchema = createProductFamilySchema.partial().extend({
  version: z.number().int().positive()
})

// Product family query parameters
export const productFamilyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  sort_by: z.enum(['name', 'code', 'factory_id', 'created_at', 'updated_at']).default('name'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
  factory_id: z.string().uuid().optional(),
  is_active: z.coerce.boolean().optional()
})

// Product family params schema (for route parameters)
export const productFamilyParamsSchema = z.object({
  id: z.string().uuid()
})

// Delete request schema
export const deleteProductFamilySchema = z.object({
  reason: z.string().max(1000).optional()
})

/**
 * Validation helpers
 */

// Validate SKU naming rule uses only sku-level attributes
export function validateSKUNamingRule(namingRule: string, attributes: z.infer<typeof productFamilyAttributeSchema>[]): boolean {
  if (!namingRule) return true
  
  const skuAttributes = attributes
    .filter(attr => attr.level === 'sku')
    .map(attr => attr.key)
  
  // Extract variable names from naming rule (e.g., {metal}_{diameter})
  const ruleVariables = namingRule.match(/\{(\w+)\}/g)?.map(match => match.slice(1, -1)) || []
  
  // Check if all variables in naming rule are sku-level attributes
  return ruleVariables.every(variable => skuAttributes.includes(variable))
}

// Validate attribute consistency - split into smaller functions to reduce complexity
function validateDuplicateKeys(attributes: z.infer<typeof productFamilyAttributeSchema>[]): string[] {
  const errors: string[] = []
  const keys = new Set<string>()
  
  for (const attr of attributes) {
    if (keys.has(attr.key)) {
      errors.push(`Duplicate attribute key: ${attr.key}`)
    } else {
      keys.add(attr.key)
    }
  }
  
  return errors
}

function validateEnumAttributes(attributes: z.infer<typeof productFamilyAttributeSchema>[]): string[] {
  const errors: string[] = []
  
  for (const attr of attributes) {
    if (attr.type === 'enum' && (!attr.validation?.enumOptions || attr.validation.enumOptions.length === 0)) {
      errors.push(`Enum attribute ${attr.key} must have enumOptions`)
    }
  }
  
  return errors
}

function validateNumberAttributes(attributes: z.infer<typeof productFamilyAttributeSchema>[]): string[] {
  const errors: string[] = []
  
  for (const attr of attributes) {
    if (attr.type === 'number' && attr.validation) {
      if (attr.validation.min !== undefined && attr.validation.max !== undefined && attr.validation.min >= attr.validation.max) {
        errors.push(`Attribute ${attr.key}: min must be less than max`)
      }
      
      if (attr.validation.step !== undefined && attr.validation.step <= 0) {
        errors.push(`Attribute ${attr.key}: step must be positive`)
      }
    }
  }
  
  return errors
}

function validateTextAttributes(attributes: z.infer<typeof productFamilyAttributeSchema>[]): string[] {
  const errors: string[] = []
  
  for (const attr of attributes) {
    if (attr.type === 'text' && attr.validation && (attr.validation.min !== undefined || attr.validation.max !== undefined || attr.validation.step !== undefined)) {
      errors.push(`Text attribute ${attr.key} cannot have numeric validations`)
    }
  }
  
  return errors
}

export function validateAttributes(attributes: z.infer<typeof productFamilyAttributeSchema>[]): string[] {
  return [
    ...validateDuplicateKeys(attributes),
    ...validateEnumAttributes(attributes), 
    ...validateNumberAttributes(attributes),
    ...validateTextAttributes(attributes)
  ]
}