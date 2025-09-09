/**
 * React Query Auth Hooks
 * Provides authentication operations with caching and state management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import authService from '../modules/auth/service'
import { useAuthStore } from '../store/authStore'
import type { LoginCredentials, Factory, FactorySwitchEvent } from '../modules/auth/types'

// Query keys
const authKeys = {
  session: ['auth', 'session'] as const,
  factories: (userId: string) => ['auth', 'factories', userId] as const
}

/**
 * Hook for login mutation
 */
export function useLogin() {
  const { setSession, setLoading } = useAuthStore()
  
  return useMutation({
    mutationFn: (credentials: LoginCredentials) => {
      setLoading(true)
      return authService.login(credentials)
    },
    onSuccess: (response) => {
      setSession(response.session)
    },
    onError: () => {
      setSession(null)
    },
    onSettled: () => {
      setLoading(false)
    }
  })
}

/**
 * Hook for logout mutation
 */
export function useLogout() {
  const { logout } = useAuthStore()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      logout()
      queryClient.clear()
    }
  })
}

/**
 * Hook for fetching user factories
 */
export function useUserFactories(userId: string | undefined) {
  const { setAvailableFactories } = useAuthStore()
  
  const query = useQuery({
    queryKey: authKeys.factories(userId || ''),
    queryFn: () => authService.getUserFactories(),
    enabled: !!userId
  })
  
  // Update store when data changes
  if (query.data) {
    setAvailableFactories(query.data)
  }
  
  return query
}

/**
 * Hook for factory switching
 */
export function useFactorySwitch() {
  const { setCurrentFactory } = useAuthStore()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ userId, factoryId }: { userId: string; factoryId: string }) =>
      authService.switchFactory(userId, factoryId),
    onSuccess: (_, variables) => {
      // Find the factory from available factories and set as current
      const factories = queryClient.getQueryData(authKeys.factories(variables.userId)) as Factory[]
      const factory = factories?.find(f => f.id === variables.factoryId)
      if (factory) {
        setCurrentFactory(factory)
      }
      
      // Invalidate queries that depend on factory context
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const keys = query.queryKey as string[]
          return keys.includes('factory-scoped') || keys.includes('list')
        }
      })
    }
  })
}

/**
 * Hook for session refresh
 */
export function useSessionRefresh() {
  const { setSession } = useAuthStore()
  
  return useMutation({
    mutationFn: () => authService.refreshSession(),
    onSuccess: (response) => {
      setSession(response.session)
    },
    onError: () => {
      setSession(null)
    }
  })
}

/**
 * Hook to setup factory switch event listener
 */
export function useFactorySwitchListener() {
  const { setCurrentFactory } = useAuthStore()
  const queryClient = useQueryClient()
  
  useEffect(() => {
    const handleFactorySwitch = (event: FactorySwitchEvent) => {
      // Update current factory if it matches the switched factory
      if (event.toFactoryId) {
        // Fetch factory details and update current factory
        // This would typically come from cached data or be refetched
        queryClient.invalidateQueries({
          predicate: (query) => {
            const keys = query.queryKey as string[]
            return keys.includes('factory-scoped') || keys.includes('list')
          }
        })
      }
    }
    
    authService.onFactorySwitch(handleFactorySwitch)
    
    return () => {
      authService.offFactorySwitch(handleFactorySwitch)
    }
  }, [setCurrentFactory, queryClient])
}

/**
 * Hook for automatic session refresh
 */
export function useSessionAutoRefresh() {
  const session = useAuthStore(state => state.session)
  const refreshMutation = useSessionRefresh()
  
  useEffect(() => {
    if (!session) return
    
    const checkAndRefresh = () => {
      if (authService.sessionNeedsRefresh()) {
        refreshMutation.mutate()
      }
    }
    
    // Check every minute
    const interval = setInterval(checkAndRefresh, 60 * 1000)
    
    // Check immediately
    checkAndRefresh()
    
    return () => clearInterval(interval)
  }, [session, refreshMutation])
}

/**
 * Composite hook that sets up all auth-related side effects
 */
export function useAuthSetup() {
  useFactorySwitchListener()
  useSessionAutoRefresh()
}

/**
 * Hook to get current auth status
 */
export function useAuthStatus() {
  const session = useAuthStore(state => state.session)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const isLoading = useAuthStore(state => state.isLoading)
  const currentFactory = useAuthStore(state => state.currentFactory)
  const user = useAuthStore(state => state.user)
  const userRole = useAuthStore(state => state.userRole)
  const canAccessMultipleFactories = useAuthStore(state => state.canAccessMultipleFactories)
  const isGlobalUser = useAuthStore(state => state.isGlobalUser)
  
  return {
    session,
    isAuthenticated,
    isLoading,
    currentFactory,
    user,
    userRole,
    canAccessMultipleFactories,
    isGlobalUser,
    needsFactorySelection: isAuthenticated && !currentFactory
  }
}