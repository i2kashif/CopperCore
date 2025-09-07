/**
 * SKUs module test utilities
 * 
 * Test helpers and mock data for SKU operations
 * Used for unit tests and development
 */

import type { 
  SKU, 
  CreateSKUInput, 
  UpdateSKUInput,
  SKUWithMetadata,
  PendingApprovalSKU,
  SKUStats
} from './types'

/**
 * Mock SKU data for testing
 */
export const mockSKU: SKU = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  factory_id: 'f1234567-e89b-12d3-a456-426614174001',
  product_family_id: 'pf123456-e89b-12d3-a456-426614174002',
  sku_code: 'CU_2.5_PVC',
  name: 'Copper Wire 2.5mm PVC Insulated',
  description: 'Standard copper wire with PVC insulation',
  attribute_values: {
    metal: 'copper',
    conductor_area_mm2: 2.5,
    insulation_type: 'pvc',
    insulation_thickness_mm: 0.7
  },
  unit_of_measure: 'meters',
  routing: {
    steps: [
      { order: 1, operation: 'wire_drawing', machine: 'WD-001' },
      { order: 2, operation: 'insulation', machine: 'INS-001' }
    ]
  },
  packing_rules: {
    default_reel_size: 500,
    max_weight_kg: 25,
    label_template: 'standard'
  },
  status: 'ACTIVE',
  is_active: true,
  created_by: 'user123',
  updated_by: 'user123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  version: 1
}

export const mockSKUWithMetadata: SKUWithMetadata = {
  ...mockSKU,
  product_family_name: 'Copper Wires',
  product_family_code: 'CU',
  factory_name: 'Main Factory',
  inventory_lots_count: 5,
  work_orders_count: 2,
  last_produced: '2024-01-15T10:30:00Z',
  last_sold: '2024-01-20T14:22:00Z',
  can_delete: false
}

export const mockPendingSKU: SKU = {
  ...mockSKU,
  id: '223e4567-e89b-12d3-a456-426614174000',
  sku_code: 'CU_4.0_XLPE_PENDING',
  name: 'Copper Wire 4.0mm XLPE (Pending Approval)',
  status: 'PENDING_APPROVAL',
  attribute_values: {
    metal: 'copper',
    conductor_area_mm2: 4.0,
    insulation_type: 'xlpe',
    insulation_thickness_mm: 0.9
  }
}

export const mockPendingApproval: PendingApprovalSKU = {
  id: mockPendingSKU.id,
  factory_id: mockPendingSKU.factory_id,
  factory_name: 'Main Factory',
  product_family_id: mockPendingSKU.product_family_id,
  product_family_name: 'Copper Wires',
  sku_code: mockPendingSKU.sku_code,
  name: mockPendingSKU.name,
  attribute_values: mockPendingSKU.attribute_values,
  created_by: 'user456',
  created_by_email: 'factory.manager@example.com',
  created_at: mockPendingSKU.created_at,
  reason: 'On-the-fly SKU creation during FG receipt'
}

export const mockSKUStats: SKUStats = {
  total: 125,
  active: 118,
  pending_approval: 3,
  rejected: 1,
  disabled: 3,
  by_factory: {
    'Main Factory': 85,
    'Branch Factory': 40
  },
  by_product_family: {
    'copper_wires': {
      family_name: 'Copper Wires',
      count: 65
    },
    'aluminum_cables': {
      family_name: 'Aluminum Cables',
      count: 35
    },
    'fiber_optics': {
      family_name: 'Fiber Optic Cables',
      count: 25
    }
  },
  recent_activity: {
    created_last_7_days: 12,
    approved_last_7_days: 8,
    updated_last_7_days: 15
  }
}

/**
 * Test helper functions
 */
export class SKUTestHelper {
  /**
   * Create a mock CreateSKUInput
   */
  static createMockCreateInput(overrides: Partial<CreateSKUInput> = {}): CreateSKUInput {
    return {
      factory_id: 'f1234567-e89b-12d3-a456-426614174001',
      product_family_id: 'pf123456-e89b-12d3-a456-426614174002',
      name: 'Test SKU',
      description: 'Test SKU description',
      attribute_values: {
        metal: 'copper',
        diameter_mm: 2.5,
        coating: 'pvc'
      },
      unit_of_measure: 'meters',
      status: 'ACTIVE',
      is_active: true,
      ...overrides
    }
  }

  /**
   * Create a mock UpdateSKUInput
   */
  static createMockUpdateInput(overrides: Partial<UpdateSKUInput> = {}): UpdateSKUInput {
    return {
      name: 'Updated SKU Name',
      description: 'Updated description',
      version: 1,
      ...overrides
    }
  }

  /**
   * Create multiple mock SKUs for list testing
   */
  static createMockSKUList(count: number = 5): SKU[] {
    return Array.from({ length: count }, (_, i) => ({
      ...mockSKU,
      id: `sku-${i + 1}`,
      sku_code: `SKU_${i + 1}`,
      name: `Test SKU ${i + 1}`,
      attribute_values: {
        ...mockSKU.attribute_values,
        sequence: i + 1
      },
      created_at: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString()
    }))
  }

  /**
   * Create mock attribute combinations for bulk generation
   */
  static createMockAttributeCombinations() {
    return [
      { metal: 'copper', diameter_mm: 1.5, coating: 'pvc' },
      { metal: 'copper', diameter_mm: 2.5, coating: 'pvc' },
      { metal: 'copper', diameter_mm: 4.0, coating: 'pvc' },
      { metal: 'copper', diameter_mm: 1.5, coating: 'xlpe' },
      { metal: 'copper', diameter_mm: 2.5, coating: 'xlpe' },
      { metal: 'aluminum', diameter_mm: 4.0, coating: 'pvc' }
    ]
  }

  /**
   * Validate SKU structure
   */
  static validateSKUStructure(sku: any): boolean {
    const requiredFields = [
      'id', 'factory_id', 'product_family_id', 'sku_code', 'name',
      'attribute_values', 'unit_of_measure', 'status', 'is_active',
      'created_at', 'updated_at', 'version'
    ]
    
    return requiredFields.every(field => sku.hasOwnProperty(field))
  }

  /**
   * Validate SKU with metadata structure
   */
  static validateSKUWithMetadataStructure(sku: any): boolean {
    if (!this.validateSKUStructure(sku)) return false
    
    const metadataFields = [
      'product_family_name', 'product_family_code', 'factory_name',
      'inventory_lots_count', 'work_orders_count', 'can_delete'
    ]
    
    return metadataFields.every(field => sku.hasOwnProperty(field))
  }

  /**
   * Generate test scenarios for attribute validation
   */
  static getAttributeValidationScenarios() {
    return [
      {
        description: 'Valid numeric attribute',
        attributes: { diameter_mm: 2.5, metal: 'copper' },
        shouldPass: true
      },
      {
        description: 'Invalid numeric attribute (string)',
        attributes: { diameter_mm: 'invalid', metal: 'copper' },
        shouldPass: false
      },
      {
        description: 'Missing required attribute',
        attributes: { diameter_mm: 2.5 }, // missing metal
        shouldPass: false
      },
      {
        description: 'Invalid enum value',
        attributes: { diameter_mm: 2.5, metal: 'invalid_metal' },
        shouldPass: false
      },
      {
        description: 'Numeric value below minimum',
        attributes: { diameter_mm: 0.5, metal: 'copper' }, // assuming min is 1.0
        shouldPass: false
      },
      {
        description: 'Numeric value above maximum',
        attributes: { diameter_mm: 50.0, metal: 'copper' }, // assuming max is 25.0
        shouldPass: false
      }
    ]
  }

  /**
   * Generate test data for sorting scenarios
   */
  static getSortingTestData() {
    const now = new Date()
    return [
      {
        ...mockSKU,
        id: 'sku-1',
        name: 'A First SKU',
        sku_code: 'SKU_001',
        created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        ...mockSKU,
        id: 'sku-2',
        name: 'B Second SKU',
        sku_code: 'SKU_002',
        created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        ...mockSKU,
        id: 'sku-3',
        name: 'C Third SKU',
        sku_code: 'SKU_003',
        created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  }

  /**
   * Generate test data for filtering scenarios
   */
  static getFilteringTestData() {
    return [
      {
        ...mockSKU,
        id: 'sku-active-1',
        status: 'ACTIVE' as const,
        is_active: true,
        factory_id: 'factory-1'
      },
      {
        ...mockSKU,
        id: 'sku-pending-1',
        status: 'PENDING_APPROVAL' as const,
        is_active: true,
        factory_id: 'factory-1'
      },
      {
        ...mockSKU,
        id: 'sku-disabled-1',
        status: 'DISABLED' as const,
        is_active: false,
        factory_id: 'factory-2'
      },
      {
        ...mockSKU,
        id: 'sku-rejected-1',
        status: 'REJECTED' as const,
        is_active: false,
        factory_id: 'factory-2'
      }
    ]
  }

  /**
   * Create error scenarios for testing error handling
   */
  static getErrorScenarios() {
    return [
      {
        scenario: 'Invalid factory ID',
        input: {
          ...this.createMockCreateInput(),
          factory_id: 'invalid-uuid'
        },
        expectedError: /factory.*not found|invalid uuid/i
      },
      {
        scenario: 'Invalid product family ID',
        input: {
          ...this.createMockCreateInput(),
          product_family_id: 'invalid-uuid'
        },
        expectedError: /product family.*not found/i
      },
      {
        scenario: 'Empty name',
        input: {
          ...this.createMockCreateInput(),
          name: ''
        },
        expectedError: /name.*required/i
      },
      {
        scenario: 'Duplicate SKU code',
        input: this.createMockCreateInput(),
        setupError: 'Create duplicate',
        expectedError: /sku code.*exists|duplicate/i
      }
    ]
  }
}

/**
 * Mock implementations for testing without database
 */
export class MockSKUService {
  private skus: Map<string, SKU> = new Map()
  private nextId = 1

  constructor() {
    // Pre-populate with some test data
    this.skus.set(mockSKU.id, mockSKU)
    this.skus.set(mockPendingSKU.id, mockPendingSKU)
  }

  async create(input: CreateSKUInput): Promise<SKU> {
    const id = `mock-sku-${this.nextId++}`
    const sku: SKU = {
      ...input,
      id,
      sku_code: `MOCK_${Date.now()}`,
      attribute_values: input.attribute_values || {},
      unit_of_measure: input.unit_of_measure || 'meters',
      status: input.status || 'ACTIVE',
      is_active: input.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1
    }
    
    this.skus.set(id, sku)
    return sku
  }

  async getById(id: string): Promise<SKU> {
    const sku = this.skus.get(id)
    if (!sku) {
      throw new Error(`SKU not found: ${id}`)
    }
    return sku
  }

  async list(): Promise<{ skus: SKU[]; total: number; has_more: boolean }> {
    const skus = Array.from(this.skus.values())
    return {
      skus,
      total: skus.length,
      has_more: false
    }
  }

  async update(id: string, input: UpdateSKUInput): Promise<SKU> {
    const existing = await this.getById(id)
    const updated: SKU = {
      ...existing,
      ...input,
      updated_at: new Date().toISOString(),
      version: existing.version + 1
    }
    
    this.skus.set(id, updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    if (!this.skus.has(id)) {
      throw new Error(`SKU not found: ${id}`)
    }
    
    const sku = this.skus.get(id)!
    this.skus.set(id, {
      ...sku,
      is_active: false,
      status: 'DISABLED',
      updated_at: new Date().toISOString(),
      version: sku.version + 1
    })
  }

  async getStats(): Promise<SKUStats> {
    return mockSKUStats
  }
}