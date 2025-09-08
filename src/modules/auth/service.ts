/**
 * Auth Service
 * Handles authentication, session management, and factory switching
 * Uses PostgreSQL backend instead of Supabase
 */

import { apiClient } from './apiClient.js'
import { AUTH_CONFIG } from './config.js'
import type { 
  LoginCredentials, 
  AuthResponse, 
  AuthSession, 
  User, 
  Factory,
  FactorySwitchEvent,
  AuthEventEmitter 
} from './types.js'

// Simple browser-compatible EventEmitter
class SimpleEventEmitter {
  private events: Record<string, Function[]> = {}
  
  on(event: string, listener: Function) {
    if (!this.events[event]) this.events[event] = []
    this.events[event].push(listener)
  }
  
  emit(event: string, ...args: any[]) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args))
    }
  }
  
  off(event: string, listener: Function) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(l => l !== listener)
    }
  }
}

class AuthService {
  private eventEmitter = new SimpleEventEmitter() as AuthEventEmitter
  private currentSession: AuthSession | null = null

  /**
   * Validate username format
   */
  private validateUsername(username: string): boolean {
    // Match the database constraint: alphanumeric, underscore, hyphen, 2-50 chars
    const usernameRegex = /^[a-zA-Z0-9_-]{2,50}$/
    return usernameRegex.test(username)
  }

  /**
   * Login with username and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Validate username format
      if (!this.validateUsername(credentials.username)) {
        return {
          session: null,
          error: {
            message: 'Invalid username format. Use only letters, numbers, underscore, and hyphen (2-50 characters)',
            name: 'ValidationError',
            status: 400
          }
        }
      }

      // Attempt login via API
      const response = await apiClient.login(credentials)

      if (response.error) {
        return response
      }

      if (response.session) {
        this.currentSession = response.session
        
        // Set auth token for future API requests
        apiClient.setAuthToken(response.session.accessToken)
      }

      return response

    } catch (err) {
      return {
        session: null,
        error: {
          message: err instanceof Error ? err.message : 'Login failed',
          name: 'AuthError',
          status: 500
        }
      }
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<{ error: any }> {
    try {
      const result = await apiClient.logout()
      
      // Clear local session regardless of API response
      this.currentSession = null
      apiClient.setAuthToken(null)
      
      return result
    } catch (err) {
      // Always clear local session on logout attempt
      this.currentSession = null
      apiClient.setAuthToken(null)
      
      return {
        error: {
          message: err instanceof Error ? err.message : 'Logout failed',
          name: 'AuthError',
          status: 500
        }
      }
    }
  }

  /**
   * Refresh current session token
   */
  async refreshSession(): Promise<AuthResponse> {
    try {
      if (!this.currentSession?.refreshToken) {
        this.currentSession = null
        apiClient.setAuthToken(null)
        return {
          session: null,
          error: { 
            message: 'No refresh token available', 
            name: 'AuthError', 
            status: 401 
          }
        }
      }

      const response = await apiClient.refreshToken(this.currentSession.refreshToken)

      if (response.error || !response.session) {
        this.currentSession = null
        apiClient.setAuthToken(null)
        return response
      }

      // Update current session
      this.currentSession = response.session
      apiClient.setAuthToken(response.session.accessToken)

      return response

    } catch (err) {
      this.currentSession = null
      apiClient.setAuthToken(null)
      return {
        session: null,
        error: {
          message: err instanceof Error ? err.message : 'Session refresh failed',
          name: 'AuthError',
          status: 500
        }
      }
    }
  }

  /**
   * Get current authenticated session
   */
  getCurrentSession(): AuthSession | null {
    return this.currentSession
  }

  /**
   * Check if session needs refresh (15 minutes before expiry)
   */
  sessionNeedsRefresh(): boolean {
    if (!this.currentSession) return false
    
    const now = Date.now()
    const refreshThreshold = AUTH_CONFIG.REFRESH_THRESHOLD_MINUTES * 60 * 1000
    
    return (this.currentSession.expiresAt - now) <= refreshThreshold
  }

  /**
   * Get user's factory assignments
   */
  async getUserFactories(): Promise<Factory[]> {
    if (!this.currentSession) {
      return []
    }

    try {
      const result = await apiClient.getUserFactories()
      return result.error ? [] : result.factories
    } catch (error) {
      console.error('Failed to get user factories:', error)
      return []
    }
  }

  /**
   * Switch user's active factory context
   * Emits factory_switch event for realtime updates
   */
  async switchFactory(userId: string, factoryId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.currentSession) {
        return { success: false, error: 'No active session' }
      }

      const result = await apiClient.switchFactory(factoryId)
      
      if (result.success) {
        // Emit factory switch event for realtime updates
        const switchEvent: FactorySwitchEvent = {
          type: 'factory_switch',
          userId,
          fromFactoryId: null, // Could track previous factory if needed
          toFactoryId: factoryId,
          username: this.currentSession.user.username,
          timestamp: new Date().toISOString()
        }

        this.eventEmitter.emit('factory_switch', switchEvent)
      }

      return result

    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Factory switch failed'
      }
    }
  }

  /**
   * Restore session from stored tokens
   */
  async restoreSession(accessToken: string, refreshToken: string, user: User, expiresAt: number): Promise<AuthResponse> {
    try {
      // Create session object
      const session: AuthSession = {
        user,
        accessToken,
        refreshToken,
        expiresAt
      }

      // Check if token is expired or needs refresh
      const now = Date.now()
      if (expiresAt <= now) {
        // Token is expired, try to refresh
        return this.refreshSessionWithToken(refreshToken)
      }

      // Set current session and API token
      this.currentSession = session
      apiClient.setAuthToken(accessToken)

      // Verify token is still valid by fetching user info
      const userResult = await apiClient.getCurrentUser()
      if (userResult.error) {
        // Token is invalid, try to refresh
        return this.refreshSessionWithToken(refreshToken)
      }

      return { session, error: null }

    } catch (err) {
      return {
        session: null,
        error: {
          message: err instanceof Error ? err.message : 'Session restore failed',
          name: 'AuthError',
          status: 500
        }
      }
    }
  }

  /**
   * Refresh session using a refresh token
   */
  private async refreshSessionWithToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const response = await apiClient.refreshToken(refreshToken)
      
      if (response.session) {
        this.currentSession = response.session
        apiClient.setAuthToken(response.session.accessToken)
      } else {
        this.currentSession = null
        apiClient.setAuthToken(null)
      }

      return response
    } catch (err) {
      this.currentSession = null
      apiClient.setAuthToken(null)
      return {
        session: null,
        error: {
          message: err instanceof Error ? err.message : 'Token refresh failed',
          name: 'AuthError',
          status: 500
        }
      }
    }
  }

  /**
   * Event emitter methods for factory switching
   */
  onFactorySwitch(listener: (data: FactorySwitchEvent) => void): void {
    this.eventEmitter.on('factory_switch', listener)
  }

  offFactorySwitch(listener: (data: FactorySwitchEvent) => void): void {
    this.eventEmitter.off('factory_switch', listener)
  }
}

// Export singleton instance
export const authService = new AuthService()
export default authService