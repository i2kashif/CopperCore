/**
 * Zustand Auth Store
 * Manages authentication state and factory context
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthSession, User, Factory, UserRole } from '../modules/auth/types'

export interface AuthState {
  // Authentication state
  session: AuthSession | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Factory context
  currentFactory: Factory | null
  availableFactories: Factory[]
  
  // Actions
  setSession: (session: AuthSession | null) => void
  setLoading: (loading: boolean) => void
  setCurrentFactory: (factory: Factory | null) => void
  setAvailableFactories: (factories: Factory[]) => void
  logout: () => void
  
  // Computed getters
  user: User | null
  userRole: UserRole | null
  canAccessMultipleFactories: boolean
  isGlobalUser: boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      session: null,
      isAuthenticated: false,
      isLoading: false,
      currentFactory: null,
      availableFactories: [],

      // Actions
      setSession: (session: AuthSession | null) => {
        set({
          session,
          isAuthenticated: !!session,
          isLoading: false
        })
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      setCurrentFactory: (factory: Factory | null) => {
        set({ currentFactory: factory })
      },

      setAvailableFactories: (factories: Factory[]) => {
        set({ availableFactories: factories })
      },

      logout: () => {
        set({
          session: null,
          isAuthenticated: false,
          isLoading: false,
          currentFactory: null,
          availableFactories: []
        })
      },

      // Computed getters
      get user() {
        return get().session?.user || null
      },

      get userRole() {
        return get().session?.user?.role || null
      },

      get canAccessMultipleFactories() {
        const { availableFactories, userRole } = get()
        return availableFactories.length > 1 || userRole === 'CEO' || userRole === 'Director'
      },

      get isGlobalUser() {
        const { userRole } = get()
        return userRole === 'CEO' || userRole === 'Director'
      }
    }),
    {
      name: 'coppercore-auth',
      partialize: (state) => ({
        session: state.session,
        currentFactory: state.currentFactory,
        availableFactories: state.availableFactories
      })
    }
  )
)

// Selectors for common use cases
export const useUser = () => useAuthStore(state => state.user)
export const useIsAuthenticated = () => useAuthStore(state => state.isAuthenticated)
export const useCurrentFactory = () => useAuthStore(state => state.currentFactory)
export const useUserRole = () => useAuthStore(state => state.userRole)
export const useCanAccessMultipleFactories = () => useAuthStore(state => state.canAccessMultipleFactories)
export const useIsGlobalUser = () => useAuthStore(state => state.isGlobalUser)