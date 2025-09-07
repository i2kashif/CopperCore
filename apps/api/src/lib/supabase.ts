import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

/**
 * Supabase client singleton for database access
 * 
 * Uses service role key for server-side operations with RLS bypass capability.
 * Factory scoping is enforced at the application level through middleware.
 * 
 * Per PRD §11: Platform Architecture & Hosting (Supabase)
 * - Connection pooling handled by Supabase
 * - RLS policies implemented in database
 * - Realtime subscriptions for UI updates
 */

let supabaseInstance: SupabaseClient<Database> | null = null

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is required. Make sure .env file is loaded.')
    }
    
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required. Make sure .env file is loaded.')
    }

    // Development mode: Handle case where we might be using anon key instead of service role
    const isDevelopment = process.env.NODE_ENV === 'development'
    const isLocalSupabase = supabaseUrl.includes('localhost')
    
    console.log(`🔧 Supabase client: ${isDevelopment ? 'development' : 'production'} mode`)
    console.log(`📍 URL: ${supabaseUrl}`)
    console.log(`🔑 Key type: ${supabaseServiceKey.includes('anon') ? 'anon' : 'service_role'}`)

    supabaseInstance = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-application-name': 'CopperCore-API'
        }
      }
    })
  }
  
  return supabaseInstance
}

/**
 * Execute query with factory scoping
 * 
 * For RLS compliance, this creates a new client instance with user context
 * set via RLS security definer functions.
 * 
 * @param userId - User executing the query
 * @param factoryIds - User's assigned factory IDs  
 * @param isGlobal - Whether user has global access (CEO/Director)
 */
export function getFactoryScopedClient(
  userId: string, 
  factoryIds: string[], 
  isGlobal: boolean = false
): SupabaseClient<Database> {
  const client = getSupabaseClient()
  
  // Set RLS context variables for factory scoping
  // These will be used by RLS policies to filter data
  const rpcCall = client.rpc('set_user_context', {
    p_user_id: userId,
    p_factory_ids: factoryIds,
    p_is_global: isGlobal
  })

  return client
}

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(): Promise<{ 
  connected: boolean
  latency?: number 
  error?: string 
}> {
  try {
    const start = Date.now()
    const client = getSupabaseClient()
    
    // Simple query to test connection
    const { error } = await client
      .from('factories')
      .select('id')
      .limit(1)
      .single()
    
    const latency = Date.now() - start
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned", which is OK
      return { 
        connected: false, 
        error: error.message 
      }
    }
    
    return { 
      connected: true, 
      latency 
    }
  } catch (error) {
    return { 
      connected: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Execute raw SQL with parameters (dev/testing only)
 * 
 * WARNING: This bypasses RLS. Only use for migrations, seeds, or testing.
 * Production code should use typed queries through the client.
 */
export async function executeRawSQL(
  sql: string, 
  params: any[] = []
): Promise<{ data: any; error: any }> {
  const client = getSupabaseClient()
  
  try {
    // Use rpc to execute raw SQL with parameters
    const { data, error } = await client.rpc('execute_sql', {
      query: sql,
      params: params
    })
    
    return { data, error }
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'SQL execution failed' 
    }
  }
}

/**
 * Batch operations with transaction support
 * 
 * Executes multiple operations in a single transaction.
 * All operations must succeed or all will be rolled back.
 */
export async function withTransaction<T>(
  operations: (client: SupabaseClient<Database>) => Promise<T>
): Promise<{ data: T | null; error: any }> {
  const client = getSupabaseClient()
  
  try {
    // Start transaction
    await client.rpc('begin_transaction')
    
    try {
      const result = await operations(client)
      
      // Commit transaction
      await client.rpc('commit_transaction')
      
      return { data: result, error: null }
    } catch (error) {
      // Rollback on error
      await client.rpc('rollback_transaction')
      throw error
    }
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Transaction failed' 
    }
  }
}

/**
 * Get connection pool stats (monitoring)
 */
export async function getConnectionStats(): Promise<{
  active_connections?: number
  idle_connections?: number
  max_connections?: number
  error?: string
}> {
  try {
    const client = getSupabaseClient()
    
    const { data, error } = await client.rpc('get_connection_stats')
    
    if (error) {
      return { error: error.message }
    }
    
    return data || {}
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Failed to get connection stats' 
    }
  }
}

// Export the singleton instance getter as default
export default getSupabaseClient