// SKU (Stock Keeping Unit) Type Definitions
export type SKUStatus = 'active' | 'pending' | 'disabled'
export type PendingReason = 'on_the_fly' | 'approval_required'

// SKU Attribute Value - represents actual values for a SKU
export interface SKUAttributeValue {
  attributeKey: string
  attributeLabel: string
  value: string | number
  unit?: string
  level: 'sku' | 'lot' | 'unit'
}

// Main SKU type
export interface SKU {
  id: string
  code: string // Generated from naming rule
  name: string // Display name
  familyId: string
  familyCode: string
  familyName: string
  status: SKUStatus
  pendingReason?: PendingReason
  attributes: SKUAttributeValue[]
  
  // Metadata
  createdAt: string
  updatedAt: string
  createdBy: string
  approvedBy?: string
  approvedAt?: string
  disabledBy?: string
  disabledAt?: string
  disableReason?: string
  
  // Stats
  totalInventory?: number
  lastUsedAt?: string
  usageCount?: number
  
  // Factory scoping
  factoryId?: string // Optional: some SKUs may be global
}

// Pending SKU for on-the-fly creation
export interface PendingSKU extends Omit<SKU, 'approvedBy' | 'approvedAt'> {
  status: 'pending'
  requestedBy: string
  requestedAt: string
  workOrderId?: string
  canProceed: boolean // Policy: can pack/dispatch while pending
  blockingReason?: string
}

// Form data for creating/editing SKUs
export interface SKUFormData {
  familyId: string
  attributes: Array<{
    key: string
    value: string | number
  }>
  notes?: string
}

// Bulk generation data
export interface BulkSKUGenerationData {
  familyId: string
  attributeGrids: Array<{
    key: string
    values: Array<string | number>
  }>
  skipExisting: boolean
}

// Search and filter types
export interface SKUFilters {
  search: string
  familyId?: string
  status?: SKUStatus
  factoryId?: string
  hasInventory?: boolean
  createdAfter?: string
  createdBefore?: string
}

export interface SKUSort {
  field: 'code' | 'name' | 'createdAt' | 'status' | 'usageCount'
  direction: 'asc' | 'desc'
}

// Approval/Rejection data
export interface SKUApprovalData {
  skuId: string
  action: 'approve' | 'reject'
  reason?: string
  cascade?: boolean // Update related entities
}

// Policy configuration
export interface SKUPolicy {
  allowOnTheFly: boolean
  allowDispatchWhilePending: boolean
  requireApprovalForNewSKUs: boolean
  autoApproveThreshold?: number // Auto-approve if usage > threshold
}

// Export types
export interface SKUExportOptions {
  format: 'csv' | 'excel' | 'json'
  includeDisabled: boolean
  includeAttributes: boolean
  includeStats: boolean
  filters?: SKUFilters
}