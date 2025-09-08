#!/usr/bin/env tsx
/**
 * Database Setup Script
 * Creates database if it doesn't exist and sets up initial configuration
 */

import { Client } from 'pg'
import 'dotenv/config'
import { getDatabaseUrl } from '../lib/db.js'

interface SetupConfig {
  host: string
  port: number
  username: string
  password: string
  database: string
  adminDatabase?: string // Database to connect to for admin operations
}

class DatabaseSetup {
  private config: SetupConfig

  constructor() {
    this.config = this.parseConfig()
  }

  /**
   * Parse DATABASE_URL for setup operations
   */
  private parseConfig(): SetupConfig {
    const databaseUrl = process.env.DATABASE_URL
    
    if (!databaseUrl) {
      // Fallback to individual env vars
      return {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'coppercore',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'localpass',
        adminDatabase: 'postgres' // Default admin database
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
      adminDatabase: 'postgres' // Default admin database for CREATE DATABASE operations
    }
  }

  /**
   * Create PostgreSQL client for admin operations
   */
  private createAdminClient(): Client {
    return new Client({
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      database: this.config.adminDatabase,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
  }

  /**
   * Create PostgreSQL client for target database
   */
  private createDatabaseClient(): Client {
    return new Client({
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      database: this.config.database,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
  }

  /**
   * Check if database exists
   */
  private async databaseExists(): Promise<boolean> {
    const client = this.createAdminClient()
    
    try {
      await client.connect()
      
      const result = await client.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [this.config.database]
      )
      
      return result.rows.length > 0
    } catch (error) {
      throw new Error(`Failed to check if database exists: ${error}`)
    } finally {
      await client.end()
    }
  }

  /**
   * Create database if it doesn't exist
   */
  private async createDatabase(): Promise<void> {
    const client = this.createAdminClient()
    
    try {
      await client.connect()
      
      console.log(`🔧 Creating database: ${this.config.database}`)
      
      // Create database (cannot use parameterized queries for DDL)
      await client.query(`CREATE DATABASE "${this.config.database}"`)
      
      console.log(`✅ Database created: ${this.config.database}`)
    } catch (error: any) {
      if (error.code === '42P04') {
        // Database already exists - this is fine
        console.log(`📋 Database already exists: ${this.config.database}`)
      } else {
        throw new Error(`Failed to create database: ${error.message}`)
      }
    } finally {
      await client.end()
    }
  }

  /**
   * Setup database extensions and initial configuration
   */
  private async setupDatabaseConfig(): Promise<void> {
    const client = this.createDatabaseClient()
    
    try {
      await client.connect()
      
      console.log('🔧 Setting up database configuration...')
      
      // Create extensions
      const extensions = ['uuid-ossp', 'citext', 'pg_trgm']
      
      for (const ext of extensions) {
        try {
          await client.query(`CREATE EXTENSION IF NOT EXISTS "${ext}"`)
          console.log(`✅ Extension enabled: ${ext}`)
        } catch (error: any) {
          console.warn(`⚠️  Could not enable extension ${ext}: ${error.message}`)
        }
      }
      
      // Set search path
      await client.query('ALTER DATABASE $1 SET search_path TO public', [this.config.database])
      
      // Create updated_at trigger function
      await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql'
      `)
      
      console.log('✅ Database configuration completed')
      
    } catch (error) {
      throw new Error(`Failed to setup database config: ${error}`)
    } finally {
      await client.end()
    }
  }

  /**
   * Test database connection
   */
  private async testConnection(): Promise<void> {
    const client = this.createDatabaseClient()
    
    try {
      await client.connect()
      
      const result = await client.query(`
        SELECT 
          current_database() as database,
          current_user as user,
          version() as version,
          current_setting('server_version') as pg_version
      `)
      
      const info = result.rows[0]
      console.log('🔗 Database connection test successful:')
      console.log(`   Database: ${info.database}`)
      console.log(`   User: ${info.user}`)
      console.log(`   PostgreSQL: ${info.pg_version}`)
      
    } catch (error) {
      throw new Error(`Database connection test failed: ${error}`)
    } finally {
      await client.end()
    }
  }

  /**
   * Run complete database setup
   */
  async setup(): Promise<void> {
    try {
      console.log('🚀 Starting database setup...')
      console.log(`📊 Target: ${getDatabaseUrl()}`)
      
      // Check if database exists
      const exists = await this.databaseExists()
      
      if (!exists) {
        // Create database
        await this.createDatabase()
      } else {
        console.log(`📋 Database already exists: ${this.config.database}`)
      }
      
      // Setup database configuration
      await this.setupDatabaseConfig()
      
      // Test connection
      await this.testConnection()
      
      console.log('🎉 Database setup completed successfully!')
      console.log('')
      console.log('Next steps:')
      console.log('  1. Run: pnpm db:bootstrap  # Create migration table')
      console.log('  2. Run: pnpm db:migrate    # Apply migrations')
      console.log('  3. Run: pnpm db:seed       # Seed test data')
      
    } catch (error: any) {
      console.error('❌ Database setup failed:', error.message)
      throw error
    }
  }

  /**
   * Drop database (DANGEROUS - for testing only)
   */
  async dropDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot drop database in production environment')
    }
    
    const client = this.createAdminClient()
    
    try {
      await client.connect()
      
      console.warn(`⚠️  DROPPING database: ${this.config.database}`)
      
      // Terminate active connections
      await client.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = $1 AND pid <> pg_backend_pid()
      `, [this.config.database])
      
      // Drop database
      await client.query(`DROP DATABASE IF EXISTS "${this.config.database}"`)
      
      console.log(`🗑️  Database dropped: ${this.config.database}`)
      
    } catch (error) {
      throw new Error(`Failed to drop database: ${error}`)
    } finally {
      await client.end()
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const setup = new DatabaseSetup()
  const command = process.argv[2]

  switch (command) {
    case 'create':
    case 'setup':
      setup.setup().catch(error => {
        console.error('Setup failed:', error.message)
        process.exit(1)
      })
      break

    case 'drop':
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ Cannot drop database in production')
        process.exit(1)
      }
      
      console.log('⚠️  This will permanently delete the database!')
      setup.dropDatabase().catch(error => {
        console.error('Drop failed:', error.message)
        process.exit(1)
      })
      break

    default:
      console.log('Usage: tsx setup-db.ts [command]')
      console.log('')
      console.log('Commands:')
      console.log('  setup  - Create database and setup initial configuration')
      console.log('  drop   - Drop database (DANGEROUS - dev only)')
      console.log('')
      console.log('Examples:')
      console.log('  pnpm db:setup-full  # Create database')
      process.exit(1)
  }
}

export { DatabaseSetup }