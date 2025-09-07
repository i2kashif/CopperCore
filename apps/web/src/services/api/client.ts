/**
 * API client configuration for CopperCore ERP
 * Base configuration for all API calls to the backend
 */

import type { ApiResponse, ListQuery } from './types'

// API base URL - configured from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

/**
 * HTTP client class for API communication
 * Handles authentication, error handling, and response parsing
 */
export class ApiClient {
  private baseURL: string
  private sessionId?: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  /**
   * Set session ID for authenticated requests
   */
  setSessionId(sessionId: string) {
    this.sessionId = sessionId
  }

  /**
   * Clear session ID
   */
  clearSession() {
    this.sessionId = undefined
  }

  /**
   * Get default headers for requests
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (this.sessionId) {
      headers['Authorization'] = `Bearer ${this.sessionId}`
    }

    return headers
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
        credentials: 'include', // Include cookies for session management
      })

      // Handle non-JSON responses (like redirects or plain text errors)
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Unexpected response type: ${contentType}`)
      }

      const data: ApiResponse<T> = await response.json()

      // Handle HTTP errors
      if (!response.ok) {
        throw new ApiError(
          data.error?.message || `HTTP ${response.status}`,
          data.error?.code || 'HTTP_ERROR',
          response.status,
          data.error?.details
        )
      }

      return data
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ApiError(
          'Unable to connect to server. Please check your connection.',
          'NETWORK_ERROR',
          0
        )
      }
      
      throw new ApiError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        'UNKNOWN_ERROR',
        0
      )
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const url = new URL(endpoint, this.baseURL)
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    return this.request<T>(url.pathname + url.search)
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    })
  }

  /**
   * Build query string for list requests
   */
  buildListQuery(query: ListQuery): string {
    const params = new URLSearchParams()
    
    if (query.page !== undefined) params.append('page', String(query.page))
    if (query.limit !== undefined) params.append('limit', String(query.limit))
    if (query.search) params.append('search', query.search)
    if (query.sort_by) params.append('sort_by', query.sort_by)
    if (query.sort_order) params.append('sort_order', query.sort_order)
    if (query.factory_id) params.append('factory_id', query.factory_id)
    if (query.is_active !== undefined) params.append('is_active', String(query.is_active))

    const queryString = params.toString()
    return queryString ? `?${queryString}` : ''
  }
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }

  /**
   * Check if error is a specific type
   */
  isCode(code: string): boolean {
    return this.code === code
  }

  /**
   * Check if error is a validation error
   */
  isValidationError(): boolean {
    return this.code === 'VALIDATION_ERROR'
  }

  /**
   * Check if error is an authorization error
   */
  isAuthError(): boolean {
    return this.code === 'UNAUTHORIZED' || this.code === 'FORBIDDEN'
  }

  /**
   * Check if error is an optimistic lock error
   */
  isOptimisticLockError(): boolean {
    return this.code === 'OPTIMISTIC_LOCK_ERROR'
  }
}

/**
 * Singleton API client instance
 */
export const apiClient = new ApiClient()