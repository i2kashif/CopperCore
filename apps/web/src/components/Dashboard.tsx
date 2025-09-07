import { useAuth } from '../features/auth'

export default function Dashboard() {
  const { user, currentFactory, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Welcome to CopperCore ERP
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                User: {user?.email} • Role: {user?.role}
                {currentFactory && ` • Factory: ${currentFactory.name}`}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Scanner</h4>
                <p className="text-sm text-gray-500">Scan PU barcodes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}