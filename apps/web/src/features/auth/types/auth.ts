export interface User {
  id: string
  email: string
  role: UserRole
  assignedFactories: string[]
  currentFactoryId: string | null
  createdAt: string
  lastLoginAt?: string
}

export type UserRole = 'CEO' | 'Director' | 'Factory Manager' | 'Factory Worker' | 'Office'

export interface Factory {
  id: string
  name: string
  code: string
  location?: string
  isActive: boolean
  createdAt: string
}

export interface AuthState {
  user: User | null
  factories: Factory[]
  currentFactory: Factory | null
  isLoading: boolean
  isAuthenticated: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthError {
  message: string
  code?: string
  details?: Record<string, unknown>
}

export interface SessionInfo {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: User
}

// Role-based permissions
export const ROLE_PERMISSIONS = {
  CEO: {
    global: true,
    canManageCompany: true,
    canManageUsers: true,
    canManageFactories: true,
    canViewAllData: true,
    canOverrideQC: true,
    canBackdate: true,
  },
  Director: {
    global: true,
    canManageCompany: false,
    canManageUsers: false,
    canManageFactories: false,
    canViewAllData: true,
    canOverrideQC: false,
    canBackdate: true,
  },
  'Factory Manager': {
    global: false,
    canManageCompany: false,
    canManageUsers: false,
    canManageFactories: false,
    canViewAllData: false,
    canOverrideQC: false,
    canBackdate: false,
  },
  'Factory Worker': {
    global: false,
    canManageCompany: false,
    canManageUsers: false,
    canManageFactories: false,
    canViewAllData: false,
    canOverrideQC: false,
    canBackdate: false,
  },
  Office: {
    global: false, // configurable
    canManageCompany: false,
    canManageUsers: false,
    canManageFactories: false,
    canViewAllData: false,
    canOverrideQC: false,
    canBackdate: false,
  },
} as const