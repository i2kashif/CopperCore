/**
 * React Query Hooks for Company Management
 * Provides data fetching, caching, and mutations for factory and user management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { companyService } from '../modules/company/service'
import type {
  ManagedFactory,
  ManagedUser,
  FactoryFormData,
  UserFormData,
  UserInviteFormData,
  FactoryFilters,
  UserFilters,
  BulkFactoryOperation,
  BulkUserOperation,
  CompanyStatsResponse,
  CompanyManagementAccess
} from '../modules/company/types'

// =============== QUERY KEYS ===============

export const companyKeys = {
  all: ['company'] as const,
  
  factories: () => [...companyKeys.all, 'factories'] as const,
  factoriesList: (filters?: FactoryFilters) => [...companyKeys.factories(), 'list', filters] as const,
  factory: (id: string) => [...companyKeys.factories(), 'detail', id] as const,
  factoryStats: (id: string) => [...companyKeys.factories(), 'stats', id] as const,
  
  users: () => [...companyKeys.all, 'users'] as const,
  usersList: (filters?: UserFilters) => [...companyKeys.users(), 'list', filters] as const,
  user: (id: string) => [...companyKeys.users(), 'detail', id] as const,
  userFactories: (id: string) => [...companyKeys.users(), 'factories', id] as const,
  
  stats: () => [...companyKeys.all, 'stats'] as const,
  access: () => [...companyKeys.all, 'access'] as const,
  
  validation: {
    factoryCode: (code: string, excludeId?: string) => [...companyKeys.all, 'validation', 'factory-code', code, excludeId] as const,
    username: (username: string, excludeId?: string) => [...companyKeys.all, 'validation', 'username', username, excludeId] as const,
  }
}

// =============== FACTORIES HOOKS ===============

/**
 * Hook to fetch factories list with optional filtering
 */
export function useFactories(filters?: FactoryFilters, enabled = true) {
  return useQuery({
    queryKey: companyKeys.factoriesList(filters),
    queryFn: () => companyService.getFactories(filters),
    enabled,
    staleTime: 30000, // 30 seconds
    select: (data) => data.factories || []
  })
}

/**
 * Hook to fetch a single factory by ID
 */
export function useFactory(factoryId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: companyKeys.factory(factoryId || ''),
    queryFn: () => companyService.getFactory(factoryId!),
    enabled: enabled && !!factoryId,
    select: (data) => data.factory
  })
}

/**
 * Hook to fetch factory statistics
 */
export function useFactoryStats(factoryId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: companyKeys.factoryStats(factoryId || ''),
    queryFn: () => companyService.getFactoryStats(factoryId!),
    enabled: enabled && !!factoryId,
    staleTime: 60000, // 1 minute
  })
}

/**
 * Hook to create a new factory
 */
export function useCreateFactory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: FactoryFormData) => companyService.createFactory(data),
    onSuccess: () => {
      // Invalidate factories lists
      queryClient.invalidateQueries({ queryKey: companyKeys.factories() })
      // Invalidate company stats
      queryClient.invalidateQueries({ queryKey: companyKeys.stats() })
    }
  })
}

/**
 * Hook to update an existing factory
 */
export function useUpdateFactory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ factoryId, data }: { factoryId: string; data: Partial<FactoryFormData> }) =>
      companyService.updateFactory(factoryId, data),
    onSuccess: (result, variables) => {
      // Update the factory in cache
      queryClient.setQueryData(companyKeys.factory(variables.factoryId), result)
      // Invalidate factories lists
      queryClient.invalidateQueries({ queryKey: companyKeys.factories() })
      // Invalidate related stats
      queryClient.invalidateQueries({ queryKey: companyKeys.factoryStats(variables.factoryId) })
      queryClient.invalidateQueries({ queryKey: companyKeys.stats() })
    }
  })
}

/**
 * Hook to delete a factory
 */
export function useDeleteFactory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (factoryId: string) => companyService.deleteFactory(factoryId),
    onSuccess: (_, factoryId) => {
      // Remove the factory from cache
      queryClient.removeQueries({ queryKey: companyKeys.factory(factoryId) })
      // Invalidate factories lists
      queryClient.invalidateQueries({ queryKey: companyKeys.factories() })
      // Invalidate company stats
      queryClient.invalidateQueries({ queryKey: companyKeys.stats() })
    }
  })
}

/**
 * Hook for bulk factory operations
 */
export function useBulkFactoryOperation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (operation: BulkFactoryOperation) => companyService.bulkFactoryOperation(operation),
    onSuccess: () => {
      // Invalidate all factory-related queries
      queryClient.invalidateQueries({ queryKey: companyKeys.factories() })
      queryClient.invalidateQueries({ queryKey: companyKeys.stats() })
    }
  })
}

// =============== USERS HOOKS ===============

/**
 * Hook to fetch users list with optional filtering
 */
export function useUsers(filters?: UserFilters, enabled = true) {
  return useQuery({
    queryKey: companyKeys.usersList(filters),
    queryFn: () => companyService.getUsers(filters),
    enabled,
    staleTime: 30000, // 30 seconds
    select: (data) => data.users || []
  })
}

/**
 * Hook to fetch a single user by ID
 */
export function useUser(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: companyKeys.user(userId || ''),
    queryFn: () => companyService.getUser(userId!),
    enabled: enabled && !!userId,
    select: (data) => data.user
  })
}

/**
 * Hook to fetch user's factory assignments
 */
export function useUserFactoryAssignments(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: companyKeys.userFactories(userId || ''),
    queryFn: () => companyService.getUserFactoryAssignments(userId!),
    enabled: enabled && !!userId,
    select: (data) => data.factories || []
  })
}

/**
 * Hook to create a new user
 */
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UserFormData) => companyService.createUser(data),
    onSuccess: () => {
      // Invalidate users lists
      queryClient.invalidateQueries({ queryKey: companyKeys.users() })
      // Invalidate company stats
      queryClient.invalidateQueries({ queryKey: companyKeys.stats() })
    }
  })
}

/**
 * Hook to invite a new user
 */
export function useInviteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UserInviteFormData) => companyService.inviteUser(data),
    onSuccess: () => {
      // Invalidate users lists
      queryClient.invalidateQueries({ queryKey: companyKeys.users() })
    }
  })
}

/**
 * Hook to update an existing user
 */
export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: Partial<UserFormData> }) =>
      companyService.updateUser(userId, data),
    onSuccess: (result, variables) => {
      // Update the user in cache
      queryClient.setQueryData(companyKeys.user(variables.userId), result)
      // Invalidate users lists
      queryClient.invalidateQueries({ queryKey: companyKeys.users() })
      // Invalidate user's factory assignments
      queryClient.invalidateQueries({ queryKey: companyKeys.userFactories(variables.userId) })
      // Invalidate company stats
      queryClient.invalidateQueries({ queryKey: companyKeys.stats() })
    }
  })
}

/**
 * Hook to delete a user
 */
export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => companyService.deleteUser(userId),
    onSuccess: (_, userId) => {
      // Remove the user from cache
      queryClient.removeQueries({ queryKey: companyKeys.user(userId) })
      // Invalidate users lists
      queryClient.invalidateQueries({ queryKey: companyKeys.users() })
      // Invalidate company stats
      queryClient.invalidateQueries({ queryKey: companyKeys.stats() })
    }
  })
}

/**
 * Hook for bulk user operations
 */
export function useBulkUserOperation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (operation: BulkUserOperation) => companyService.bulkUserOperation(operation),
    onSuccess: () => {
      // Invalidate all user-related queries
      queryClient.invalidateQueries({ queryKey: companyKeys.users() })
      queryClient.invalidateQueries({ queryKey: companyKeys.stats() })
    }
  })
}

// =============== USER-FACTORY ASSIGNMENT HOOKS ===============

/**
 * Hook to assign a user to a factory
 */
export function useAssignUserToFactory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, factoryId }: { userId: string; factoryId: string }) =>
      companyService.assignUserToFactory(userId, factoryId),
    onSuccess: (_, variables) => {
      // Invalidate user's factory assignments
      queryClient.invalidateQueries({ queryKey: companyKeys.userFactories(variables.userId) })
      // Invalidate user details
      queryClient.invalidateQueries({ queryKey: companyKeys.user(variables.userId) })
      // Invalidate users lists
      queryClient.invalidateQueries({ queryKey: companyKeys.users() })
      // Invalidate factory stats
      queryClient.invalidateQueries({ queryKey: companyKeys.factoryStats(variables.factoryId) })
    }
  })
}

/**
 * Hook to unassign a user from a factory
 */
export function useUnassignUserFromFactory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, factoryId }: { userId: string; factoryId: string }) =>
      companyService.unassignUserFromFactory(userId, factoryId),
    onSuccess: (_, variables) => {
      // Invalidate user's factory assignments
      queryClient.invalidateQueries({ queryKey: companyKeys.userFactories(variables.userId) })
      // Invalidate user details
      queryClient.invalidateQueries({ queryKey: companyKeys.user(variables.userId) })
      // Invalidate users lists
      queryClient.invalidateQueries({ queryKey: companyKeys.users() })
      // Invalidate factory stats
      queryClient.invalidateQueries({ queryKey: companyKeys.factoryStats(variables.factoryId) })
    }
  })
}

/**
 * Hook to update user's factory assignments
 */
export function useUpdateUserFactoryAssignments() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, factoryIds }: { userId: string; factoryIds: string[] }) =>
      companyService.updateUserFactoryAssignments(userId, factoryIds),
    onSuccess: (_, variables) => {
      // Invalidate user's factory assignments
      queryClient.invalidateQueries({ queryKey: companyKeys.userFactories(variables.userId) })
      // Invalidate user details
      queryClient.invalidateQueries({ queryKey: companyKeys.user(variables.userId) })
      // Invalidate users lists
      queryClient.invalidateQueries({ queryKey: companyKeys.users() })
      // Invalidate all factory stats
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const keys = query.queryKey as string[]
          return keys.includes('factories') && keys.includes('stats')
        }
      })
    }
  })
}

// =============== STATS AND ACCESS HOOKS ===============

/**
 * Hook to fetch company statistics
 */
export function useCompanyStats(enabled = true) {
  return useQuery({
    queryKey: companyKeys.stats(),
    queryFn: () => companyService.getCompanyStats(),
    enabled,
    staleTime: 60000, // 1 minute
  })
}

/**
 * Hook to fetch user's company management access permissions
 */
export function useCompanyManagementAccess(enabled = true) {
  return useQuery({
    queryKey: companyKeys.access(),
    queryFn: () => companyService.getManagementAccess(),
    enabled,
    staleTime: 300000, // 5 minutes
    select: (data) => data.access
  })
}

// =============== VALIDATION HOOKS ===============

/**
 * Hook to check if factory code is available
 */
export function useFactoryCodeAvailability(code: string, excludeId?: string, enabled = true) {
  return useQuery({
    queryKey: companyKeys.validation.factoryCode(code, excludeId),
    queryFn: () => companyService.checkFactoryCodeAvailable(code, excludeId),
    enabled: enabled && !!code && code.length >= 2,
    staleTime: 10000, // 10 seconds
    select: (data) => data.available
  })
}

/**
 * Hook to check if username is available
 */
export function useUsernameAvailability(username: string, excludeId?: string, enabled = true) {
  return useQuery({
    queryKey: companyKeys.validation.username(username, excludeId),
    queryFn: () => companyService.checkUsernameAvailable(username, excludeId),
    enabled: enabled && !!username && username.length >= 2,
    staleTime: 10000, // 10 seconds
    select: (data) => data.available
  })
}