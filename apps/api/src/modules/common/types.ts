import type { z } from 'zod'

/**
 * Base entity with audit fields
 */
export interface BaseEntity {
  id: string
  created_at: string
  updated_at: string
  created_by: string
  updated_by: string
  version: number
}

/**
 * Factory entity
 */
export interface Factory extends BaseEntity {
  code: string
  name: string
  address: string
  city: string
  state: string
  postal_code: string
  country: string
  phone?: string
  email?: string
  contact_person?: string
  is_active: boolean
  fiscal_year_start: string // ISO date
}

/**
 * User roles enum
 */
export enum UserRole {
  CEO = 'CEO',
  DIRECTOR = 'DIRECTOR', 
  FACTORY_MANAGER = 'FACTORY_MANAGER',
  FACTORY_WORKER = 'FACTORY_WORKER',
  OFFICE = 'OFFICE'
}

/**
 * User entity
 */
export interface User extends BaseEntity {
  username: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  is_active: boolean
  last_login?: string
  password_changed_at?: string
  // Factory assignments handled via user_factory_assignments table
}

/**
 * User-Factory assignment
 */
export interface UserFactoryAssignment extends BaseEntity {
  user_id: string
  factory_id: string
  assigned_by: string
  assigned_at: string
  is_active: boolean
}

/**
 * Audit event for tamper-evident chain
 */
export interface AuditEvent extends BaseEntity {
  entity_type: string
  entity_id: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT'
  factory_id?: string
  user_id: string
  before_values?: Record<string, any>
  after_values?: Record<string, any>
  reason?: string
  ip_address?: string
  user_agent?: string
  session_id?: string
  previous_hash?: string // For tamper-evident chain
  event_hash: string // SHA-256 of event data + previous hash
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    total?: number
    page?: number
    limit?: number
    factory_id?: string
    user_role?: string
  }
}

/**
 * List query parameters
 */
export interface ListQuery {
  page?: number
  limit?: number
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  factory_id?: string
  is_active?: boolean
}

/**
 * Optimistic locking error
 */
export interface OptimisticLockError extends Error {
  name: 'OptimisticLockError'
  currentVersion: number
  attemptedVersion: number
  entity: string
  id: string
}

/**
 * User context from auth middleware
 */
export interface UserContext {
  user_id: string
  username: string
  role: UserRole
  factory_ids: string[] // Assigned factories
  is_global: boolean // CEO/Director
  session_id: string
}

/**
 * Factory scoped request context
 */
export interface FactoryScopedContext extends UserContext {
  target_factory_id?: string // For operations targeting specific factory
}

/**
 * Create input type from Zod schema
 */
export type CreateInput<T> = z.infer<T>

/**
 * Update input type from Zod schema  
 */
export type UpdateInput<T> = z.infer<T>

/**
 * Common error codes
 */
export enum ErrorCodes {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  OPTIMISTIC_LOCK_ERROR = 'OPTIMISTIC_LOCK_ERROR',
  FACTORY_SCOPE_VIOLATION = 'FACTORY_SCOPE_VIOLATION',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}