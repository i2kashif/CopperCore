import { useAuth } from '../features/auth'
import { useNavigate } from 'react-router-dom'

interface UserInfoCardProps {
  user: any
  currentFactory: any
}

function UserInfoCard({ user, currentFactory }: UserInfoCardProps) {
  const displayName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user.username || user.email.split('@')[0]

  return (
    <div className="bg-white shadow rounded-lg border border-gray-100">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-lg font-medium text-blue-600">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Welcome to CopperCore ERP
              </h3>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span className="font-medium">{displayName}</span>
                <span className="text-gray-400">•</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {user.role}
                </span>
                {currentFactory && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="font-mono text-xs">{currentFactory.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <LogoutButton />
        </div>
      </div>
    </div>
  )
}

function LogoutButton() {
  const { logout } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <button
      onClick={handleLogout}
      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
    >
      <svg 
        className="w-4 h-4 mr-2" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth="2" 
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
        />
      </svg>
      Sign Out
    </button>
  )
}

interface QuickActionProps {
  title: string
  description: string
  icon: React.ReactNode
  href?: string
  onClick?: () => void
  disabled?: boolean
}

function QuickAction({ title, description, icon, href, onClick, disabled = false }: QuickActionProps) {
  const navigate = useNavigate()
  
  const handleClick = () => {
    if (href && !disabled) {
      navigate(href)
    } else if (onClick) {
      onClick()
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className="relative group bg-white p-6 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-left w-full"
    >
      <div>
        <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
          {icon}
        </span>
      </div>
      <div className="mt-4">
        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {description}
        </p>
      </div>
      <div className="mt-4 flex items-center text-blue-600 group-hover:text-blue-700 transition-colors">
        <span className="text-sm font-medium">Get started</span>
        <svg 
          className="ml-2 h-4 w-4" 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path 
            fillRule="evenodd" 
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" 
            clipRule="evenodd" 
          />
        </svg>
      </div>
    </button>
  )
}

function QuickActionsGrid() {
  const { user } = useAuth()
  
  const actions = [
    {
      title: 'Scanner',
      description: 'Scan PU barcodes and track production units',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h4" />
        </svg>
      ),
      href: '/scanner',
    },
    {
      title: 'Work Orders',
      description: 'Create and manage production work orders',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      disabled: true,
    },
    {
      title: 'Inventory',
      description: 'View and manage inventory levels and lots',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      disabled: true,
    },
    {
      title: 'Quality Control',
      description: 'QC testing and certificate management',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      disabled: true,
    },
    {
      title: 'Dispatch Notes',
      description: 'Create and manage outbound deliveries',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2v0M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
        </svg>
      ),
      disabled: true,
    },
    {
      title: 'Manage Company',
      description: 'Factory and user management (CEO only)',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      disabled: user?.role !== 'CEO' && user?.role !== 'Director',
      href: '/manage-company',
    },
  ]

  return (
    <div className="bg-white shadow rounded-lg border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">
          Quick Actions
        </h3>
        <p className="text-sm text-gray-500">
          Start with these common CopperCore ERP operations
        </p>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action, index) => (
            <QuickAction
              key={index}
              title={action.title}
              description={action.description}
              icon={action.icon}
              href={action.href}
              disabled={action.disabled}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, currentFactory } = useAuth()

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      <UserInfoCard user={user} currentFactory={currentFactory} />
      <QuickActionsGrid />
    </div>
  )
}