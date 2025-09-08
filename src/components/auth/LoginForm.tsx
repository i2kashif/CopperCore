/**
 * Login Form Component
 * Provides username/password authentication with case-insensitive handling
 */

import React, { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useLogin } from '../../hooks/useAuth'
import { useAuthStatus } from '../../hooks/useAuth'

export function LoginForm() {
  const location = useLocation()
  const { isAuthenticated } = useAuthStatus()
  const loginMutation = useLogin()
  
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Clear errors when form data changes
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      setErrors({})
    }
  }, [formData.username, formData.password])

  // Redirect if already authenticated
  if (isAuthenticated) {
    const from = (location.state as any)?.from?.pathname || '/dashboard'
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Client-side validation
    const newErrors: { [key: string]: string } = {}
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required'
    } else if (formData.username.length < 2) {
      newErrors.username = 'Username must be at least 2 characters'
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, underscore, and hyphen'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Submit login (case will be handled by the service)
    const credentials = {
      username: formData.username.toLowerCase(), // Normalize to lowercase
      password: formData.password
    }
    
    try {
      const result = await loginMutation.mutateAsync(credentials)
      if (result.error) {
        setErrors({ general: result.error.message })
      }
    } catch (error) {
      setErrors({ general: 'Login failed. Please try again.' })
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
        <div className="card-header text-center">
          <h1 className="text-3xl font-semibold text-gray-900">
            CopperCore ERP
          </h1>
          <p className="text-gray-600 mt-2">
            Wire & Cable Manufacturing System
          </p>
        </div>
        
        <div className="card-body">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* General error message */}
            {errors.general && (
              <div className="alert alert-error" role="alert">
                {errors.general}
              </div>
            )}
            
            {/* Username field */}
            <div>
              <label htmlFor="username" className="form-label">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className={`form-input ${errors.username ? 'error' : ''}`}
                placeholder="Enter your username"
                autoComplete="username"
                autoFocus
                data-testid="username-input"
                aria-describedby={errors.username ? 'username-error' : undefined}
              />
              {errors.username && (
                <p id="username-error" className="text-red-600 text-sm mt-1" role="alert">
                  {errors.username}
                </p>
              )}
            </div>
            
            {/* Password field */}
            <div>
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="Enter your password"
                autoComplete="current-password"
                data-testid="password-input"
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
              {errors.password && (
                <p id="password-error" className="text-red-600 text-sm mt-1" role="alert">
                  {errors.password}
                </p>
              )}
            </div>
            
            {/* Submit button */}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="btn-primary w-full flex items-center justify-center gap-2"
              data-testid="login-button"
            >
              {loginMutation.isPending ? (
                <>
                  <span className="loading-spinner"></span>
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
        
        <div className="card-footer text-center text-sm text-gray-500">
          <p>Factory-scoped ERP system</p>
          <p className="mt-1">
            Demo: username <strong>ceo</strong>, password <strong>admin123</strong>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginForm