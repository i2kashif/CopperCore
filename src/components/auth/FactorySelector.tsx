/**
 * Factory Selector Component
 * Allows users to select their active factory context
 */

import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStatus, useUserFactories, useFactorySwitch } from '../../hooks/useAuth'
import type { Factory } from '../../modules/auth/types'

export function FactorySelector() {
  const location = useLocation()
  const { user, isAuthenticated, currentFactory, isGlobalUser } = useAuthStatus()
  const [selectedFactoryId, setSelectedFactoryId] = useState<string>('')
  
  const { data: factories = [], isLoading: loadingFactories } = useUserFactories(user?.id)
  const factorySwitchMutation = useFactorySwitch()

  // Redirect if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  // Redirect if already has factory selected
  if (currentFactory) {
    const from = (location.state as any)?.from?.pathname || '/dashboard'
    return <Navigate to={from} replace />
  }

  // Auto-select if user has only one factory
  useEffect(() => {
    if (factories.length === 1 && !isGlobalUser) {
      const factory = factories[0]
      setSelectedFactoryId(factory.id)
      handleFactorySelect(factory.id)
    }
  }, [factories, isGlobalUser])

  const handleFactorySelect = async (factoryId: string) => {
    if (!user?.id) return
    
    try {
      await factorySwitchMutation.mutateAsync({
        userId: user.id,
        factoryId
      })
      
      // Redirect to dashboard after successful selection
      const from = (location.state as any)?.from?.pathname || '/dashboard'
      window.location.href = from // Force redirect to ensure factory context is applied
    } catch (error) {
      console.error('Failed to select factory:', error)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedFactoryId) {
      handleFactorySelect(selectedFactoryId)
    }
  }

  if (loadingFactories) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading factories...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
        <div className="card-header text-center">
          <h1 className="text-2xl font-semibold text-gray-900">
            Select Factory
          </h1>
          <p className="text-gray-600 mt-2">
            Welcome, {user.username}
          </p>
          <div className={`badge badge-${user.role.toLowerCase()} mt-2`}>
            {user.role}
          </div>
        </div>
        
        <div className="card-body">
          {factories.length === 0 && !isGlobalUser ? (
            <div className="text-center">
              <div className="alert alert-warning mb-4">
                No factories assigned to your account.
              </div>
              <p className="text-sm text-gray-600">
                Please contact your administrator to assign factory access.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="factory" className="form-label">
                  Choose your active factory:
                </label>
                <select
                  id="factory"
                  value={selectedFactoryId}
                  onChange={(e) => setSelectedFactoryId(e.target.value)}
                  className="form-input"
                  required
                  data-testid="factory-select"
                >
                  <option value="">Select a factory...</option>
                  {isGlobalUser && (
                    <option value="all">All Factories</option>
                  )}
                  {factories.map((factory) => (
                    <option key={factory.id} value={factory.id}>
                      {factory.name} ({factory.code})
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                type="submit"
                disabled={!selectedFactoryId || factorySwitchMutation.isPending}
                className="btn-primary w-full flex items-center justify-center gap-2"
                data-testid="select-factory-button"
              >
                {factorySwitchMutation.isPending ? (
                  <>
                    <span className="loading-spinner"></span>
                    Selecting...
                  </>
                ) : (
                  'Continue to Dashboard'
                )}
              </button>
            </form>
          )}
        </div>
        
        <div className="card-footer">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">
              {factories.length} {factories.length === 1 ? 'factory' : 'factories'} available
            </span>
            <button
              type="button"
              onClick={() => window.location.href = '/login'}
              className="text-blue-600 hover:text-blue-800"
              data-testid="logout-link"
            >
              Switch User
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FactorySelector