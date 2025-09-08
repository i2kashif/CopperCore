/**
 * Database Connection and Configuration
 * Direct PostgreSQL client replacing Supabase
 */

import { Pool, PoolClient, QueryResult } from 'pg'
import 'dotenv/config'

export interface DatabaseConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl?: boolean
  max?: number
  idleTimeoutMillis?: number
  connectionTimeoutMillis?: number
}

export interface QueryOptions {
  timeout?: number
  client?: PoolClient // For transactions
}

class DatabaseClient {
  private pool: Pool
  private isInitialized = false
  private config: DatabaseConfig

  constructor() {
    this.config = this.parseConfig()
    this.pool = this.createPool()
  }

  /**
   * Parse DATABASE_URL or individual env vars
   */
  private parseConfig(): DatabaseConfig {
    const databaseUrl = process.env.DATABASE_URL
    
    if (!databaseUrl) {
      // Fallback to individual env vars
      return {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'coppercore',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'localpass',
        ssl: process.env.NODE_ENV === 'production',
        max: parseInt(process.env.DB_POOL_MAX || '20'),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || '5000')
      }
    }

    // Parse DATABASE_URL
    const url = new URL(databaseUrl)
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1), // Remove leading /
      username: url.username,
      password: url.password,
      ssl: url.searchParams.get('sslmode') === 'require' || process.env.NODE_ENV === 'production',
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || '5000')
    }
  }

  /**
   * Create PostgreSQL connection pool
   */
  private createPool(): Pool {
    const { ssl, ...config } = this.config
    
    return new Pool({
      ...config,
      user: config.username, // pg uses 'user' not 'username'
      ssl: ssl ? { rejectUnauthorized: false } : false,
      max: config.max,
      idleTimeoutMillis: config.idleTimeoutMillis,
      connectionTimeoutMillis: config.connectionTimeoutMillis,
    })
  }

  /**
   * Initialize database connection and verify
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Test connection
      const client = await this.pool.connect()
      
      // Log connection details
      const result = await client.query(`
        SELECT 
          current_database() as database,
          current_user as user,
          version() as version,
          current_setting('server_version') as pg_version,
          inet_server_addr() as host,
          inet_server_port() as port
      `)
      
      const info = result.rows[0]
      console.log('🔗 Database connected successfully:')
      console.log(`   Database: ${info.database}`)
      console.log(`   User: ${info.user}`)
      console.log(`   PostgreSQL: ${info.pg_version}`)
      console.log(`   Host: ${info.host || this.config.host}:${info.port || this.config.port}`)
      
      // Set search path to public schema
      await client.query('SET search_path TO public')
      
      client.release()
      this.isInitialized = true
      
    } catch (error) {
      console.error('❌ Database connection failed:', error)
      throw new Error(`Database connection failed: ${error}`)
    }
  }

  /**
   * Execute a query with optional transaction client
   */
  async query<T = any>(
    text: string, 
    params?: any[], 
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    const client = options.client || this.pool
    const queryConfig = {
      text,
      values: params,
      ...(options.timeout && { statement_timeout: options.timeout })
    }

    try {
      const result = await client.query(queryConfig)
      return result
    } catch (error) {
      console.error('Database query error:', {
        query: text,
        params: params?.length ? '[PARAMS_HIDDEN]' : undefined,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Set search path for this transaction
      await client.query('SET search_path TO public')
      
      const result = await callback(client)
      
      await client.query('COMMIT')
      return result
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Get a client for manual transaction management
   */
  async getClient(): Promise<PoolClient> {
    const client = await this.pool.connect()
    await client.query('SET search_path TO public')
    return client
  }

  /**
   * Check if database connection is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as health_check')
      return result.rows[0]?.health_check === 1
    } catch {
      return false
    }
  }

  /**
   * Get current database info for debugging
   */
  async getInfo(): Promise<Record<string, any>> {
    const result = await this.query(`
      SELECT 
        current_database() as database,
        current_user as user,
        current_setting('search_path') as search_path,
        current_setting('server_version') as version,
        pg_size_pretty(pg_database_size(current_database())) as size,
        (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as connections
    `)
    
    return result.rows[0]
  }

  /**
   * Acquire advisory lock (for migrations)
   */
  async acquireAdvisoryLock(lockId: bigint, timeout: number = 30000): Promise<boolean> {
    const result = await this.query(
      'SELECT pg_try_advisory_lock($1) as acquired',
      [lockId.toString()]
    )
    return result.rows[0].acquired
  }

  /**
   * Release advisory lock
   */
  async releaseAdvisoryLock(lockId: bigint): Promise<boolean> {
    const result = await this.query(
      'SELECT pg_advisory_unlock($1) as released',
      [lockId.toString()]
    )
    return result.rows[0].released
  }

  /**
   * Close all connections (for graceful shutdown)
   */
  async close(): Promise<void> {
    await this.pool.end()
    this.isInitialized = false
    console.log('📦 Database connections closed')
  }

  /**
   * Get pool statistics
   */
  getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    }
  }
}

// Create singleton instance
const db = new DatabaseClient()

// Initialize on first import (async)
db.initialize().catch(console.error)

// Graceful shutdown
process.on('beforeExit', () => {
  db.close().catch(console.error)
})

export { db, DatabaseClient }

// Helper function to get DB config info
export function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    // Mask password for logging
    const url = new URL(process.env.DATABASE_URL)
    url.password = '***'
    return url.toString()
  }
  
  return `postgresql://${process.env.DB_USER || 'postgres'}:***@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'coppercore'}`
}

// Export types for external use
export type { DatabaseConfig, QueryOptions }
export type { PoolClient, QueryResult } from 'pg'