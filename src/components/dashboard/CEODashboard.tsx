/**
 * CEO Dashboard Component
 * Dashboard for CEO users with global access and system overview
 */

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStatus, useUserFactories } from '../../hooks/useAuth'
import { useCompanyStats } from '../../hooks/useCompany'
import DashboardLayout from './DashboardLayout'

export function CEODashboard() {
  const { user, currentFactory } = useAuthStatus()
  const { data: factories = [] } = useUserFactories(user?.id)
  const { data: companyStats } = useCompanyStats()
  const navigate = useNavigate()

  return (
    <DashboardLayout title="Executive Dashboard">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="card">
          <div className="card-body">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Welcome, {user?.full_name || user?.username}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {companyStats?.total_factories || factories.length}
                </div>
                <div className="text-sm text-blue-800">Total Factories</div>
                <div className="text-xs text-blue-600 mt-1">
                  {companyStats?.active_factories || 0} active
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {companyStats?.total_users || 0}
                </div>
                <div className="text-sm text-green-800">Total Users</div>
                <div className="text-xs text-green-600 mt-1">
                  {companyStats?.active_users || 0} active
                </div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">Global</div>
                <div className="text-sm text-orange-800">Access Level</div>
                <div className="text-xs text-orange-600 mt-1">All factories</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{user?.role}</div>
                <div className="text-sm text-purple-800">Executive Role</div>
                <div className="text-xs text-purple-600 mt-1">Full permissions</div>
              </div>
            </div>
          </div>
        </div>

        {/* Current Context */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Current Context</h3>
          </div>
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Active Factory:</p>
                <p className="text-gray-600">
                  {currentFactory ? `${currentFactory.name} (${currentFactory.code})` : 'All Factories'}
                </p>
              </div>
              {!currentFactory && (
                <div className="alert alert-info max-w-sm">
                  <p className="text-sm">
                    You're viewing data from all factories. Use the factory switcher to focus on a specific factory.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Factory Overview */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Factory Overview</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {factories.map((factory) => (
                <div
                  key={factory.id}
                  className={`p-4 border rounded-lg ${
                    currentFactory?.id === factory.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <h4 className="font-semibold text-gray-900">{factory.name}</h4>
                  <p className="text-sm text-gray-600 mb-2">Code: {factory.code}</p>
                  <div className="text-xs text-gray-500">
                    Status: {factory.active ? 'Active' : 'Inactive'}
                  </div>
                  {currentFactory?.id === factory.id && (
                    <div className="mt-2">
                      <span className="badge badge-ceo text-xs">Currently Selected</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Quick Actions</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => navigate('/reports')}
                className="btn-primary text-center p-4 h-auto flex-col"
                data-testid="system-reports-button"
              >
                <div className="text-lg mb-2">📊</div>
                <div className="font-medium">System Reports</div>
                <div className="text-sm opacity-75">View comprehensive reports</div>
              </button>
              <button
                onClick={() => navigate('/company/users')}
                className="btn-secondary text-center p-4 h-auto flex-col"
                data-testid="user-management-button"
              >
                <div className="text-lg mb-2">👥</div>
                <div className="font-medium">User Management</div>
                <div className="text-sm opacity-75">Manage system users</div>
              </button>
              <button
                onClick={() => navigate('/company/factories')}
                className="btn-secondary text-center p-4 h-auto flex-col"
                data-testid="factory-management-button"
              >
                <div className="text-lg mb-2">🏭</div>
                <div className="font-medium">Factory Management</div>
                <div className="text-sm opacity-75">Configure factories</div>
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="btn-secondary text-center p-4 h-auto flex-col"
                data-testid="system-settings-button"
              >
                <div className="text-lg mb-2">⚙️</div>
                <div className="font-medium">System Settings</div>
                <div className="text-sm opacity-75">ERP configuration</div>
              </button>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">System Status</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-green-600 text-2xl mb-2">●</div>
                <div className="font-medium">Database</div>
                <div className="text-sm text-gray-600">Connected</div>
              </div>
              <div className="text-center">
                <div className="text-green-600 text-2xl mb-2">●</div>
                <div className="font-medium">Authentication</div>
                <div className="text-sm text-gray-600">Active</div>
              </div>
              <div className="text-center">
                <div className="text-green-600 text-2xl mb-2">●</div>
                <div className="font-medium">Factory Data</div>
                <div className="text-sm text-gray-600">Synchronized</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default CEODashboard