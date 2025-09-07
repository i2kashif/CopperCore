/**
 * Mock in-memory database for development
 * Replaces Supabase when database is not available
 */

import { v4 as uuidv4 } from 'uuid'

// Mock data stores
export const mockFactories = new Map([
  ['f1000000-0000-0000-0000-000000000001', {
    id: 'f1000000-0000-0000-0000-000000000001',
    code: 'LHR',
    name: 'Lahore Manufacturing',
    address: '123 Industrial Area',
    city: 'Lahore',
    state: 'Punjab',
    postal_code: '54000',
    country: 'Pakistan',
    phone: '+92-42-1234567',
    email: 'lahore@coppercore.pk',
    contact_person: 'Ahmad Khan',
    is_active: true,
    fiscal_year_start: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'u1000000-0000-0000-0000-000000000001',
    updated_by: 'u1000000-0000-0000-0000-000000000001',
    version: 1
  }],
  ['f2000000-0000-0000-0000-000000000002', {
    id: 'f2000000-0000-0000-0000-000000000002',
    code: 'KHI',
    name: 'Karachi Plant',
    address: '456 Export Zone',
    city: 'Karachi',
    state: 'Sindh',
    postal_code: '74000',
    country: 'Pakistan',
    phone: '+92-21-7654321',
    email: 'karachi@coppercore.pk',
    contact_person: 'Sara Ali',
    is_active: true,
    fiscal_year_start: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'u1000000-0000-0000-0000-000000000001',
    updated_by: 'u1000000-0000-0000-0000-000000000001',
    version: 1
  }]
])

export const mockUsers = new Map([
  ['u1000000-0000-0000-0000-000000000001', {
    id: 'u1000000-0000-0000-0000-000000000001',
    username: 'ceo',
    email: 'ceo@coppercore.pk',
    password_hash: 'admin123', // Plain text for mock
    first_name: 'Ahmed',
    last_name: 'Khan',
    role: 'CEO',
    is_active: true,
    last_login: null,
    password_changed_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: null,
    updated_by: null,
    version: 1
  }],
  ['u2000000-0000-0000-0000-000000000002', {
    id: 'u2000000-0000-0000-0000-000000000002',
    username: 'director',
    email: 'director@coppercore.pk',
    password_hash: 'password',
    first_name: 'Sara',
    last_name: 'Ali',
    role: 'DIRECTOR',
    is_active: true,
    last_login: null,
    password_changed_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'u1000000-0000-0000-0000-000000000001',
    updated_by: 'u1000000-0000-0000-0000-000000000001',
    version: 1
  }],
  ['u3000000-0000-0000-0000-000000000003', {
    id: 'u3000000-0000-0000-0000-000000000003',
    username: 'manager_lhr',
    email: 'manager.lhr@coppercore.pk',
    password_hash: 'password',
    first_name: 'Ali',
    last_name: 'Hassan',
    role: 'FACTORY_MANAGER',
    is_active: true,
    last_login: null,
    password_changed_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'u1000000-0000-0000-0000-000000000001',
    updated_by: 'u1000000-0000-0000-0000-000000000001',
    version: 1
  }]
])

export const mockUserFactoryAssignments = new Map([
  ['a1', {
    id: 'a1',
    user_id: 'u1000000-0000-0000-0000-000000000001',
    factory_id: 'f1000000-0000-0000-0000-000000000001',
    assigned_by: 'u1000000-0000-0000-0000-000000000001',
    assigned_at: '2024-01-01T00:00:00Z',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'u1000000-0000-0000-0000-000000000001',
    updated_by: 'u1000000-0000-0000-0000-000000000001',
    version: 1
  }],
  ['a2', {
    id: 'a2',
    user_id: 'u1000000-0000-0000-0000-000000000001',
    factory_id: 'f2000000-0000-0000-0000-000000000002',
    assigned_by: 'u1000000-0000-0000-0000-000000000001',
    assigned_at: '2024-01-01T00:00:00Z',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'u1000000-0000-0000-0000-000000000001',
    updated_by: 'u1000000-0000-0000-0000-000000000001',
    version: 1
  }],
  ['a3', {
    id: 'a3',
    user_id: 'u2000000-0000-0000-0000-000000000002',
    factory_id: 'f1000000-0000-0000-0000-000000000001',
    assigned_by: 'u1000000-0000-0000-0000-000000000001',
    assigned_at: '2024-01-01T00:00:00Z',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'u1000000-0000-0000-0000-000000000001',
    updated_by: 'u1000000-0000-0000-0000-000000000001',
    version: 1
  }],
  ['a4', {
    id: 'a4',
    user_id: 'u3000000-0000-0000-0000-000000000003',
    factory_id: 'f1000000-0000-0000-0000-000000000001',
    assigned_by: 'u1000000-0000-0000-0000-000000000001',
    assigned_at: '2024-01-01T00:00:00Z',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'u1000000-0000-0000-0000-000000000001',
    updated_by: 'u1000000-0000-0000-0000-000000000001',
    version: 1
  }]
])

interface QueryFilter {
  type: 'eq'
  column: string
  value: unknown
}

/**
 * Mock database client that mimics Supabase API
 */
export class MockDatabase {
  /**
   * Mock select query builder
   */
  from(table: string) {
    return new MockQueryBuilder(table)
  }

  /**
   * Check if mock mode is enabled
   */
  static isEnabled(): boolean {
    return process.env.USE_MOCK_DB === 'true' || !process.env.SUPABASE_URL
  }
}

class MockQueryBuilder {
  private table: string
  private filters: QueryFilter[] = []
  private selectColumns = '*'
  private limitCount?: number
  private singleResult = false

  constructor(table: string) {
    this.table = table
  }

  select(columns: string = '*') {
    this.selectColumns = columns
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ type: 'eq', column, value })
    return this
  }

  single() {
    this.singleResult = true
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  insert(data: Record<string, unknown>) {
    return this.executeInsert(data)
  }

  update(data: Record<string, unknown>) {
    return this.executeUpdate(data)
  }

  delete() {
    return this.executeDelete()
  }

  async executeInsert(data: Record<string, unknown>) {
    try {
      const store = this.getStore()
      const newItem = {
        ...data,
        id: data.id || uuidv4(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1
      }
      
      store.set(newItem.id, newItem)
      
      return { data: newItem, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: { message } }
    }
  }

  async executeUpdate(data: Record<string, unknown>) {
    try {
      const store = this.getStore()
      const items = this.applyFilters(Array.from(store.values()))
      
      if (items.length === 0) {
        return { data: null, error: { message: 'No items found to update' } }
      }
      
      const updatedItems = items.map(item => {
        const updated = {
          ...item,
          ...data,
          updated_at: new Date().toISOString(),
          version: (item.version || 0) + 1
        }
        store.set(item.id, updated)
        return updated
      })
      
      return { data: this.singleResult ? updatedItems[0] : updatedItems, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: { message } }
    }
  }

  async executeDelete() {
    try {
      const store = this.getStore()
      const items = this.applyFilters(Array.from(store.values()))

      items.forEach(item => store.delete((item as { id: string }).id))

      return { data: items, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      return { data: null, error: { message } }
    }
  }

  async then(resolve: (_value: unknown) => void, reject: (_reason: unknown) => void) {
    try {
      const store = this.getStore()
      let results = Array.from(store.values())
      
      // Apply filters
      results = this.applyFilters(results)
      
      // Apply limit
      if (this.limitCount) {
        results = results.slice(0, this.limitCount)
      }
      
      // Handle single result
      if (this.singleResult) {
        const result = results[0] || null
        resolve({ data: result, error: result ? null : { message: 'No rows found' } })
      } else {
        resolve({ data: results, error: null })
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      reject({ data: null, error: { message } })
    }
  }

  private getStore(): Map<string, Record<string, unknown>> {
    switch (this.table) {
      case 'factories':
        return mockFactories as Map<string, Record<string, unknown>>
      case 'users':
        return mockUsers as Map<string, Record<string, unknown>>
      case 'user_factory_assignments':
        return mockUserFactoryAssignments as Map<string, Record<string, unknown>>
      default:
        throw new Error(`Table ${this.table} not found in mock database`)
    }
  }

  private applyFilters(items: Record<string, unknown>[]): Record<string, unknown>[] {
    return items.filter(item =>
      this.filters.every(filter => {
        if (filter.type === 'eq') {
          return item[filter.column] === filter.value
        }
        return true
      })
    )
  }
}