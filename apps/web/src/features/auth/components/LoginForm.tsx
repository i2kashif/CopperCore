// apps/web/src/pages/auth/LoginForm.tsx
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Button, Card, TextField, ErrorAlert } from '../../../components/ui'
import { AuthLayout } from '../layouts/AuthLayout'
import { AuthHeader } from './AuthHeader'

interface LoginFormData {
  username: string
  password: string
}

export default function LoginForm() {
  const { login, isLoading } = useAuth()
  const [formData, setFormData] = useState<LoginFormData>({ username: '', password: '' })
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.username || !formData.password) {
      setError('Please fill in all fields')
      return
    }

    try {
      await login(formData.username, formData.password)
      // Optionally persist rememberMe here if your auth stack supports it
    } catch (err: any) {
      setError(err?.message || 'Invalid username or password. Please try again.')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const usernameHelpId = 'username-help'
  const passwordHelpId = 'password-help'
  const errorId = 'login-error'

  return (
    <AuthLayout>
      <div className="space-y-6">
        <AuthHeader />

        <Card padding="lg">
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
            aria-busy={isLoading || undefined}
            aria-describedby={error ? errorId : undefined}
            noValidate
            data-testid="login-form"
          >
            <div className="space-y-4">
              <TextField
                id="username"
                name="username"
                type="text"
                label="Username"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleChange}
                disabled={isLoading}
                required
                autoFocus
                autoComplete="username"
                aria-describedby={usernameHelpId}
                helperText="Your factory-assigned username"
                startIcon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              />

              <TextField
                id="password"
                name="password"
                type="password"
                label="Password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                required
                autoComplete="current-password"
                aria-describedby={passwordHelpId}
                helperText="Keep your credentials confidential"
                startIcon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  id="remember"
                  name="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="ml-2 text-sm text-slate-600">Remember me</span>
              </label>
              <a href="#" className="text-sm font-medium text-emerald-600 hover:text-emerald-500">
                Forgot password?
              </a>
            </div>

            {error && (
              <div aria-live="polite" id={errorId}>
                <ErrorAlert message={error} />
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isLoading}
              disabled={isLoading}
              data-testid="login-submit"
            >
              {isLoading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs text-center text-slate-500">
              Factory-scoped access with role-based permissions
            </p>
            <p className="text-xs text-center text-slate-400 mt-1">
              Pakistan fiscal compliance enabled
            </p>
          </div>
        </Card>

        <p className="text-xs text-center text-slate-500">
          Protected by enterprise-grade encryption
        </p>
      </div>
    </AuthLayout>
  )
}