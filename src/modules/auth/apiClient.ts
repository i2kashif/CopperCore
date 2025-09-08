/**
 * API Client for CopperCore ERP Backend
 * Replaces Supabase client with direct API calls to PostgreSQL backend
 */

import type { 
  LoginCredentials, 
  AuthResponse, 
  AuthSession,
  User,
  Factory 
} from './types.js'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * HTTP client for API requests
 */
class HttpClient {
  private baseURL: string
  private accessToken: string | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        ...(this.accessToken && {
          Authorization: `Bearer ${this.accessToken}`
        })
      }
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ApiError(
          errorData.message || `HTTP ${response.status}`,
          response.status,
          errorData.code
        )
      }

      return response.json()
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      
      // Network or parsing errors
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        0
      )
    }
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

/**
 * CopperCore API Client
 */
export class CopperCoreApiClient {
  private http: HttpClient

  constructor() {
    this.http = new HttpClient(API_BASE_URL)
  }

  /**
   * Set authentication token for API requests
   */
  setAuthToken(token: string | null): void {
    this.http.setAccessToken(token)
  }

  /**
   * Login with username and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await this.http.post<{
        session: AuthSession
        error: null
      }>('/api/auth/login', credentials)

      return {
        session: response.session,
        error: null
      }
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          session: null,
          error: {
            message: error.message,
            name: error.name,
            status: error.status,
            code: error.code,
            __isAuthError: true
          }
        }
      }

      return {
        session: null,
        error: {
          message: 'Login failed',
          name: 'NetworkError',
          status: 0,
          __isAuthError: true
        }
      }
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const response = await this.http.post<{
        session: AuthSession
        error: null
      }>('/api/auth/refresh', { refreshToken })

      return {
        session: response.session,
        error: null
      }
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          session: null,
          error: {
            message: error.message,
            name: error.name,
            status: error.status,
            code: error.code,
            __isAuthError: true
          }
        }
      }

      return {
        session: null,
        error: {
          message: 'Token refresh failed',
          name: 'NetworkError',
          status: 0,
          __isAuthError: true
        }
      }
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<{ error: any }> {
    try {
      await this.http.post('/api/auth/logout')
      return { error: null }
    } catch (error) {
      // Logout should succeed even if server request fails
      // since client-side token cleanup is the primary logout mechanism
      console.warn('Logout server request failed:', error)
      return { error: null }
    }
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<{ user: User | null; error: any }> {
    try {
      const response = await this.http.get<{ user: User }>('/api/auth/me')
      return { user: response.user, error: null }
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          user: null,
          error: {
            message: error.message,
            name: error.name,
            status: error.status,
            code: error.code
          }
        }
      }

      return {
        user: null,
        error: {
          message: 'Failed to get user info',
          name: 'NetworkError',
          status: 0
        }
      }
    }
  }

  /**
   * Get user's accessible factories
   */
  async getUserFactories(): Promise<{ factories: Factory[]; error: any }> {
    try {
      const response = await this.http.get<{ factories: Factory[] }>('/api/auth/factories')
      return { factories: response.factories, error: null }
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          factories: [],
          error: {
            message: error.message,
            name: error.name,
            status: error.status,
            code: error.code
          }
        }
      }

      return {
        factories: [],
        error: {
          message: 'Failed to get factories',
          name: 'NetworkError',
          status: 0
        }
      }
    }
  }

  /**
   * Switch user's active factory
   */
  async switchFactory(factoryId: string): Promise<{ 
    success: boolean 
    factory?: Factory
    error?: string 
  }> {
    try {
      const response = await this.http.post<{
        success: boolean
        factory: Factory
        message: string
      }>('/api/auth/switch-factory', { factoryId })

      return {
        success: response.success,
        factory: response.factory
      }
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: false,
        error: 'Factory switch failed'
      }
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.http.get<{ status: string; timestamp: string }>('/health')
  }
}

// Export singleton instance
export const apiClient = new CopperCoreApiClient()
export default apiClient