/**
 * Server-side configuration for tests
 * Loads environment variables from .env file for Node.js test scripts
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

export interface TestConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  supabaseServiceKey: string
}

/**
 * Get test configuration from environment variables
 * Uses process.env for server-side environment variables
 */
export function getTestConfig(): TestConfig {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    throw new Error(
      'Missing required environment variables: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceKey
  }
}

/**
 * Create Supabase service client for tests
 * Uses service role key for administrative operations
 */
export function createTestServiceClient() {
  const config = getTestConfig()
  
  return createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'X-Client-Info': 'coppercore-erp-test'
      }
    }
  })
}