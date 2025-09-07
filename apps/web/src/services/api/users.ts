/**
 * Users API service
 * Handles all API calls related to user management and factory assignments
 */

import { apiClient, ApiError } from './client'
import type {
  ApiUser,
  ApiUserWithAssignments,
  UserInput,
  UserStats,
  ApiUserFactoryAssignment,
  UserFactoryAssignmentInput,
  BulkAssignmentInput,
  AssignmentStats,
  ApiResponse,
  ListQuery
} from './types'
import type { User, UserFormData } from '../../features/manage-company/types'

/**
 * Users API service class
 */
export class UsersApi {
  private readonly endpoint = '/api/users'
  private readonly assignmentsEndpoint = '/api/user-factory-assignments'

  /**
   * Get all users with optional filtering
   */
  async getUsers(query: ListQuery = {}): Promise<User[]> {
    try {
      const queryString = apiClient.buildListQuery(query)
      const response = await apiClient.get<ApiUser[]>(`${this.endpoint}${queryString}`)

      if (!response.success || !response.data) {
        throw new ApiError(
          response.error?.message || 'Failed to fetch users',
          response.error?.code || 'FETCH_ERROR',
          0
        )
      }

      // Map API users to frontend users
      const { mapApiUserToFrontend } = await import('./types')
      return response.data.map(user => mapApiUserToFrontend(user))
    } catch (error) {
      console.error('Failed to fetch users:', error)
      throw error instanceof ApiError ? error : new ApiError(
        'Unable to load users. Please try again.',
        'FETCH_ERROR',
        0
      )
    }
  }

  /**
   * Get a single user by ID with factory assignments
   */
  async getUser(id: string): Promise<User> {
    try {
      const response = await apiClient.get<ApiUserWithAssignments>(`${this.endpoint}/${id}`)

      if (!response.success || !response.data) {
        throw new ApiError(
          response.error?.message || 'User not found',
          response.error?.code || 'NOT_FOUND',
          404
        )
      }

      const { mapApiUserToFrontend } = await import('./types')
      return mapApiUserToFrontend(response.data, response.data.factory_assignments)
    } catch (error) {
      console.error(`Failed to fetch user ${id}:`, error)
      throw error instanceof ApiError ? error : new ApiError(
        'Unable to load user details. Please try again.',
        'FETCH_ERROR',
        0
      )
    }
  }

  /**
   * Get user's assigned factories
   */
  async getUserFactories(userId: string): Promise<string[]> {
    try {
      const response = await apiClient.get<ApiUserFactoryAssignment[]>(`${this.endpoint}/${userId}/factories`)

      if (!response.success || !response.data) {
        throw new ApiError(
          response.error?.message || 'Failed to fetch user factories',
          response.error?.code || 'FETCH_ERROR',
          0
        )
      }

      return response.data
        .filter(assignment => assignment.is_active)
        .map(assignment => assignment.factory_id)
    } catch (error) {
      console.error(`Failed to fetch factories for user ${userId}:`, error)
      throw error instanceof ApiError ? error : new ApiError(
        'Unable to load user factories. Please try again.',
        'FETCH_ERROR',
        0
      )
    }
  }

  /**
   * Create a new user
   */
  async createUser(userData: UserFormData): Promise<User> {
    try {
      const { mapFrontendUserToApi, mapApiUserToFrontend } = await import('./types')
      const apiInput = mapFrontendUserToApi(userData)
      
      const response = await apiClient.post<ApiUser>(this.endpoint, apiInput)

      if (!response.success || !response.data) {
        throw new ApiError(
          response.error?.message || 'Failed to create user',
          response.error?.code || 'CREATE_ERROR',
          0
        )
      }

      return mapApiUserToFrontend(response.data)
    } catch (error) {
      console.error('Failed to create user:', error)
      
      if (error instanceof ApiError) {
        // Handle specific error cases
        if (error.isValidationError()) {
          throw new ApiError(
            'Please check your input and try again.',
            'VALIDATION_ERROR',
            400,
            error.details
          )
        }
        if (error.isCode('DUPLICATE_ENTRY')) {
          throw new ApiError(
            'A user with this username or email already exists.',
            'DUPLICATE_ENTRY',
            409
          )
        }
        throw error
      }

      throw new ApiError(
        'Unable to create user. Please try again.',
        'CREATE_ERROR',
        0
      )
    }
  }

  /**
   * Update an existing user
   */
  async updateUser(id: string, userData: Partial<UserFormData>, currentVersion?: number): Promise<User> {
    try {
      const { mapFrontendUserToApi, mapApiUserToFrontend } = await import('./types')
      
      // Prepare update payload
      const updateData = mapFrontendUserToApi(userData as UserFormData)
      const payload = currentVersion ? { ...updateData, version: currentVersion } : updateData
      
      const response = await apiClient.put<ApiUser>(`${this.endpoint}/${id}`, payload)

      if (!response.success || !response.data) {
        throw new ApiError(
          response.error?.message || 'Failed to update user',
          response.error?.code || 'UPDATE_ERROR',
          0
        )
      }

      return mapApiUserToFrontend(response.data)
    } catch (error) {
      console.error(`Failed to update user ${id}:`, error)
      
      if (error instanceof ApiError) {
        // Handle specific error cases
        if (error.isOptimisticLockError()) {
          throw new ApiError(
            'This user was modified by someone else. Please refresh and try again.',
            'OPTIMISTIC_LOCK_ERROR',
            409
          )
        }
        if (error.isValidationError()) {
          throw new ApiError(
            'Please check your input and try again.',
            'VALIDATION_ERROR',
            400,
            error.details
          )
        }
        throw error
      }

      throw new ApiError(
        'Unable to update user. Please try again.',
        'UPDATE_ERROR',
        0
      )
    }
  }

  /**
   * Delete a user (soft delete)
   */
  async deleteUser(id: string): Promise<void> {
    try {
      const response = await apiClient.delete<{ success: boolean }>(`${this.endpoint}/${id}`)

      if (!response.success) {
        throw new ApiError(
          response.error?.message || 'Failed to delete user',
          response.error?.code || 'DELETE_ERROR',
          0
        )
      }
    } catch (error) {
      console.error(`Failed to delete user ${id}:`, error)
      
      if (error instanceof ApiError) {
        // Handle specific error cases
        if (error.isCode('FACTORY_SCOPE_VIOLATION')) {
          throw new ApiError(
            'You do not have permission to delete this user.',
            'FACTORY_SCOPE_VIOLATION',
            403
          )
        }
        throw error
      }

      throw new ApiError(
        'Unable to delete user. Please try again.',
        'DELETE_ERROR',
        0
      )
    }
  }

  /**
   * Toggle user status (active/inactive)
   */
  async toggleUserStatus(id: string, currentVersion?: number): Promise<User> {
    try {
      // First get current user to determine new status
      const currentUser = await this.getUser(id)
      
      return await this.updateUser(
        id, 
        { isActive: !currentUser.isActive },
        currentVersion
      )
    } catch (error) {
      console.error(`Failed to toggle user status ${id}:`, error)
      throw error instanceof ApiError ? error : new ApiError(
        'Unable to update user status. Please try again.',
        'UPDATE_ERROR',
        0
      )
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<UserStats> {
    try {
      const response = await apiClient.get<UserStats>(`${this.endpoint}/stats`)

      if (!response.success || !response.data) {
        throw new ApiError(
          response.error?.message || 'Failed to fetch user statistics',
          response.error?.code || 'FETCH_ERROR',
          0
        )
      }

      return response.data
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
      throw error instanceof ApiError ? error : new ApiError(
        'Unable to load user statistics. Please try again.',
        'FETCH_ERROR',
        0
      )
    }
  }

  // Factory Assignment Methods

  /**
   * Assign a user to a factory
   */
  async assignUserToFactory(userId: string, factoryId: string): Promise<void> {
    try {
      const assignmentData: UserFactoryAssignmentInput = { user_id: userId, factory_id: factoryId }
      const response = await apiClient.post<ApiUserFactoryAssignment>(
        this.assignmentsEndpoint,
        assignmentData
      )

      if (!response.success) {
        throw new ApiError(
          response.error?.message || 'Failed to assign user to factory',
          response.error?.code || 'ASSIGNMENT_ERROR',
          0
        )
      }
    } catch (error) {
      console.error(`Failed to assign user ${userId} to factory ${factoryId}:`, error)
      throw error instanceof ApiError ? error : new ApiError(
        'Unable to assign user to factory. Please try again.',
        'ASSIGNMENT_ERROR',
        0
      )
    }
  }

  /**
   * Remove user assignment from factory
   */
  async removeUserFromFactory(userId: string, factoryId: string): Promise<void> {
    try {
      // We need to find the assignment ID first
      const assignments = await this.getUserFactories(userId)
      // For now, we'll use a delete endpoint that accepts user_id and factory_id
      const response = await apiClient.delete<{ success: boolean }>(
        `${this.assignmentsEndpoint}?user_id=${userId}&factory_id=${factoryId}`
      )

      if (!response.success) {
        throw new ApiError(
          response.error?.message || 'Failed to remove user from factory',
          response.error?.code || 'REMOVAL_ERROR',
          0
        )
      }
    } catch (error) {
      console.error(`Failed to remove user ${userId} from factory ${factoryId}:`, error)
      throw error instanceof ApiError ? error : new ApiError(
        'Unable to remove user from factory. Please try again.',
        'REMOVAL_ERROR',
        0
      )
    }
  }

  /**
   * Bulk assign user to multiple factories
   */
  async bulkAssignUser(userId: string, factoryIds: string[]): Promise<void> {
    try {
      const bulkData: BulkAssignmentInput = { user_id: userId, factory_ids: factoryIds }
      const response = await apiClient.post<{ success: boolean }>(
        `${this.assignmentsEndpoint}/bulk`,
        bulkData
      )

      if (!response.success) {
        throw new ApiError(
          response.error?.message || 'Failed to assign user to factories',
          response.error?.code || 'BULK_ASSIGNMENT_ERROR',
          0
        )
      }
    } catch (error) {
      console.error(`Failed to bulk assign user ${userId} to factories:`, error)
      throw error instanceof ApiError ? error : new ApiError(
        'Unable to assign user to factories. Please try again.',
        'BULK_ASSIGNMENT_ERROR',
        0
      )
    }
  }

  /**
   * Update user factory assignments (replaces all assignments)
   */
  async updateUserFactoryAssignments(userId: string, factoryIds: string[]): Promise<void> {
    try {
      // Use bulk assignment which should replace existing assignments
      await this.bulkAssignUser(userId, factoryIds)
    } catch (error) {
      console.error(`Failed to update factory assignments for user ${userId}:`, error)
      throw error instanceof ApiError ? error : new ApiError(
        'Unable to update user factory assignments. Please try again.',
        'UPDATE_ASSIGNMENTS_ERROR',
        0
      )
    }
  }

  /**
   * Get assignment statistics
   */
  async getAssignmentStats(): Promise<AssignmentStats> {
    try {
      const response = await apiClient.get<AssignmentStats>(`${this.assignmentsEndpoint}/stats`)

      if (!response.success || !response.data) {
        throw new ApiError(
          response.error?.message || 'Failed to fetch assignment statistics',
          response.error?.code || 'FETCH_ERROR',
          0
        )
      }

      return response.data
    } catch (error) {
      console.error('Failed to fetch assignment stats:', error)
      throw error instanceof ApiError ? error : new ApiError(
        'Unable to load assignment statistics. Please try again.',
        'FETCH_ERROR',
        0
      )
    }
  }

  /**
   * Validate username uniqueness
   */
  async validateUsername(username: string, excludeId?: string): Promise<boolean> {
    try {
      const users = await this.getUsers({ search: username })
      
      // Check if any user has this exact username (excluding the current one being edited)
      const duplicates = users.filter(u => 
        u.username.toLowerCase() === username.toLowerCase() && u.id !== excludeId
      )
      
      return duplicates.length === 0
    } catch (error) {
      console.error('Failed to validate username:', error)
      // In case of error, assume it's not valid to be safe
      return false
    }
  }

  /**
   * Validate email uniqueness
   */
  async validateEmail(email: string, excludeId?: string): Promise<boolean> {
    try {
      const users = await this.getUsers({ search: email })
      
      // Check if any user has this exact email (excluding the current one being edited)
      const duplicates = users.filter(u => 
        u.email.toLowerCase() === email.toLowerCase() && u.id !== excludeId
      )
      
      return duplicates.length === 0
    } catch (error) {
      console.error('Failed to validate email:', error)
      // In case of error, assume it's not valid to be safe
      return false
    }
  }
}

/**
 * Singleton users API instance
 */
export const usersApi = new UsersApi()

/**
 * Export default instance
 */
export default usersApi