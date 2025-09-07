import { useState, useCallback, useEffect, useMemo } from 'react'
import { usersApi, ApiError } from '../../../services/api'
import { useCurrentUser } from '../../../hooks/useCurrentUser'
import { useRealtimeUpdates } from '../../../hooks/useRealtimeUpdates'
import { useToast } from '../../../hooks/useToast'
import type { User, UserFormData } from '../types'

export function useUsers() {
  const { currentUser } = useCurrentUser()
  const [apiUsers, setApiUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const { showToast } = useToast()
  
  // ... realtime setup moved after refreshUsers is defined

  // Combine API users with current user to ensure CEO is always visible
  // This is critical for BACK-13: CEO must always appear even when API fails
  const users = useMemo(() => {
    // Always ensure current user (CEO) is visible, regardless of API state
    const currentUserExists = apiUsers.some(user => user.id === currentUser.id)
    
    if (currentUserExists) {
      // Update the current user data if it exists in API, preserve fresh session data
      return apiUsers.map(user => 
        user.id === currentUser.id 
          ? { 
              ...user, 
              lastLoginAt: currentUser.lastLoginAt, // Keep fresh login time
              // Ensure global role display is preserved from session
              role: currentUser.role,
              assignedFactories: currentUser.role === 'CEO' || currentUser.role === 'Director' 
                ? [] // Global roles have no factory assignments
                : user.assignedFactories
            }
          : user
      )
    } else {
      // Add current user to the list if not present (for CEO visibility)
      // This ensures CEO is always visible even if API fails or returns empty
      return [currentUser, ...apiUsers]
    }
  }, [apiUsers, currentUser])

  // Fetch users on mount
  useEffect(() => {
    if (!initialized) {
      fetchUsers()
      setInitialized(true)
    }
  }, [initialized, fetchUsers])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await usersApi.getUsers()
      setApiUsers(data)
      console.log('Successfully fetched users:', data.length)
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to load users. Backend may be unavailable.'
      setError(errorMessage)
      console.warn('Failed to fetch users (CEO will still be visible):', err)
      // Don't throw - let component continue with current user visible
      setApiUsers([]) // Ensure we have a clean empty array for CEO-only display
    } finally {
      setLoading(false)
    }
  }, [])

  const createUser = useCallback(async (data: UserFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      const newUser = await usersApi.createUser(data)
      
      // Optimistic update - add to local state
      setApiUsers(prev => [...prev, newUser])
      
      // Show success toast
      showToast({
        type: 'success',
        title: 'User created successfully',
        message: `${newUser.firstName} ${newUser.lastName} has been added to the system.`
      })
      
      return newUser
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to create user'
      setError(errorMessage)
      
      // Show error toast
      showToast({
        type: 'error',
        title: 'Failed to create user',
        message: errorMessage
      })
      
      console.error('Failed to create user:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const updateUser = useCallback(async (id: string, data: Partial<UserFormData>) => {
    setLoading(true)
    setError(null)
    
    try {
      // Get current version for optimistic locking
      const currentUser = users.find(u => u.id === id)
      const currentVersion = currentUser ? 1 : undefined // TODO: Add version to User type
      
      const updatedUser = await usersApi.updateUser(id, data, currentVersion)
      
      // Optimistic update - update in local state
      setApiUsers(prev => prev.map(user => 
        user.id === id ? updatedUser : user
      ))
      
      // Show success toast
      showToast({
        type: 'success',
        title: 'User updated successfully',
        message: `${updatedUser.firstName} ${updatedUser.lastName} has been updated.`
      })
      
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to update user'
      setError(errorMessage)
      
      // Show error toast
      showToast({
        type: 'error',
        title: 'Failed to update user',
        message: errorMessage
      })
      
      console.error('Failed to update user:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [users, showToast])

  const deleteUser = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    
    try {
      await usersApi.deleteUser(id)
      
      // Optimistic update - remove from local state
      setApiUsers(prev => prev.filter(user => user.id !== id))
      
      // Show success toast
      showToast({
        type: 'success',
        title: 'User deleted successfully',
        message: 'The user has been removed from the system.'
      })
      
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to delete user'
      setError(errorMessage)
      
      // Show error toast
      showToast({
        type: 'error',
        title: 'Failed to delete user',
        message: errorMessage
      })
      
      console.error('Failed to delete user:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const toggleUserStatus = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    
    try {
      // Get current version for optimistic locking
      const currentUser = users.find(u => u.id === id)
      const currentVersion = currentUser ? 1 : undefined // TODO: Add version to User type
      
      const updatedUser = await usersApi.toggleUserStatus(id, currentVersion)
      
      // Optimistic update - update in local state
      setApiUsers(prev => prev.map(user => 
        user.id === id ? updatedUser : user
      ))
      
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to toggle user status'
      setError(errorMessage)
      console.error('Failed to toggle user status:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [users])

  // Update user factory assignments
  const updateUserFactoryAssignments = useCallback(async (userId: string, factoryIds: string[]) => {
    setLoading(true)
    setError(null)
    
    try {
      await usersApi.updateUserFactoryAssignments(userId, factoryIds)
      
      // Optimistic update - update user's assigned factories
      setApiUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, assignedFactories: factoryIds }
          : user
      ))
      
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to update user factory assignments'
      setError(errorMessage)
      console.error('Failed to update user factory assignments:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Refresh users data
  const refreshUsers = useCallback(async () => {
    console.log('🔄 Refreshing users data...')
    await fetchUsers()
  }, [fetchUsers])

  // BACK-16: Realtime updates via Supabase channels
  const realtimeCallbacks = useMemo(() => ({
    onUserChange: (event: { eventType: 'INSERT' | 'UPDATE' | 'DELETE' }) => {
      // eslint-disable-next-line no-console
      console.log('🔄 Realtime user change:', event)
      if (event.eventType === 'INSERT' || event.eventType === 'UPDATE' || event.eventType === 'DELETE') {
        refreshUsers()
      }
    },
    onFactoryChange: (_event: unknown) => {
      refreshUsers()
    },
    onUserFactoryAssignmentChange: (_event: unknown) => {
      refreshUsers()
    }
  }), [refreshUsers])

  useRealtimeUpdates(realtimeCallbacks)

  // Utility to determine what to show for factory assignments
  const getDisplayFactoryInfo = useCallback((user: User) => {
    if (user.role === 'CEO' || user.role === 'Director') {
      return { isGlobal: true, displayText: 'Global Access' }
    }
    return { isGlobal: false, displayText: user.assignedFactories }
  }, [])

  return {
    users,
    loading,
    error,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    updateUserFactoryAssignments,
    refreshUsers,
    getDisplayFactoryInfo
  }
}
