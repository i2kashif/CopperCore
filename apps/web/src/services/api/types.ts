/**
 * API types for CopperCore ERP frontend
 * Maps between backend API types and frontend types
 */

// Re-export common API types from backend (when available)
// For now, defining them locally to maintain type safety

/**
 * User roles enum - matches backend
 */
export enum UserRole {
  CEO = 'CEO',
  DIRECTOR = 'DIRECTOR', 
  FACTORY_MANAGER = 'FACTORY_MANAGER',
  FACTORY_WORKER = 'FACTORY_WORKER',
  OFFICE = 'OFFICE'
}

/**
 * Base entity with audit fields - matches backend
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
 * Factory entity - matches backend API structure
 */
export interface ApiFactory extends BaseEntity {
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
 * User entity - matches backend API structure
 */
export interface ApiUser extends BaseEntity {
  username: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  is_active: boolean
  last_login?: string
  password_changed_at?: string
}

/**
 * User-Factory assignment - matches backend API structure
 */
export interface ApiUserFactoryAssignment extends BaseEntity {
  user_id: string
  factory_id: string
  assigned_by: string
  assigned_at: string
  is_active: boolean
}

/**
 * API Response wrapper - matches backend
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
 * List query parameters - matches backend
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
 * Factory creation/update input
 */
export interface FactoryInput {
  code: string
  name: string
  address: string
  city: string
  state?: string  // Made optional
  postal_code?: string  // Made optional
  country: string
  phone?: string
  email?: string
  contact_person?: string
  is_active: boolean
  fiscal_year_start?: string  // Made optional
}

/**
 * User creation/update input
 */
export interface UserInput {
  username: string
  email: string
  first_name: string
  last_name: string
  password?: string // Only for creation
  role: UserRole
  is_active: boolean
  assigned_factories?: string[] // Factory IDs for assignment
}

/**
 * User-Factory assignment input
 */
export interface UserFactoryAssignmentInput {
  user_id: string
  factory_id: string
}

/**
 * Bulk assignment input
 */
export interface BulkAssignmentInput {
  user_id: string
  factory_ids: string[]
}

/**
 * User with factory assignments (populated)
 */
export interface ApiUserWithAssignments extends ApiUser {
  assigned_factories: ApiFactory[]
  factory_assignments: ApiUserFactoryAssignment[]
}

/**
 * Factory with users (populated)
 */
export interface ApiFactoryWithUsers extends ApiFactory {
  assigned_users: ApiUser[]
  user_assignments: ApiUserFactoryAssignment[]
}

/**
 * Statistics responses
 */
export interface FactoryStats {
  total_factories: number
  active_factories: number
  inactive_factories: number
  total_users: number
  factories_by_state: Record<string, number>
}

export interface UserStats {
  total_users: number
  active_users: number
  inactive_users: number
  users_by_role: Record<UserRole, number>
  users_by_factory: Record<string, number>
}

/**
 * Assignment statistics
 */
export interface AssignmentStats {
  total_assignments: number
  active_assignments: number
  users_without_factory: number
  factories_without_users: number
  assignments_by_role: Record<UserRole, number>
}

/**
 * Error codes - matches backend
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

/**
 * Convert API factory to frontend factory type
 */
export function mapApiFactoryToFrontend(apiFactory: ApiFactory): import('../../features/manage-company/types').Factory {
  return {
    id: apiFactory.id,
    name: apiFactory.name,
    code: apiFactory.code,
    address: apiFactory.address,
    city: apiFactory.city,
    country: apiFactory.country,
    phone: apiFactory.phone,
    email: apiFactory.email,
    isActive: apiFactory.is_active,
    createdAt: apiFactory.created_at,
    updatedAt: apiFactory.updated_at
  }
}

/**
 * Convert frontend factory to API factory input
 */
export function mapFrontendFactoryToApi(frontendFactory: import('../../features/manage-company/types').FactoryFormData): FactoryInput {
  return {
    code: frontendFactory.code,
    name: frontendFactory.name,
    address: frontendFactory.address,
    city: frontendFactory.city,
    state: undefined, // Optional - not needed
    postal_code: undefined, // Optional - not needed
    country: frontendFactory.country,
    phone: frontendFactory.phone || undefined,
    email: frontendFactory.email || undefined,
    contact_person: undefined, // Optional - not needed
    is_active: frontendFactory.isActive,
    fiscal_year_start: undefined // Optional - not needed
  }
}

/**
 * Convert API user to frontend user type
 */
export function mapApiUserToFrontend(apiUser: ApiUser, assignments?: ApiUserFactoryAssignment[]): import('../../features/manage-company/types').User {
  // Map role enum to frontend role string
  const roleMap: Record<UserRole, import('../../features/manage-company/types').User['role']> = {
    [UserRole.CEO]: 'CEO',
    [UserRole.DIRECTOR]: 'Director',
    [UserRole.FACTORY_MANAGER]: 'Factory Manager',
    [UserRole.FACTORY_WORKER]: 'Factory Worker',
    [UserRole.OFFICE]: 'Office'
  }

  return {
    id: apiUser.id,
    username: apiUser.username,
    email: apiUser.email,
    firstName: apiUser.first_name,
    lastName: apiUser.last_name,
    role: roleMap[apiUser.role],
    assignedFactories: assignments?.filter(a => a.is_active).map(a => a.factory_id) || [],
    isActive: apiUser.is_active,
    createdAt: apiUser.created_at,
    updatedAt: apiUser.updated_at,
    lastLoginAt: apiUser.last_login
  }
}

/**
 * Convert frontend user to API user input
 */
export function mapFrontendUserToApi(frontendUser: import('../../features/manage-company/types').UserFormData): UserInput {
  // Map frontend role string to enum
  const roleMap: Record<import('../../features/manage-company/types').User['role'], UserRole> = {
    'CEO': UserRole.CEO,
    'Director': UserRole.DIRECTOR,
    'Factory Manager': UserRole.FACTORY_MANAGER,
    'Factory Worker': UserRole.FACTORY_WORKER,
    'Office': UserRole.OFFICE
  }

  return {
    username: frontendUser.username,
    email: frontendUser.email,
    first_name: frontendUser.firstName,
    last_name: frontendUser.lastName,
    password: frontendUser.password,
    role: roleMap[frontendUser.role],
    is_active: frontendUser.isActive,
    assigned_factories: frontendUser.assignedFactories
  }
}