import { useState, useCallback } from 'react'
import type { User, UserFormData } from '../types'

// Mock data for users
const mockUsers: User[] = [
  {
    id: 'u1',
    username: 'ceo',
    email: 'ceo@coppercore.pk',
    firstName: 'Ahmed',
    lastName: 'Khan',
    role: 'CEO',
    assignedFactories: [], // CEO has global access
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lastLoginAt: '2024-12-15T10:00:00Z'
  },
  {
    id: 'u2',
    username: 'director1',
    email: 'director@coppercore.pk',
    firstName: 'Sarah',
    lastName: 'Ali',
    role: 'Director',
    assignedFactories: [], // Director has global access
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lastLoginAt: '2024-12-14T09:00:00Z'
  },
  {
    id: 'u3',
    username: 'fm_karachi',
    email: 'fm.karachi@coppercore.pk',
    firstName: 'Hassan',
    lastName: 'Malik',
    role: 'Factory Manager',
    assignedFactories: ['f1'],
    isActive: true,
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-05T00:00:00Z',
    lastLoginAt: '2024-12-15T08:00:00Z'
  },
  {
    id: 'u4',
    username: 'fw_karachi1',
    email: 'worker1.karachi@coppercore.pk',
    firstName: 'Ali',
    lastName: 'Raza',
    role: 'Factory Worker',
    assignedFactories: ['f1'],
    isActive: true,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
    lastLoginAt: '2024-12-15T07:30:00Z'
  }
]

export function useUsers() {
  const [users, setUsers] = useState<User[]>(mockUsers)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createUser = useCallback(async (data: UserFormData) => {
    setLoading(true)
    setError(null)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const newUser: User = {
      ...data,
      id: `u${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    setUsers(prev => [...prev, newUser])
    setLoading(false)
    
    return newUser
  }, [])

  const updateUser = useCallback(async (id: string, data: Partial<UserFormData>) => {
    setLoading(true)
    setError(null)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    setUsers(prev => prev.map(user => 
      user.id === id 
        ? { ...user, ...data, updatedAt: new Date().toISOString() }
        : user
    ))
    
    setLoading(false)
  }, [])

  const deleteUser = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    setUsers(prev => prev.filter(user => user.id !== id))
    setLoading(false)
  }, [])

  const toggleUserStatus = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300))
    
    setUsers(prev => prev.map(user => 
      user.id === id 
        ? { ...user, isActive: !user.isActive, updatedAt: new Date().toISOString() }
        : user
    ))
    
    setLoading(false)
  }, [])

  return {
    users,
    loading,
    error,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus
  }
}