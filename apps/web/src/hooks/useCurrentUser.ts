/**
 * Current user hook
 * Provides the currently logged in user context
 * TODO: Replace with real authentication context
 */

import { useState } from 'react'
import type { User } from '../features/manage-company/types'

// Mock current user data (CEO who logged in)
const mockCurrentUser: User = {
  id: 'current-ceo',
  username: 'ceo',
  email: 'ceo@coppercore.pk',
  firstName: 'Ahmed',
  lastName: 'Khan',
  role: 'CEO',
  assignedFactories: [], // CEO has global access
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  lastLoginAt: new Date().toISOString() // Recent login
}

export function useCurrentUser() {
  const [currentUser] = useState<User>(mockCurrentUser)

  const isGlobalRole = () => {
    return currentUser.role === 'CEO' || currentUser.role === 'Director'
  }

  const hasFactoryAccess = (factoryId: string) => {
    if (isGlobalRole()) return true
    return currentUser.assignedFactories.includes(factoryId)
  }

  const canManageUsers = () => {
    return currentUser.role === 'CEO' || currentUser.role === 'Director'
  }

  const canManageFactories = () => {
    return currentUser.role === 'CEO' || currentUser.role === 'Director'
  }

  return {
    currentUser,
    isGlobalRole,
    hasFactoryAccess,
    canManageUsers,
    canManageFactories
  }
}