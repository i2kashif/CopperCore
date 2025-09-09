/**
 * Company Management Types
 * Defines types for factory and user management operations
 */

import type { User, Factory, UserRole } from '../auth/types'

// Extended Factory interface for management
export interface ManagedFactory extends Factory {
  user_count?: number
  status_display?: 'Active' | 'Inactive'
}

// Extended User interface for management
export interface ManagedUser extends User {
  factories?: Factory[]
  factory_count?: number
  status_display?: 'Active' | 'Inactive'
  last_login?: string | null
}

// Factory creation/edit form data
export interface FactoryFormData {
  name: string
  code: string
  active: boolean
}

// User creation/edit form data
export interface UserFormData {
  username: string
  email: string | null
  full_name: string | null
  role: UserRole
  active: boolean
  factory_ids: string[]
  password?: string // Only for creation
}

// User invitation form data
export interface UserInviteFormData {
  username: string
  email: string | null
  full_name: string | null
  role: UserRole
  active: boolean
  factory_ids: string[]
  send_invite?: boolean
}

// API Response types
export interface FactoriesListResponse {
  factories: ManagedFactory[]
  total: number
  error?: string
}

export interface UsersListResponse {
  users: ManagedUser[]
  total: number
  error?: string
}

export interface UserFactoryAssignmentResponse {
  success: boolean
  error?: string
}

export interface FactoryStatsResponse {
  factory_id: string
  user_count: number
  active_user_count: number
  last_activity?: string
  error?: string
}

export interface CompanyStatsResponse {
  total_factories: number
  active_factories: number
  total_users: number
  active_users: number
  factories_by_status: {
    active: number
    inactive: number
  }
  users_by_role: Record<UserRole, number>
  error?: string
}

// Filter and search types
export interface FactoryFilters {
  search?: string
  active?: boolean
  sort_by?: 'name' | 'code' | 'created_at' | 'user_count'
  sort_order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface UserFilters {
  search?: string
  role?: UserRole
  active?: boolean
  factory_id?: string
  sort_by?: 'username' | 'full_name' | 'role' | 'created_at' | 'last_login'
  sort_order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

// Bulk operation types
export interface BulkFactoryOperation {
  operation: 'activate' | 'deactivate' | 'delete'
  factory_ids: string[]
}

export interface BulkUserOperation {
  operation: 'activate' | 'deactivate' | 'delete' | 'change_role' | 'assign_factory' | 'unassign_factory'
  user_ids: string[]
  new_role?: UserRole
  factory_id?: string
}

// Form validation types
export interface FieldError {
  field: string
  message: string
}

export interface FormErrors {
  [key: string]: string | undefined
}

// Company management permissions
export type CompanyPermission = 
  | 'manage_factories' 
  | 'create_factory' 
  | 'edit_factory' 
  | 'delete_factory'
  | 'manage_users' 
  | 'create_user' 
  | 'edit_user' 
  | 'delete_user'
  | 'assign_user_factory'
  | 'view_company_stats'

export interface CompanyManagementAccess {
  permissions: CompanyPermission[]
  can_manage_all_factories: boolean
  can_manage_all_users: boolean
  accessible_factory_ids?: string[]
}