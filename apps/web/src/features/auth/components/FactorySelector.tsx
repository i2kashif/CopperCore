import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              No Factory Access
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              You don't have access to any factories. Please contact your administrator.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (currentFactory) {
    // Factory already selected, show current selection
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Select Factory
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Choose a factory to continue
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Selection Error
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 space-y-4">
          {availableFactories.map((factory) => (
            <button
              key={factory.id}
              onClick={() => handleFactorySelect(factory.id)}
              disabled={isSelecting}
              className="group relative w-full flex items-center justify-between py-3 px-4 border border-gray-300 rounded-lg text-left hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900">
                  {factory.name}
                </span>
                <span className="text-xs text-gray-500">
                  {factory.code}
                  {factory.location && ` • ${factory.location}`}
                </span>
              </div>
              
              <div className="flex items-center">
                {!factory.isActive && (
                  <span className="mr-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Inactive
                  </span>
                )}
                <svg className="h-5 w-5 text-gray-400 group-hover:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            You have access to {availableFactories.length} factor{availableFactories.length === 1 ? 'y' : 'ies'}
            {isGlobalUser() && ' (Global Access)'}
          </p>
        </div>
      </div>
    </div>
  )
}