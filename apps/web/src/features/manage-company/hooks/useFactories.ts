import { useState, useCallback, useEffect, useMemo } from 'react'
import { factoriesApi, ApiError } from '../../../services/api'
import { useRealtimeUpdates } from '../../../hooks/useRealtimeUpdates'
import { useToast } from '../../../hooks/useToast'
import type { Factory, FactoryFormData } from '../types'

// Mock factory data for development when backend is unavailable
const mockFactories: Factory[] = [
  {
    id: 'fac-001',
    name: 'Lahore Manufacturing',
    code: 'LHR-001',
    address: '123 Industrial Area, Lahore, Pakistan',
    city: 'Lahore',
    country: 'Pakistan',
    phone: '+92-42-1234567',
    email: 'lahore@coppercore.pk',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'fac-002', 
    name: 'Karachi Plant',
    code: 'KHI-001',
    address: '456 Export Zone, Karachi, Pakistan',
    city: 'Karachi',
    country: 'Pakistan', 
    phone: '+92-21-7654321',
    email: 'karachi@coppercore.pk',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'fac-003',
    name: 'Faisalabad Unit',
    code: 'FSD-001', 
    address: '789 Textile Hub, Faisalabad, Pakistan',
    city: 'Faisalabad',
    country: 'Pakistan',
    phone: '+92-41-9876543',
    email: 'faisalabad@coppercore.pk',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
]

export function useFactories() {
  const [factories, setFactories] = useState<Factory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const { showToast } = useToast()
  
  // BACK-16: Realtime updates for factories
  const realtimeCallbacks = useMemo(() => ({
    onFactoryChange: (event: any) => {
      console.log('🔄 Realtime factory change:', event)
      if (event.eventType === 'INSERT' || event.eventType === 'UPDATE' || event.eventType === 'DELETE') {
        refreshFactories()
      }
    }
  }), [])
  
  const { triggerRefresh } = useRealtimeUpdates(realtimeCallbacks)

  // Fetch factories on mount
  useEffect(() => {
    if (!initialized) {
      fetchFactories()
      setInitialized(true)
    }
  }, [initialized])

  const fetchFactories = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await factoriesApi.getFactories()
      setFactories(data)
      console.log('Successfully fetched factories:', data.length)
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to load factories. Using mock data.'
      setError(errorMessage)
      console.warn('Failed to fetch factories, falling back to mock data:', err)
      
      // BACK-14: Fallback to mock data to ensure factory dropdown works
      setFactories(mockFactories)
    } finally {
      setLoading(false)
    }
  }, [])

  const createFactory = useCallback(async (data: FactoryFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      const newFactory = await factoriesApi.createFactory(data)
      
      // Optimistic update - add to local state
      setFactories(prev => [...prev, newFactory])
      
      // Show success toast
      showToast({
        type: 'success',
        title: 'Factory created successfully',
        message: `${newFactory.name} has been added to the system.`
      })
      
      return newFactory
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to create factory'
      setError(errorMessage)
      
      // Show error toast
      showToast({
        type: 'error',
        title: 'Failed to create factory',
        message: errorMessage
      })
      
      console.error('Failed to create factory:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const updateFactory = useCallback(async (id: string, data: Partial<FactoryFormData>) => {
    setLoading(true)
    setError(null)
    
    try {
      // Get current version for optimistic locking
      const currentFactory = factories.find(f => f.id === id)
      const currentVersion = currentFactory ? 1 : undefined // TODO: Add version to Factory type
      
      const updatedFactory = await factoriesApi.updateFactory(id, data, currentVersion)
      
      // Optimistic update - update in local state
      setFactories(prev => prev.map(factory => 
        factory.id === id ? updatedFactory : factory
      ))
      
      // Show success toast
      showToast({
        type: 'success',
        title: 'Factory updated successfully',
        message: `${updatedFactory.name} has been updated.`
      })
      
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to update factory'
      setError(errorMessage)
      
      // Show error toast
      showToast({
        type: 'error',
        title: 'Failed to update factory',
        message: errorMessage
      })
      
      console.error('Failed to update factory:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [factories, showToast])

  const deleteFactory = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    
    try {
      await factoriesApi.deleteFactory(id)
      
      // Optimistic update - remove from local state
      setFactories(prev => prev.filter(factory => factory.id !== id))
      
      // Show success toast
      showToast({
        type: 'success',
        title: 'Factory deleted successfully',
        message: 'The factory has been removed from the system.'
      })
      
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'Failed to delete factory'
      setError(errorMessage)
      
      // Show error toast
      showToast({
        type: 'error',
        title: 'Failed to delete factory',
        message: errorMessage
      })
      
      console.error('Failed to delete factory:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [showToast])

  // Refresh factories data  
  const refreshFactories = useCallback(async () => {
    console.log('🔄 Refreshing factories data...')
    await fetchFactories()
  }, [fetchFactories])

  return {
    factories,
    loading,
    error,
    createFactory,
    updateFactory,
    deleteFactory,
    refreshFactories
  }
}