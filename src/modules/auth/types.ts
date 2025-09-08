/**
 * Auth Module Types
 * Defines types for authentication, authorization, and user management
 */

export type UserRole = 'CEO' | 'Director' | 'FM' | 'FW' | 'Office'

export interface User {
  id: string
  username: string
  email: string | null
  role: UserRole
  full_name: string | null
  active: boolean
  created_at?: string
  updated_at?: string
}

export interface UserFactoryLink {
  id: string
  user_id: string
  factory_id: string
  created_at: string
  updated_at: string
}

export interface Factory {
  id: string
  name: string
  code: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface AuthSession {
  user: User
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthError {
  message: string
  name: string
  status: number
  code?: string
  __isAuthError?: boolean
}

export interface AuthResponse {
  session: AuthSession | null
  error: AuthError | null
}

export interface FactorySwitchEvent {
  type: 'factory_switch'
  userId: string
  fromFactoryId: string | null
  toFactoryId: string
  username: string
  timestamp: string
}

export interface AuthJWTClaims {
  aud: string
  exp: number
  iat: number
  iss: string
  sub: string
  email?: string
  phone?: string
  app_metadata: {
    provider?: string
    providers?: string[]
  }
  user_metadata: {
    username: string
    role: UserRole
    user_id: string
  }
  role: string
  aal: string
  amr: Array<{ method: string; timestamp: number }>
  session_id: string
}

export interface AuthConfig {
  apiUrl: string
  jwtSecret?: string
}

export interface AuthEventEmitter {
  emit(event: 'factory_switch', data: FactorySwitchEvent): void
  on(event: 'factory_switch', listener: (data: FactorySwitchEvent) => void): void
  off(event: 'factory_switch', listener: (data: FactorySwitchEvent) => void): void
}