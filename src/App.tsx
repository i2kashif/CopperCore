/**
 * Main App Component
 * Handles routing and authentication setup for CopperCore ERP
 */

import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthSetup, useAuthStatus } from './hooks/useAuth'
import ProtectedRoute from './components/auth/ProtectedRoute'
import LoginForm from './components/auth/LoginForm'
import FactorySelector from './components/auth/FactorySelector'
import CEODashboard from './components/dashboard/CEODashboard'
import FactoryDashboard from './components/dashboard/FactoryDashboard'
import CompanyManagement from './components/company/CompanyManagement'

function App() {
  // Initialize auth-related side effects (session refresh, factory switching listeners)
  useAuthSetup()
  
  const { isAuthenticated, userRole } = useAuthStatus()

  // Dashboard routing based on user role
  const getDashboardComponent = () => {
    if (!userRole) return null
    
    switch (userRole) {
      case 'CEO':
        return <CEODashboard />
      case 'Director':
        return <CEODashboard /> // Directors use CEO dashboard
      case 'FM':
        return <FactoryDashboard variant="manager" />
      case 'FW':
        return <FactoryDashboard variant="worker" />
      case 'Office':
        return <FactoryDashboard variant="office" />
      default:
        return <FactoryDashboard variant="worker" />
    }
  }

  return (
    <div className="App">
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginForm />} />
        
        {/* Factory selection route */}
        <Route 
          path="/select-factory" 
          element={
            <ProtectedRoute requireFactory={false}>
              <FactorySelector />
            </ProtectedRoute>
          } 
        />
        
        {/* Protected dashboard routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              {getDashboardComponent()}
            </ProtectedRoute>
          } 
        />
        
        {/* Company Management Routes */}
        <Route 
          path="/company/*" 
          element={
            <ProtectedRoute requiredRoles={['CEO', 'Director']}>
              <CompanyManagement />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/company/factories" 
          element={
            <ProtectedRoute requiredRoles={['CEO', 'Director']}>
              <CompanyManagement />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/company/users" 
          element={
            <ProtectedRoute requiredRoles={['CEO', 'Director']}>
              <CompanyManagement />
            </ProtectedRoute>
          } 
        />
        
        {/* Other Role-specific protected routes */}
        <Route 
          path="/admin/*" 
          element={
            <ProtectedRoute requiredRoles={['CEO', 'Director']}>
              <div className="min-h-screen flex items-center justify-center">
                <div className="card max-w-md w-full mx-4">
                  <div className="card-body text-center">
                    <h2 className="text-xl font-semibold mb-4">Admin Panel</h2>
                    <p className="text-gray-600">Coming soon...</p>
                  </div>
                </div>
              </div>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/factory-management/*" 
          element={
            <ProtectedRoute requiredRoles={['CEO', 'Director', 'FM']}>
              <div className="min-h-screen flex items-center justify-center">
                <div className="card max-w-md w-full mx-4">
                  <div className="card-body text-center">
                    <h2 className="text-xl font-semibold mb-4">Factory Management</h2>
                    <p className="text-gray-600">Coming soon...</p>
                  </div>
                </div>
              </div>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/reports" 
          element={
            <ProtectedRoute requiredRoles={['CEO', 'Director']}>
              <div className="min-h-screen flex items-center justify-center">
                <div className="card max-w-md w-full mx-4">
                  <div className="card-body text-center">
                    <h2 className="text-xl font-semibold mb-4">System Reports</h2>
                    <p className="text-gray-600">Coming soon...</p>
                  </div>
                </div>
              </div>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/settings" 
          element={
            <ProtectedRoute requiredRoles={['CEO', 'Director']}>
              <div className="min-h-screen flex items-center justify-center">
                <div className="card max-w-md w-full mx-4">
                  <div className="card-body text-center">
                    <h2 className="text-xl font-semibold mb-4">System Settings</h2>
                    <p className="text-gray-600">Coming soon...</p>
                  </div>
                </div>
              </div>
            </ProtectedRoute>
          } 
        />
        
        {/* Default route - redirect to appropriate destination */}
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        
        {/* Catch-all route */}
        <Route 
          path="*" 
          element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="card max-w-md w-full mx-4">
                <div className="card-body text-center">
                  <h2 className="text-xl font-semibold text-red-600 mb-4">404 - Page Not Found</h2>
                  <p className="text-gray-600 mb-4">
                    The page you're looking for doesn't exist.
                  </p>
                  <button
                    onClick={() => window.location.href = '/dashboard'}
                    className="btn-primary"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            </div>
          } 
        />
      </Routes>
    </div>
  )
}

export default App