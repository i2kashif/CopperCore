// Product Family Attribute Types
export type AttributeType = 'number' | 'text' | 'enum'
export type AttributeLevel = 'sku' | 'lot' | 'unit'
export type DecideWhen = 'wo' | 'production'
export type ShowInLocation = 'wo' | 'inventory' | 'packing' | 'invoice'

export interface AttributeValidation {
  min?: number
  max?: number
  step?: number
  enumOptions?: string[]
}

export interface ProductFamilyAttribute {
  id: string
  key: string // unique identifier for attribute
  label: string // display name
  type: AttributeType
  unit?: string // mm, kg, etc.
  level: AttributeLevel
  decideWhen: DecideWhen
  showIn: ShowInLocation[]
  validation: AttributeValidation
  allowAppendOptions: boolean // for enums, CEO only
  order: number // for drag-drop ordering
  isRequired: boolean
}

export interface SKUNamingRule {
  pattern: string // e.g., "{metal}-{rod_diameter_mm}mm-{enamel_thickness_um}um"
  separator: string // default: "-"
  caseTransform: 'upper' | 'lower' | 'none'
}

export interface RoutingRule {
  stationId: string
  stationName: string
  sequence: number
  isOptional: boolean
  defaultDurationHours?: number
}

export interface PackingRule {
  defaultPackingUnit: string
  defaultQuantityPerUnit: number
  labelTemplateId?: string
}

export interface ProductFamily {
  id: string
  code: string // unique identifier
  name: string // display name
  description?: string
  attributes: ProductFamilyAttribute[]
  skuNamingRule: SKUNamingRule
  defaultRoutingRules: RoutingRule[]
  defaultPackingRules: PackingRule
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface ProductFamilyFormData {
  code: string
  name: string
  description?: string
  attributes: Omit<ProductFamilyAttribute, 'id' | 'order'>[]
  skuNamingRule: SKUNamingRule
  defaultRoutingRules: Omit<RoutingRule, 'stationId'>[]
  defaultPackingRules: PackingRule
  isActive: boolean
}

// Template definitions for common product families
export interface ProductFamilyTemplate {
  id: string
  name: string
  description: string
  icon: string
  template: Omit<ProductFamilyFormData, 'code' | 'name'>
}

// Search and filter types
export interface ProductFamilyFilters {
  search: string
  isActive?: boolean
  hasAttributes?: boolean
}

export interface ProductFamilySort {
  field: 'name' | 'code' | 'createdAt' | 'attributeCount'
  direction: 'asc' | 'desc'
}