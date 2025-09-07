/* eslint-disable react-refresh/only-export-components */
import { createContext, useReducer, useEffect, ReactNode, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { User, Factory, AuthState, ROLE_PERMISSIONS } from '../types/auth'
import { UseAuthReturn } from '../hooks/useAuth'

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface AuthError {
  message: string
  code?: string
  details?: Record<string, unknown>
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_FACTORIES'; payload: Factory[] }
  | { type: 'SET_CURRENT_FACTORY'; payload: Factory | null }
  | { type: 'SET_ERROR'; payload: AuthError | null }
  | { type: 'RESET_STATE' }

const initialState: AuthState = {
  user: null,
  factories: [],
  currentFactory: null,
  isLoading: true,
  isAuthenticated: false,
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_USER':
      return { 
        ...state, 
        user: action.payload, 
        isAuthenticated: !!action.payload,
        isLoading: false 
      }
    case 'SET_FACTORIES':
      return { ...state, factories: action.payload }
    case 'SET_CURRENT_FACTORY':
      return { ...state, currentFactory: action.payload }
    case 'RESET_STATE':
      return { ...initialState, isLoading: false }
    default:
      return state
  }
}

export const AuthContext = createContext<UseAuthReturn | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

// Helper function to fetch user profile
async function fetchUserProfile(userId: string): Promise<{ user: User; factories: Factory[] }> {
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select(`
      id,
      email,
      username,
      first_name,
      last_name,
      role,
      is_active,
      created_at,
      updated_at,
      last_login_at,
      created_by,
      user_factory_assignments!inner(
        factory_id,
        factories(
          id,
          name,
          code,
          location,
          is_active,
          created_at
        )
      )
    `)
    .eq('id', userId)
    .single()

  if (profileError) {
    throw profileError
  }

  type RawAssignment = { factories: Factory }
  const factories = userProfile.user_factory_assignments.map(
    (assignment: RawAssignment) => assignment.factories
  )
  const assignedFactories = factories.map((f: Factory) => f.id)

  const user: User = {
    id: userProfile.id,
    email: userProfile.email,
    username: userProfile.username,
    firstName: userProfile.first_name,
    lastName: userProfile.last_name,
    role: userProfile.role,
    assignedFactories,
    currentFactoryId: null,
    isActive: userProfile.is_active,
    createdAt: userProfile.created_at,
    updatedAt: userProfile.updated_at,
    lastLoginAt: userProfile.last_login_at,
    createdBy: userProfile.created_by,
  }

  return { user, factories }
}

// eslint-disable-next-line max-lines-per-function
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Initialize auth state on mount
  const initializeAuth = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        await handleUserSession({ user: { id: session.user.id } })
      } else {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Auth initialization error:', error)
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  useEffect(() => {
    initializeAuth()
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await handleUserSession(session)
        } else if (event === 'SIGNED_OUT') {
          dispatch({ type: 'RESET_STATE' })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [initializeAuth])
  const handleUserSession = async (session: { user: { id: string } }) => {
    try {
      const { user, factories } = await fetchUserProfile(session.user.id)

      dispatch({ type: 'SET_USER', payload: user })
      dispatch({ type: 'SET_FACTORIES', payload: factories })

      // Auto-select factory for single-factory users
      if (factories.length === 1) {
        dispatch({ type: 'SET_CURRENT_FACTORY', payload: factories[0] })
      }

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('User session handling error:', error)
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const login = async (usernameOrEmail: string, password: string) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    
    // Mock CEO user for development
    if (usernameOrEmail === 'ceo' && password === 'admin123') {
      const mockUser: User = {
        id: 'mock-ceo-id',
        email: 'ceo@coppercore.com',
        username: 'ceo',
        firstName: 'Chief',
        lastName: 'Executive',
        role: 'CEO',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        assignedFactories: ['factory-1'],
        currentFactoryId: null, // CEO has global access
        createdBy: 'system',
      }
      
      const mockFactory: Factory = {
        id: 'factory-1',
        name: 'Main Factory',
        code: 'MF001',
        location: 'Industrial Zone',
        isActive: true,
        createdAt: new Date().toISOString(),
      }
      
      setTimeout(() => {
        dispatch({ type: 'SET_USER', payload: mockUser })
        dispatch({ type: 'SET_FACTORIES', payload: [mockFactory] })
        dispatch({ type: 'SET_CURRENT_FACTORY', payload: mockFactory })
      }, 500) // Simulate network delay
      
      return
    }
    
    try {
      // Try actual Supabase auth if not mock user
      const { error } = await supabase.auth.signInWithPassword({
        email: usernameOrEmail,
        password,
      })

      if (error) {
        throw error
      }

      // Session handling is done via the auth state change listener
    } catch (error: unknown) {
      dispatch({ type: 'SET_LOADING', payload: false })
      throw new AuthenticationError({
        message: error instanceof Error ? error.message : 'Login failed',
        code: 'AUTH_ERROR',
      })
    }
  }

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }
      // State reset is handled by auth state change listener
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Logout error:', error)
    }
  }

  const selectFactory = async (factoryId: string) => {
    if (!state.user || !state.user.assignedFactories.includes(factoryId)) {
      throw new Error('Access denied to selected factory')
    }

    const factory = state.factories.find(f => f.id === factoryId)
    if (!factory) {
      throw new Error('Factory not found')
    }

    dispatch({ type: 'SET_CURRENT_FACTORY', payload: factory })
    
    // Update user's current factory in database
    try {
      await supabase
        .from('users')
        .update({ current_factory_id: factoryId })
        .eq('id', state.user.id)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to update current factory:', error)
    }
  }

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await handleUserSession({ user: { id: session.user.id } })
    }
  }

  const hasPermission = (permission: keyof typeof ROLE_PERMISSIONS[keyof typeof ROLE_PERMISSIONS]) => {
    if (!state.user) return false
    return ROLE_PERMISSIONS[state.user.role][permission] || false
  }

  const canAccessFactory = (factoryId: string) => {
    if (!state.user) return false
    if (isGlobalUser()) return true
    return state.user.assignedFactories.includes(factoryId)
  }

  const isGlobalUser = () => {
    if (!state.user) return false
    return state.user.role === 'CEO' || state.user.role === 'Director'
  }

  const contextValue: UseAuthReturn = {
    ...state,
    login,
    logout,
    selectFactory,
    refreshUser,
    hasPermission,
    canAccessFactory,
    isGlobalUser,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// Helper class for auth errors
class AuthenticationError extends Error {
  code?: string
  details?: Record<string, unknown>

  constructor(options: { message: string; code?: string; details?: Record<string, unknown> }) {
    super(options.message)
    this.name = 'AuthenticationError'
    this.code = options.code
    this.details = options.details
  }
}
