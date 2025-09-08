/**
 * Factory Switcher Component
 * Allows users to switch between factories from the header
 */

import React, { useState, useRef, useEffect } from 'react'
import { useAuthStatus, useUserFactories, useFactorySwitch } from '../../hooks/useAuth'

export function FactorySwitcher() {
  const { user, currentFactory, canAccessMultipleFactories, isGlobalUser } = useAuthStatus()
  const { data: factories = [] } = useUserFactories(user?.id)
  const factorySwitchMutation = useFactorySwitch()
  
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Don't show if user can't access multiple factories
  if (!canAccessMultipleFactories || !user) {
    return null
  }

  const handleFactorySwitch = async (factoryId: string) => {
    try {
      await factorySwitchMutation.mutateAsync({
        userId: user.id,
        factoryId
      })
      setIsOpen(false)
      // Force page refresh to ensure all factory-scoped data is updated
      window.location.reload()
    } catch (error) {
      console.error('Failed to switch factory:', error)
    }
  }

  const currentFactoryName = currentFactory?.name || 'All Factories'

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        data-testid="factory-switcher-button"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="truncate max-w-40">
          {currentFactoryName}
        </span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-10">
          <div className="py-1">
            {isGlobalUser && (
              <button
                type="button"
                onClick={() => handleFactorySwitch('all')}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                  !currentFactory ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
                disabled={factorySwitchMutation.isPending}
                data-testid="factory-option-all"
              >
                <div className="flex items-center justify-between">
                  <span>All Factories</span>
                  {!currentFactory && (
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            )}
            
            {factories.length > 0 && (
              <div className="border-t border-gray-100">
                {factories.map((factory) => (
                  <button
                    key={factory.id}
                    type="button"
                    onClick={() => handleFactorySwitch(factory.id)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                      currentFactory?.id === factory.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                    disabled={factorySwitchMutation.isPending}
                    data-testid={`factory-option-${factory.code.toLowerCase()}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{factory.name}</div>
                        <div className="text-xs text-gray-500">{factory.code}</div>
                      </div>
                      {currentFactory?.id === factory.id && (
                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {factorySwitchMutation.isPending && (
              <div className="px-4 py-2 text-sm text-gray-500 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="loading-spinner"></span>
                  Switching factory...
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default FactorySwitcher