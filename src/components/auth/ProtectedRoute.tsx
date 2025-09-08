/**
 * Protected Route Component
 * Handles authentication and factory selection requirements
 */

import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStatus } from '../../hooks/useAuth'
import type { UserRole } from '../../modules/auth/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: UserRole[]
  requireFactory?: boolean
}

export function ProtectedRoute({ 
  children, 
  requiredRoles, 
  requireFactory = true 
}: ProtectedRouteProps) {
  const location = useLocation()
  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    currentFactory, 
    needsFactorySelection 
  } = useAuthStatus()

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Redirect to factory selection if needed
  if (requireFactory && needsFactorySelection) {
    return <Navigate to="/select-factory" state={{ from: location }} replace />
  }

  // Check role requirements
  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card max-w-md w-full mx-4">
          <div className="card-body text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              You don't have permission to access this page.
            </p>
            <p className="text-sm text-gray-500">
              Required roles: {requiredRoles.join(', ')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default ProtectedRoute