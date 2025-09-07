import { createContext, useReducer, useEffect, ReactNode } from 'react'
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

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Initialize auth state on mount
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
  }, [])

  const initializeAuth = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        await handleUserSession(session)
      } else {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const handleUserSession = async (session: any) => {
    try {
      // Fetch user profile with factory assignments
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          role,
          created_at,
          last_login_at,
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
        .eq('id', session.user.id)
        .single()

      if (profileError) {
        throw profileError
      }

      const factories = userProfile.user_factory_assignments.map((assignment: any) => assignment.factories)
      const assignedFactories = factories.map((f: any) => f.id)

      const user: User = {
        id: userProfile.id,
        email: userProfile.email,
        role: userProfile.role,
        assignedFactories,
        currentFactoryId: null, // Will be set by factory selection
        createdAt: userProfile.created_at,
        lastLoginAt: userProfile.last_login_at,
      }

      dispatch({ type: 'SET_USER', payload: user })
      dispatch({ type: 'SET_FACTORIES', payload: factories })

      // Auto-select factory for single-factory users
      if (factories.length === 1) {
        dispatch({ type: 'SET_CURRENT_FACTORY', payload: factories[0] })
      }

    } catch (error) {
      console.error('User session handling error:', error)
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const login = async (email: string, password: string) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      // Session handling is done via the auth state change listener
    } catch (error: any) {
      dispatch({ type: 'SET_LOADING', payload: false })
      throw new AuthError({
        message: error.message || 'Login failed',
        code: error.error_description || 'AUTH_ERROR',
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
    } catch (error: any) {
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
      console.error('Failed to update current factory:', error)
    }
  }

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await handleUserSession(session)
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
class AuthError extends Error {
  code?: string
  details?: Record<string, unknown>

  constructor(options: { message: string; code?: string; details?: Record<string, unknown> }) {
    super(options.message)
    this.name = 'AuthError'
    this.code = options.code
    this.details = options.details
  }
}