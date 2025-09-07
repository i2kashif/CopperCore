/**
 * API services index
 * Central export point for all API services
 */

// Import API client for utility functions first
import { apiClient as _apiClient } from './client'

// Export API client and error handling
export { apiClient, ApiError } from './client'

// Export API services
export { factoriesApi, FactoriesApi } from './factories'
export { usersApi, UsersApi } from './users'

// Export types
export type * from './types'

// Re-export commonly used types
export type {
  ApiFactory,
  ApiUser,
  FactoryInput,
  UserInput,
  ApiResponse,
  ListQuery,
  FactoryStats,
  UserStats,
  AssignmentStats,
  ErrorCodes
} from './types'

/**
 * Initialize API client with session
 */
export function initializeApiClient(sessionId?: string) {
  if (sessionId) {
    _apiClient.setSessionId(sessionId)
  }
}

/**
 * Clear API client session
 */
export function clearApiSession() {
  _apiClient.clearSession()
}