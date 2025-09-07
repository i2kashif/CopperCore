import React, { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import LoginForm from './LoginForm'
import FactorySelector from './FactorySelector'
import LoadingSpinner from './LoadingSpinner'

interface RouteGuardProps {
  children: ReactNode
  requireFactory?: boolean
  allowedRoles?: string[]
}

export default function RouteGuard({ 
  children, 
  requireFactory = true, 
  allowedRoles 
}: RouteGuardProps) {
  const { isAuthenticated, isLoading, user, currentFactory, isGlobalUser } = useAuth()

  // Show loading spinner while initializing auth
  if (isLoading) {
    return <LoadingSpinner />
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <LoginForm />
  }

  // Check role-based access
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Access Denied
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              You don&apos;t have permission to access this area.
              Required roles: {allowedRoles.join(', ')}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Your role: {user.role}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // For global users or when factory is not required, proceed
  if (!requireFactory || isGlobalUser()) {
    return <>{children}</>
  }

  // Factory selection required but not selected yet
  if (!currentFactory) {
    return <FactorySelector />
  }

  // All checks passed, render protected content
  return <>{children}</>
}

// Higher-order component for role-based access control
interface WithRoleGuardOptions {
  allowedRoles: string[]
  requireFactory?: boolean
}

export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: WithRoleGuardOptions
) {
  return function GuardedComponent(props: P) {
    return (
      <RouteGuard 
        allowedRoles={options.allowedRoles} 
        requireFactory={options.requireFactory}
      >
        <Component {...props} />
      </RouteGuard>
    )
  }
}