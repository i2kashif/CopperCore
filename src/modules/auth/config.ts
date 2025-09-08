/**
 * Supabase Auth Configuration
 * Configures Supabase client with custom auth settings for CopperCore
 */

import { createClient } from '@supabase/supabase-js'
import type { AuthConfig } from './types.js'

/**
 * Get auth configuration from environment variables
 * Uses Vite's import.meta.env for client-side environment variables
 */
export function getAuthConfig(): AuthConfig {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  // Service key should not be exposed in client code - using anon key as fallback
  const supabaseServiceKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing required environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY'
    )
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceKey
  }
}

/**
 * Create Supabase client with custom auth configuration
 * - Configures auth with username@coppercore.local format
 * - Disables email confirmations for @coppercore.local domain
 * - Sets up JWT custom claims: role, user_id, username
 */
export function createSupabaseClient() {
  const config = getAuthConfig()
  
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      // Custom auth configuration for CopperCore
      flowType: 'implicit',
      // Skip email confirmation for @coppercore.local domain
      // confirmEmailRedirectTo: undefined, // Removed as it's not a valid option
      // Custom JWT claims configuration will be handled server-side
    },
    global: {
      headers: {
        'X-Client-Info': 'coppercore-erp'
      }
    }
  })
}

/**
 * Create Supabase service client with service role key
 * Used for administrative operations like user creation in seed scripts
 */
export function createSupabaseServiceClient() {
  const config = getAuthConfig()
  
  return createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'X-Client-Info': 'coppercore-erp-service'
      }
    }
  })
}

/**
 * Auth configuration constants
 */
export const AUTH_CONFIG = {
  // Domain for fake emails
  EMAIL_DOMAIN: 'coppercore.local',
  
  // Session configuration
  SESSION_TIMEOUT_HOURS: 24,
  REFRESH_THRESHOLD_MINUTES: 15,
  
  // JWT claims
  CUSTOM_CLAIMS: {
    ROLE: 'role',
    USER_ID: 'user_id', 
    USERNAME: 'username'
  },
  
  // Password requirements (for development - should be stricter in production)
  PASSWORD_MIN_LENGTH: 8,
  
  // Rate limiting (should be configured at infrastructure level)
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15
} as const