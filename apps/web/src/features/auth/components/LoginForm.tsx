// apps/web/src/pages/auth/LoginForm.tsx
import { useState, useEffect } from 'react'
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
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load saved credentials on mount
  useEffect(() => {
    const savedUsername = localStorage.getItem('rememberedUsername')
    const savedPassword = localStorage.getItem('rememberedPassword')
    if (savedUsername && savedPassword) {
      setFormData({ username: savedUsername, password: savedPassword })
      setRememberMe(true)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.username || !formData.password) {
      setError('Please fill in all fields')
      return
    }

    try {
      // Save credentials if remember me is checked
      if (rememberMe) {
        localStorage.setItem('rememberedUsername', formData.username)
        localStorage.setItem('rememberedPassword', formData.password)
      } else {
        localStorage.removeItem('rememberedUsername')
        localStorage.removeItem('rememberedPassword')
      }
      
      await login(formData.username, formData.password)
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
                helperText="Enter your username"
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
                type={showPassword ? "text" : "password"}
                label="Password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                required
                autoComplete="current-password"
                aria-describedby={passwordHelpId}
                helperText="Enter your password"
                startIcon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
                endIcon={
                  showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )
                }
                onEndIconClick={() => setShowPassword(!showPassword)}
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  id="remember"
                  name="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-copper-600 focus:ring-copper-500"
                />
                <span className="ml-2 text-sm text-slate-600">Remember me</span>
              </label>
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

        </Card>

        <p className="text-xs text-center text-slate-500">
          Protected by enterprise-grade encryption
        </p>
      </div>
    </AuthLayout>
  )
}