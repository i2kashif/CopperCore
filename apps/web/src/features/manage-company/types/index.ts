// Factory type definitions
export interface Factory {
  id: string
  name: string
  code: string
  address: string
  city: string
  country: string
  phone?: string
  email?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// User type definitions
export interface User {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  role: 'CEO' | 'Director' | 'Factory Manager' | 'Factory Worker' | 'Office'
  assignedFactories: string[] // Array of factory IDs
  isActive: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
}

// Opening Stock type definitions
export interface OpeningStockItem {
  id: string
  factoryId: string
  skuId: string
  skuCode: string
  skuName: string
  lotNumber: string
  quantity: number
  unit: string
  location?: string
  expiryDate?: string
  notes?: string
  createdAt: string
  createdBy: string
}

// Form types
export interface FactoryFormData {
  name: string
  code: string
  address: string
  city: string
  country: string
  phone?: string
  email?: string
  isActive: boolean
}

export interface UserFormData {
  username: string
  email: string
  firstName: string
  lastName: string
  password?: string
  role: User['role']
  assignedFactories: string[]
  isActive: boolean
}

export interface OpeningStockFormData {
  factoryId: string
  skuId: string
  lotNumber: string
  quantity: number
  unit: string
  location?: string
  expiryDate?: string
  notes?: string
}

// Re-export Product Family types
export * from './productFamily'

// Re-export SKU types
export * from './sku'