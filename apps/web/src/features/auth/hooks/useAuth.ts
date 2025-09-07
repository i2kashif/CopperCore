import { useContext } from 'react'
import { AuthContext } from '../providers/AuthProvider'
import { AuthState, User, Factory } from '../types/auth'

export interface UseAuthReturn extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  selectFactory: (factoryId: string) => Promise<void>
  refreshUser: () => Promise<void>
  hasPermission: (permission: keyof typeof import('../types/auth').ROLE_PERMISSIONS[keyof typeof import('../types/auth').ROLE_PERMISSIONS]) => boolean
  canAccessFactory: (factoryId: string) => boolean
  isGlobalUser: () => boolean
}

export function useAuth(): UseAuthReturn {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}

// Helper hooks for specific auth states
export function useUser(): User | null {
  const { user } = useAuth()
  return user
}

export function useCurrentFactory(): Factory | null {
  const { currentFactory } = useAuth()
  return currentFactory
}

export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth()
  return isAuthenticated
}

export function useUserRole(): string | null {
  const { user } = useAuth()
  return user?.role || null
}

export function useFactories(): Factory[] {
  const { factories } = useAuth()
  return factories
}

export function usePermissions() {
  const { hasPermission, canAccessFactory, isGlobalUser } = useAuth()
  
  return {
    hasPermission,
    canAccessFactory, 
    isGlobalUser,
  }
}