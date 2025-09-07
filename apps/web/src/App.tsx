import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { AuthProvider, RouteGuard, useAuth } from './features/auth'
import Scanner from './components/Scanner'
import Dashboard from './components/Dashboard'
import { ManageCompany } from './features/manage-company'
import { ToastProvider } from './hooks/useToast'
import { ToastContainer } from './components/Toast'

function AppHeader() {
  const { user, currentFactory } = useAuth()

  if (!user) return null

  const displayName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user.username || user.email.split('@')[0]

  return (
    <header className="bg-white shadow border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 flex items-center">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg 
                  className="h-5 w-5 text-white" 
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
              <h1 className="ml-3 text-xl font-bold text-gray-900">
                CopperCore ERP
              </h1>
            </div>
            
            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
              <div className="h-4 w-px bg-gray-300"></div>
              <span className="font-medium">{displayName}</span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {user.role}
              </span>
              {currentFactory && (
                <>
                  <span className="text-gray-400">@</span>
                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                    {currentFactory.name}
                  </span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center">
            <nav className="flex space-x-4">
              <Link
                to="/"
                className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/scanner"
                className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Scanner
              </Link>
              {(user.role === 'CEO' || user.role === 'Director') && (
                <Link
                  to="/manage-company"
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Manage Company
                </Link>
              )}
            </nav>
          </div>
        </div>
      </div>
    </header>
  )
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {children}
        </div>
      </main>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/scanner" element={<Scanner />} />
      <Route path="/manage-company" element={<ManageCompany />} />
    </Routes>
  )
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <RouteGuard>
            <AppLayout>
              <AppRoutes />
            </AppLayout>
          </RouteGuard>
          <ToastContainer />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App