/**
 * Company Management API Service
 * Handles API calls for factory and user management operations
 */

import type {
  ManagedFactory,
  ManagedUser,
  FactoryFormData,
  UserFormData,
  UserInviteFormData,
  FactoriesListResponse,
  UsersListResponse,
  UserFactoryAssignmentResponse,
  FactoryStatsResponse,
  CompanyStatsResponse,
  FactoryFilters,
  UserFilters,
  BulkFactoryOperation,
  BulkUserOperation,
  CompanyManagementAccess
} from './types'

class CompanyService {
  private baseUrl = '/api/company'

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const token = localStorage.getItem('auth_token')

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    }

    const response = await fetch(url, config)
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // ============= FACTORY MANAGEMENT =============

  /**
   * Get all factories with optional filtering
   */
  async getFactories(filters?: FactoryFilters): Promise<FactoriesListResponse> {
    const params = new URLSearchParams()
    
    if (filters?.search) params.append('search', filters.search)
    if (filters?.active !== undefined) params.append('active', String(filters.active))
    if (filters?.sort_by) params.append('sort_by', filters.sort_by)
    if (filters?.sort_order) params.append('sort_order', filters.sort_order)
    if (filters?.page) params.append('page', String(filters.page))
    if (filters?.limit) params.append('limit', String(filters.limit))

    const query = params.toString()
    const endpoint = `/factories${query ? `?${query}` : ''}`

    return this.request<FactoriesListResponse>(endpoint)
  }

  /**
   * Get factory by ID
   */
  async getFactory(factoryId: string): Promise<{ factory: ManagedFactory; error?: string }> {
    return this.request<{ factory: ManagedFactory; error?: string }>(`/factories/${factoryId}`)
  }

  /**
   * Create new factory
   */
  async createFactory(data: FactoryFormData): Promise<{ factory: ManagedFactory; error?: string }> {
    return this.request<{ factory: ManagedFactory; error?: string }>('/factories', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Update existing factory
   */
  async updateFactory(
    factoryId: string, 
    data: Partial<FactoryFormData>
  ): Promise<{ factory: ManagedFactory; error?: string }> {
    return this.request<{ factory: ManagedFactory; error?: string }>(`/factories/${factoryId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Delete factory
   */
  async deleteFactory(factoryId: string): Promise<{ success: boolean; error?: string }> {
    return this.request<{ success: boolean; error?: string }>(`/factories/${factoryId}`, {
      method: 'DELETE',
    })
  }

  /**
   * Get factory statistics
   */
  async getFactoryStats(factoryId: string): Promise<FactoryStatsResponse> {
    return this.request<FactoryStatsResponse>(`/factories/${factoryId}/stats`)
  }

  /**
   * Bulk factory operations
   */
  async bulkFactoryOperation(operation: BulkFactoryOperation): Promise<{ success: boolean; error?: string }> {
    return this.request<{ success: boolean; error?: string }>('/factories/bulk', {
      method: 'POST',
      body: JSON.stringify(operation),
    })
  }

  // ============= USER MANAGEMENT =============

  /**
   * Get all users with optional filtering
   */
  async getUsers(filters?: UserFilters): Promise<UsersListResponse> {
    const params = new URLSearchParams()
    
    if (filters?.search) params.append('search', filters.search)
    if (filters?.role) params.append('role', filters.role)
    if (filters?.active !== undefined) params.append('active', String(filters.active))
    if (filters?.factory_id) params.append('factory_id', filters.factory_id)
    if (filters?.sort_by) params.append('sort_by', filters.sort_by)
    if (filters?.sort_order) params.append('sort_order', filters.sort_order)
    if (filters?.page) params.append('page', String(filters.page))
    if (filters?.limit) params.append('limit', String(filters.limit))

    const query = params.toString()
    const endpoint = `/users${query ? `?${query}` : ''}`

    return this.request<UsersListResponse>(endpoint)
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<{ user: ManagedUser; error?: string }> {
    return this.request<{ user: ManagedUser; error?: string }>(`/users/${userId}`)
  }

  /**
   * Create new user
   */
  async createUser(data: UserFormData): Promise<{ user: ManagedUser; error?: string }> {
    return this.request<{ user: ManagedUser; error?: string }>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Invite new user
   */
  async inviteUser(data: UserInviteFormData): Promise<{ success: boolean; invite_token?: string; error?: string }> {
    return this.request<{ success: boolean; invite_token?: string; error?: string }>('/users/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Update existing user
   */
  async updateUser(
    userId: string, 
    data: Partial<UserFormData>
  ): Promise<{ user: ManagedUser; error?: string }> {
    return this.request<{ user: ManagedUser; error?: string }>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    return this.request<{ success: boolean; error?: string }>(`/users/${userId}`, {
      method: 'DELETE',
    })
  }

  /**
   * Bulk user operations
   */
  async bulkUserOperation(operation: BulkUserOperation): Promise<{ success: boolean; error?: string }> {
    return this.request<{ success: boolean; error?: string }>('/users/bulk', {
      method: 'POST',
      body: JSON.stringify(operation),
    })
  }

  // ============= USER-FACTORY ASSIGNMENTS =============

  /**
   * Assign user to factory
   */
  async assignUserToFactory(userId: string, factoryId: string): Promise<UserFactoryAssignmentResponse> {
    return this.request<UserFactoryAssignmentResponse>(`/users/${userId}/factories/${factoryId}`, {
      method: 'POST',
    })
  }

  /**
   * Unassign user from factory
   */
  async unassignUserFromFactory(userId: string, factoryId: string): Promise<UserFactoryAssignmentResponse> {
    return this.request<UserFactoryAssignmentResponse>(`/users/${userId}/factories/${factoryId}`, {
      method: 'DELETE',
    })
  }

  /**
   * Update user's factory assignments
   */
  async updateUserFactoryAssignments(
    userId: string, 
    factoryIds: string[]
  ): Promise<UserFactoryAssignmentResponse> {
    return this.request<UserFactoryAssignmentResponse>(`/users/${userId}/factories`, {
      method: 'PUT',
      body: JSON.stringify({ factory_ids: factoryIds }),
    })
  }

  /**
   * Get user's factory assignments
   */
  async getUserFactoryAssignments(userId: string): Promise<{ factories: ManagedFactory[]; error?: string }> {
    return this.request<{ factories: ManagedFactory[]; error?: string }>(`/users/${userId}/factories`)
  }

  // ============= COMPANY STATS =============

  /**
   * Get overall company statistics
   */
  async getCompanyStats(): Promise<CompanyStatsResponse> {
    return this.request<CompanyStatsResponse>('/stats')
  }

  /**
   * Get current user's company management access permissions
   */
  async getManagementAccess(): Promise<{ access: CompanyManagementAccess; error?: string }> {
    return this.request<{ access: CompanyManagementAccess; error?: string }>('/access')
  }

  // ============= VALIDATION HELPERS =============

  /**
   * Check if factory code is available
   */
  async checkFactoryCodeAvailable(code: string, excludeId?: string): Promise<{ available: boolean; error?: string }> {
    const params = new URLSearchParams({ code })
    if (excludeId) params.append('exclude_id', excludeId)
    
    return this.request<{ available: boolean; error?: string }>(`/factories/check-code?${params.toString()}`)
  }

  /**
   * Check if username is available
   */
  async checkUsernameAvailable(username: string, excludeId?: string): Promise<{ available: boolean; error?: string }> {
    const params = new URLSearchParams({ username })
    if (excludeId) params.append('exclude_id', excludeId)
    
    return this.request<{ available: boolean; error?: string }>(`/users/check-username?${params.toString()}`)
  }

  /**
   * Validate factory form data
   */
  validateFactoryForm(data: FactoryFormData): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {}

    if (!data.name?.trim()) {
      errors.name = 'Factory name is required'
    } else if (data.name.length < 2) {
      errors.name = 'Factory name must be at least 2 characters'
    } else if (data.name.length > 100) {
      errors.name = 'Factory name must not exceed 100 characters'
    }

    if (!data.code?.trim()) {
      errors.code = 'Factory code is required'
    } else if (!/^[A-Z0-9_-]{2,10}$/.test(data.code)) {
      errors.code = 'Factory code must be 2-10 characters, uppercase letters, numbers, underscore, or hyphen only'
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    }
  }

  /**
   * Validate user form data
   */
  validateUserForm(data: UserFormData | UserInviteFormData): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {}

    if (!data.username?.trim()) {
      errors.username = 'Username is required'
    } else if (!/^[a-zA-Z0-9_-]{2,50}$/.test(data.username)) {
      errors.username = 'Username must be 2-50 characters, letters, numbers, underscore, or hyphen only'
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Invalid email format'
    }

    if (!data.role) {
      errors.role = 'User role is required'
    }

    if (!data.factory_ids?.length) {
      errors.factory_ids = 'At least one factory assignment is required'
    }

    if ('password' in data && data.password !== undefined) {
      if (!data.password) {
        errors.password = 'Password is required for new users'
      } else if (data.password.length < 8) {
        errors.password = 'Password must be at least 8 characters'
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    }
  }
}

// Export singleton instance
export const companyService = new CompanyService()
export default companyService