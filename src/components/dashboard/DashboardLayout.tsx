/**
 * Dashboard Layout Component
 * Provides the common layout structure for all dashboards
 */

import React from 'react'
import { useAuthStatus, useLogout } from '../../hooks/useAuth'
import FactorySwitcher from '../common/FactorySwitcher'

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, currentFactory } = useAuthStatus()
  const logoutMutation = useLogout()

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync()
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout failed:', error)
      // Force redirect even if logout fails
      window.location.href = '/login'
    }
  }

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'CEO': return 'badge-ceo'
      case 'Director': return 'badge-director'
      case 'FM': return 'badge-fm'
      case 'FW': return 'badge-fw'
      case 'Office': return 'badge-office'
      default: return 'badge-office'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Brand and current context */}
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900">
                CopperCore ERP
              </h1>
              {title && (
                <>
                  <div className="w-px h-6 bg-gray-300"></div>
                  <span className="text-gray-600">{title}</span>
                </>
              )}
            </div>

            {/* Right side - User info and controls */}
            <div className="flex items-center gap-4">
              {/* Factory Switcher */}
              <FactorySwitcher />
              
              {/* User info */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-medium text-gray-900" data-testid="user-display">
                    {user?.username}
                  </div>
                  <div className="text-sm text-gray-500">
                    {currentFactory?.name || 'All Factories'}
                  </div>
                </div>
                
                <div className={`badge ${getRoleBadgeClass(user?.role || '')}`}>
                  {user?.role}
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                  className="btn-secondary text-sm py-2 px-3"
                  data-testid="logout-button"
                  title="Logout"
                >
                  {logoutMutation.isPending ? (
                    <span className="loading-spinner"></span>
                  ) : (
                    'Logout'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}

export default DashboardLayout