/**
 * Factory Dashboard Component
 * Dashboard for Factory Managers and Workers with factory-specific views
 */

import { useAuthStatus } from '../../hooks/useAuth'
import DashboardLayout from './DashboardLayout'

interface FactoryDashboardProps {
  variant: 'manager' | 'worker' | 'office'
}

export function FactoryDashboard({ variant }: FactoryDashboardProps) {
  const { user, currentFactory } = useAuthStatus()

  const getDashboardTitle = () => {
    switch (variant) {
      case 'manager': return 'Factory Management'
      case 'worker': return 'Factory Operations'
      case 'office': return 'Office Dashboard'
      default: return 'Factory Dashboard'
    }
  }

  const getWelcomeMessage = () => {
    switch (variant) {
      case 'manager': return 'Factory Manager Dashboard'
      case 'worker': return 'Factory Worker Dashboard'
      case 'office': return 'Office Worker Dashboard'
      default: return 'Dashboard'
    }
  }

  const getQuickActions = () => {
    const baseActions = [
      { icon: '📦', title: 'Inventory', desc: 'View factory inventory', role: ['manager', 'worker', 'office'] },
      { icon: '📋', title: 'Work Orders', desc: 'Manage work orders', role: ['manager', 'worker'] },
      { icon: '📊', title: 'Reports', desc: 'Factory reports', role: ['manager', 'office'] },
      { icon: '⚙️', title: 'Settings', desc: 'Factory settings', role: ['manager'] }
    ]
    
    return baseActions.filter(action => action.role.includes(variant))
  }

  return (
    <DashboardLayout title={getDashboardTitle()}>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="card">
          <div className="card-body">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {getWelcomeMessage()}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {user?.username}
                </div>
                <div className="text-sm text-blue-800">Current User</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {currentFactory?.code || 'N/A'}
                </div>
                <div className="text-sm text-green-800">Factory Code</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {user?.role}
                </div>
                <div className="text-sm text-purple-800">Role</div>
              </div>
            </div>
          </div>
        </div>

        {/* Current Factory Info */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Current Factory</h3>
          </div>
          <div className="card-body">
            {currentFactory ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900">{currentFactory.name}</h4>
                  <p className="text-gray-600">Code: {currentFactory.code}</p>
                  <p className="text-sm text-gray-500">
                    Status: {currentFactory.active ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="badge badge-ceo">Factory Selected</span>
                </div>
              </div>
            ) : (
              <div className="alert alert-warning">
                <p>No factory selected. Please contact your administrator.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Quick Actions</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {getQuickActions().map((action, index) => (
                <button 
                  key={index} 
                  className="btn-secondary text-center p-4 h-auto flex-col"
                  onClick={() => {
                    // TODO: Navigate to respective pages
                    alert(`${action.title} feature coming soon!`)
                  }}
                >
                  <div className="text-lg mb-2">{action.icon}</div>
                  <div className="font-medium">{action.title}</div>
                  <div className="text-sm opacity-75">{action.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Today's Summary */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Today's Summary</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">0</div>
                <div className="text-sm text-gray-600">Active Orders</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">0</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">0</div>
                <div className="text-sm text-gray-600">Pending QC</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">0</div>
                <div className="text-sm text-gray-600">Issues</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Recent Activity</h3>
          </div>
          <div className="card-body">
            <div className="text-center text-gray-500 py-8">
              <p>No recent activity to display.</p>
              <p className="text-sm mt-2">Activity will appear here as you use the system.</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default FactoryDashboard