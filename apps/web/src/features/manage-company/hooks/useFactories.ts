import { useState, useCallback } from 'react'
import type { Factory, FactoryFormData } from '../types'

// Mock data for factories
const mockFactories: Factory[] = [
  {
    id: 'f1',
    name: 'Karachi Main Factory',
    code: 'KHI-001',
    address: '123 Industrial Area, Phase 2',
    city: 'Karachi',
    country: 'Pakistan',
    phone: '+92-21-1234567',
    email: 'karachi@coppercore.pk',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'f2',
    name: 'Lahore Production Unit',
    code: 'LHR-002',
    address: '456 Raiwind Road Industrial Zone',
    city: 'Lahore',
    country: 'Pakistan',
    phone: '+92-42-7654321',
    email: 'lahore@coppercore.pk',
    isActive: true,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  }
]

export function useFactories() {
  const [factories, setFactories] = useState<Factory[]>(mockFactories)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createFactory = useCallback(async (data: FactoryFormData) => {
    setLoading(true)
    setError(null)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const newFactory: Factory = {
      ...data,
      id: `f${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    setFactories(prev => [...prev, newFactory])
    setLoading(false)
    
    return newFactory
  }, [])

  const updateFactory = useCallback(async (id: string, data: Partial<FactoryFormData>) => {
    setLoading(true)
    setError(null)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    setFactories(prev => prev.map(factory => 
      factory.id === id 
        ? { ...factory, ...data, updatedAt: new Date().toISOString() }
        : factory
    ))
    
    setLoading(false)
  }, [])

  const deleteFactory = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    setFactories(prev => prev.filter(factory => factory.id !== id))
    setLoading(false)
  }, [])

  return {
    factories,
    loading,
    error,
    createFactory,
    updateFactory,
    deleteFactory
  }
}