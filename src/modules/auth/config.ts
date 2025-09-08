/**
 * CopperCore ERP Auth Configuration
 * Configuration for PostgreSQL-based authentication system
 */

import type { AuthConfig } from './types.js'

/**
 * Get auth configuration from environment variables
 * Uses Vite's import.meta.env for client-side environment variables
 */
export function getAuthConfig(): AuthConfig {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'

  if (!apiUrl) {
    throw new Error(
      'Missing required environment variable: VITE_API_URL'
    )
  }

  return {
    apiUrl
  }
}

/**
 * Auth configuration constants
 */
export const AUTH_CONFIG = {
  // Session configuration
  SESSION_TIMEOUT_HOURS: 24,
  REFRESH_THRESHOLD_MINUTES: 15,
  
  // JWT claims
  CUSTOM_CLAIMS: {
    ROLE: 'role',
    USER_ID: 'userId', 
    USERNAME: 'username'
  },
  
  // Password requirements (for development - should be stricter in production)
  PASSWORD_MIN_LENGTH: 8,
  
  // Rate limiting (should be configured at infrastructure level)
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15
} as const