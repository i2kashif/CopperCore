/**
 * Auth Service
 * Handles authentication, session management, and factory switching
 */

import { createSupabaseClient, createSupabaseServiceClient, AUTH_CONFIG } from './config.js'
import type { 
  LoginCredentials, 
  AuthResponse, 
  AuthSession, 
  User, 
  UserFactoryLink,
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
  private supabase = createSupabaseClient()
  private serviceClient = createSupabaseServiceClient()
  private eventEmitter = new SimpleEventEmitter() as AuthEventEmitter
  private currentSession: AuthSession | null = null

  /**
   * Convert username to email format for Supabase Auth
   */
  private usernameToEmail(username: string): string {
    return `${username}@${AUTH_CONFIG.EMAIL_DOMAIN}`
  }

  /**
   * Convert email back to username
   */
  private emailToUsername(email: string): string {
    return email.replace(`@${AUTH_CONFIG.EMAIL_DOMAIN}`, '')
  }

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
   * Converts username to username@coppercore.local format for Supabase
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

      const email = this.usernameToEmail(credentials.username)

      // Attempt login with Supabase
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password: credentials.password
      })

      if (error) {
        return {
          session: null,
          error: {
            message: this.mapAuthErrorMessage(error.message),
            name: error.name || 'AuthError',
            status: error.status || 400
          }
        }
      }

      if (!data.session || !data.user) {
        return {
          session: null,
          error: {
            message: 'Login failed - no session created',
            name: 'AuthError',
            status: 400
          }
        }
      }

      // Fetch user details from our users table by username
      const user = await this.getUserByUsername(credentials.username)
      if (!user) {
        return {
          session: null,
          error: {
            message: 'User account not found or inactive',
            name: 'AuthError',
            status: 404
          }
        }
      }

      if (!user.is_active) {
        return {
          session: null,
          error: {
            message: 'User account is disabled',
            name: 'AuthError',
            status: 403
          }
        }
      }

      // Create auth session
      const session: AuthSession = {
        user,
        supabaseSession: data.session,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at || 0
      }

      this.currentSession = session
      return { session, error: null }

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
      const { error } = await this.supabase.auth.signOut()
      this.currentSession = null
      return { error }
    } catch (err) {
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
      const { data, error } = await this.supabase.auth.refreshSession()

      if (error || !data.session) {
        this.currentSession = null
        return {
          session: null,
          error: error ? {
            message: error.message,
            name: error.name || 'AuthError',
            status: error.status || 401,
            code: error.code
          } : { 
            message: 'Session refresh failed', 
            name: 'AuthError', 
            status: 401 
          }
        }
      }

      if (this.currentSession) {
        this.currentSession.supabaseSession = data.session
        this.currentSession.accessToken = data.session.access_token
        this.currentSession.refreshToken = data.session.refresh_token
        this.currentSession.expiresAt = data.session.expires_at || 0
      }

      return { session: this.currentSession, error: null }

    } catch (err) {
      this.currentSession = null
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
    
    const now = Math.floor(Date.now() / 1000)
    const refreshThreshold = AUTH_CONFIG.REFRESH_THRESHOLD_MINUTES * 60
    
    return (this.currentSession.expiresAt - now) <= refreshThreshold
  }

  /**
   * Get user by username from our users table
   * Since auth_id column doesn't exist yet, we'll match by username
   */
  private async getUserByUsername(username: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single()

    if (error || !data) return null
    return data as User
  }

  /**
   * Get user's factory assignments
   */
  async getUserFactories(userId: string): Promise<Factory[]> {
    const { data, error } = await this.supabase
      .from('user_factory_assignments')
      .select(`
        factory_id,
        factories (
          id,
          name,
          code,
          is_active,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)

    if (error || !data) return []

    return data
      .map((link: any) => link.factories)
      .filter((factory: any) => factory && factory.is_active) as Factory[]
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

      // Verify user has access to the factory
      const userFactories = await this.getUserFactories(userId)
      const hasAccess = userFactories.some(f => f.id === factoryId)

      if (!hasAccess) {
        return { success: false, error: 'Access denied to factory' }
      }

      // For CEO and Director roles, allow access to any factory without explicit assignment
      const user = this.currentSession.user
      const hasGlobalAccess = user.role === 'CEO' || user.role === 'Director'

      if (!hasAccess && !hasGlobalAccess) {
        return { success: false, error: 'User does not have access to this factory' }
      }

      // Call the factory switch function (this updates user context server-side)
      const { data, error } = await this.supabase.rpc('switch_factory_context', {
        p_user_id: userId,
        p_factory_id: factoryId
      })

      if (error) {
        return { success: false, error: error.message }
      }

      // Emit factory switch event for realtime updates
      const switchEvent: FactorySwitchEvent = {
        type: 'factory_switch',
        userId,
        fromFactoryId: null, // Could track previous factory if needed
        toFactoryId: factoryId,
        username: user.username,
        timestamp: new Date().toISOString()
      }

      this.eventEmitter.emit('factory_switch', switchEvent)

      return { success: true }

    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Factory switch failed'
      }
    }
  }

  /**
   * Map Supabase auth errors to user-friendly messages
   */
  private mapAuthErrorMessage(errorMessage: string): string {
    const lowerMessage = errorMessage.toLowerCase()
    
    if (lowerMessage.includes('invalid login credentials')) {
      return 'Invalid username or password'
    }
    if (lowerMessage.includes('too many requests')) {
      return 'Too many login attempts. Please try again later.'
    }
    if (lowerMessage.includes('email not confirmed')) {
      return 'Account not activated. Please contact your administrator.'
    }
    if (lowerMessage.includes('user not found')) {
      return 'Invalid username or password'
    }
    
    return errorMessage
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