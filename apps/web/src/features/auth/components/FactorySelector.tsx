import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Factory } from '../types/auth'

interface FactoryCardProps {
  factory: Factory
  onSelect: (factoryId: string) => void
  isSelecting: boolean
}

function FactoryCard({ factory, onSelect, isSelecting }: FactoryCardProps) {
  return (
    <button
      onClick={() => onSelect(factory.id)}
      disabled={isSelecting}
      className="group relative w-full p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg 
                className="w-6 h-6 text-blue-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" 
                />
              </svg>
            </div>
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {factory.name}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-sm text-gray-500 font-mono">
                {factory.code}
              </span>
              {factory.location && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="text-sm text-gray-500">
                    {factory.location}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {!factory.isActive && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Inactive
            </span>
          )}
          <svg 
            className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path 
              fillRule="evenodd" 
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
      </div>
    </button>
  )
}

interface ErrorDisplayProps {
  error: string
}

function ErrorDisplay({ error }: ErrorDisplayProps) {
  return (
    <div className="rounded-lg bg-red-50 border border-red-200 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg 
            className="h-5 w-5 text-red-400" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            Factory Selection Error
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{error}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function NoFactoryAccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
            <svg 
              className="h-8 w-8 text-red-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            No Factory Access
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            You don&apos;t have access to any factories.
          </p>
          <p className="text-xs text-gray-500">
            Please contact your administrator to assign factory access.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function FactorySelector() {
  const { factories, currentFactory, selectFactory, user, isGlobalUser } = useAuth()
  const [isSelecting, setIsSelecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Don't show selector if user only has one factory (auto-selected)
  if (factories.length <= 1) {
    return null
  }

  const handleFactorySelect = async (factoryId: string) => {
    setError(null)
    setIsSelecting(true)

    try {
      await selectFactory(factoryId)
    } catch (err: any) {
      setError(err.message || 'Failed to select factory')
    } finally {
      setIsSelecting(false)
    }
  }

  const availableFactories = isGlobalUser() ? factories : 
    factories.filter(f => user?.assignedFactories.includes(f.id))

  if (availableFactories.length === 0) {
    return <NoFactoryAccess />
  }

  if (currentFactory) {
    // Factory already selected, don't show selector
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg 
              className="h-8 w-8 text-blue-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" 
              />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Select Factory
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Choose a factory to continue to CopperCore ERP
          </p>
          <p className="text-xs text-gray-500">
            You have access to {availableFactories.length} factor{availableFactories.length === 1 ? 'y' : 'ies'}
            {isGlobalUser() && ' (Global Access)'}
          </p>
        </div>

        {error && (
          <div className="max-w-lg mx-auto">
            <ErrorDisplay error={error} />
          </div>
        )}

        <div className="max-w-lg mx-auto space-y-4">
          {availableFactories.map((factory) => (
            <FactoryCard
              key={factory.id}
              factory={factory}
              onSelect={handleFactorySelect}
              isSelecting={isSelecting}
            />
          ))}
        </div>
      </div>
    </div>
  )
}