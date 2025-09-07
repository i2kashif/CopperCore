import { useState } from 'react'
import { useAuth } from '../../auth'
import { FactoriesTab } from './FactoriesTab'
import { UsersTab } from './UsersTab'
import { OpeningStockTab } from './OpeningStockTab'
import { ProductFamiliesTab } from './ProductFamiliesTab'

type TabKey = 'factories' | 'users' | 'opening-stock' | 'product-families'

export function ManageCompany() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabKey>('factories')

  // Only CEO and Director can access this module
  if (!user || (user.role !== 'CEO' && user.role !== 'Director')) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-red-900">Access Denied</h3>
        <p className="mt-2 text-sm text-red-700">
          Only CEO and Director roles can access the Manage Company module.
        </p>
      </div>
    )
  }

  const tabs = [
    { key: 'factories' as TabKey, label: 'Factories', icon: '🏭' },
    { key: 'users' as TabKey, label: 'Users', icon: '👥' },
    { key: 'opening-stock' as TabKey, label: 'Opening Stock', icon: '📦' },
    { key: 'product-families' as TabKey, label: 'Product Families', icon: '🏷️' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg border border-gray-100">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Manage Company</h2>
              <p className="mt-1 text-sm text-gray-500">
                Manage factories, users, and opening stock for CopperCore ERP
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-copper-100 text-copper-800">
                {user.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white shadow rounded-lg border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.key
                    ? 'border-copper-500 text-copper-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'factories' && <FactoriesTab />}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'opening-stock' && <OpeningStockTab />}
          {activeTab === 'product-families' && <ProductFamiliesTab />}
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Important Notes
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Factories must be created before users can be assigned to them</li>
                <li>CEO and Director roles have global access to all factories</li>
                <li>Product Families define SKU structures and automatic naming rules</li>
                <li>Opening stock entries create an audit trail with user and timestamp</li>
                <li>All changes are tracked in the activity log for compliance</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}