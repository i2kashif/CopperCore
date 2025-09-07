// Main exports for the auth feature
export { AuthProvider } from './providers/AuthProvider'
export { useAuth, useUser, useCurrentFactory, useIsAuthenticated, useUserRole, useFactories, usePermissions } from './hooks/useAuth'
export { default as LoginForm } from './components/LoginForm'
export { default as RouteGuard, withRoleGuard } from './components/RouteGuard'
export { default as FactorySelector } from './components/FactorySelector'
export { default as LoadingSpinner } from './components/LoadingSpinner'
export type { User, Factory, AuthState, UserRole } from './types/auth'