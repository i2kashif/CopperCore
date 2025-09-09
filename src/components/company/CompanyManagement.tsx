/**
 * Company Management Component
 * Main layout for managing factories and users with tabbed navigation
 */

import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStatus } from '../../hooks/useAuth'
import { useCompanyStats, useCompanyManagementAccess } from '../../hooks/useCompany'
import DashboardLayout from '../dashboard/DashboardLayout'
import FactoriesManagement from './FactoriesManagement'
import UsersManagement from './UsersManagement'

type CompanyTab = 'factories' | 'users'

interface TabConfig {
  id: CompanyTab
  label: string
  icon: string
  description: string
  permission?: string
}

const TABS: TabConfig[] = [
  {
    id: 'factories',
    label: 'Factories',
    icon: '🏭',
    description: 'Manage factory locations and settings',
    permission: 'manage_factories'
  },
  {
    id: 'users',
    label: 'Users',
    icon: '👥',
    description: 'Manage user accounts and permissions',
    permission: 'manage_users'
  }
]

export function CompanyManagement() {
  const [activeTab, setActiveTab] = useState<CompanyTab>('factories')
  const { user } = useAuthStatus()
  const location = useLocation()
  const navigate = useNavigate()
  
  // Fetch company stats and user access permissions
  const { data: stats, isLoading: statsLoading } = useCompanyStats()
  const { data: access, isLoading: accessLoading } = useCompanyManagementAccess()

  // Filter tabs based on user permissions
  const availableTabs = TABS.filter(tab => {
    if (!tab.permission || !access) return true
    return access.permissions.includes(tab.permission as any)
  })

  // If no tabs available, show access denied
  if (!accessLoading && availableTabs.length === 0) {
    return (
      <DashboardLayout title="Company Management">
        <div className="max-w-md mx-auto">
          <div className="card">
            <div className="card-body text-center">
              <div className="text-red-500 text-4xl mb-4">🚫</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600">
                You don't have permission to access company management features.
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Set active tab based on URL path
  useEffect(() => {
    if (location.pathname.includes('/users')) {
      setActiveTab('users')
    } else if (location.pathname.includes('/factories')) {
      setActiveTab('factories')
    }
  }, [location.pathname])

  // Ensure active tab is available to user
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.find(tab => tab.id === activeTab)) {
      setActiveTab(availableTabs[0].id)
    }
  }, [availableTabs, activeTab])

  // Handle tab change with navigation
  const handleTabChange = (tabId: CompanyTab) => {
    setActiveTab(tabId)
    navigate(`/company/${tabId}`)
  }

  return (
    <DashboardLayout title="Company Management">
      <div className="space-y-6">
        {/* Header with stats */}
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Company Management</h1>
                <p className="text-gray-600 mt-1">
                  Manage your organization's factories, users, and settings
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Welcome back,</div>
                <div className="font-semibold text-gray-900">{user?.full_name || user?.username}</div>
              </div>
            </div>

            {/* Company Statistics */}
            {statsLoading ? (
              <div className="stats-grid animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="stat-card">
                    <div className="h-8 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : stats ? (
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value text-blue-600">{stats.total_factories}</div>
                  <div className="stat-label">Total Factories</div>
                  <div className="stat-change neutral text-xs mt-1">
                    {stats.active_factories} active
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-value text-green-600">{stats.total_users}</div>
                  <div className="stat-label">Total Users</div>
                  <div className="stat-change neutral text-xs mt-1">
                    {stats.active_users} active
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-value text-purple-600">{stats.users_by_role.CEO + stats.users_by_role.Director}</div>
                  <div className="stat-label">Executives</div>
                  <div className="stat-change neutral text-xs mt-1">
                    CEO & Directors
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-value text-orange-600">
                    {stats.users_by_role.FM + stats.users_by_role.FW + stats.users_by_role.Office}
                  </div>
                  <div className="stat-label">Staff</div>
                  <div className="stat-change neutral text-xs mt-1">
                    Factory & Office
                  </div>
                </div>
              </div>
            ) : (
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="text-center text-gray-500">
                    <div className="text-sm">Unable to load statistics</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white shadow rounded-lg">
          <div className="tabs">
            <div className="px-6">
              <div className="tab-list">
                {availableTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                    data-testid={`company-tab-${tab.id}`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="px-6 py-6">
            {/* Tab Description */}
            <div className="mb-6">
              <p className="text-gray-600">
                {availableTabs.find(tab => tab.id === activeTab)?.description}
              </p>
            </div>

            {/* Tab Panels */}
            {activeTab === 'factories' && (
              <div data-testid="factories-panel">
                <FactoriesManagement />
              </div>
            )}
            
            {activeTab === 'users' && (
              <div data-testid="users-panel">
                <UsersManagement />
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default CompanyManagement