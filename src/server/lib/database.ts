/**
 * Database Connection Utilities
 * PostgreSQL connection management for CopperCore ERP
 */

import { Pool, Client, PoolConfig } from 'pg'
import { config } from 'dotenv'

// Load environment variables first
config()

const dbConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
}

// Global connection pool
let pool: Pool | null = null

/**
 * Get or create database connection pool
 */
export function getDbPool(): Pool {
  if (!pool) {
    pool = new Pool(dbConfig)
    
    pool.on('error', (err) => {
      console.error('Database pool error:', err)
    })
  }
  
  return pool
}

/**
 * Create a single database connection (for testing)
 */
export async function createDbConnection(): Promise<Client> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  })
  
  await client.connect()
  return client
}

/**
 * Execute a query with the connection pool
 */
export async function query(text: string, params?: any[]) {
  const pool = getDbPool()
  const client = await pool.connect()
  
  try {
    const result = await client.query(text, params)
    return result
  } finally {
    client.release()
  }
}

/**
 * Execute a transaction
 */
export async function transaction<T>(
  callback: (client: Client) => Promise<T>
): Promise<T> {
  const pool = getDbPool()
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
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
 * Close all database connections
 */
export async function closeDbConnections(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}