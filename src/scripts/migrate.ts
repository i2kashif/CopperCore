#!/usr/bin/env tsx
/**
 * Migration Runner
 * Self-bootstrapping PostgreSQL migration runner with advisory locking
 */

import { readFile, readdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'
import { db, getDatabaseUrl } from '../lib/db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface MigrationFile {
  filename: string
  number: number
  name: string
  path: string
}

interface MigrationRecord {
  id: number
  name: string
  checksum: string
  applied_at: Date
}

class MigrationRunner {
  private migrationsDir = join(__dirname, '../../db/migrations')
  private lockId = BigInt('0x436f7070657243') // 'CopperC' in hex
  private isLocked = false

  /**
   * Bootstrap database: ensure schema and migration table exist
   */
  private async bootstrap(): Promise<void> {
    console.log('🚀 Bootstrapping database...')
    
    // Log environment info
    console.log(`📊 Database URL: ${getDatabaseUrl()}`)
    
    // Get current search path and database info
    const info = await db.getInfo()
    console.log(`🗄️  Database: ${info.database} | User: ${info.user}`)
    console.log(`🔍 Search Path: ${info.search_path}`)
    console.log(`📦 PostgreSQL: ${info.version}`)

    // Ensure we're working in public schema
    await db.query('SET search_path TO public')
    
    // Ensure public schema exists
    await db.query(`CREATE SCHEMA IF NOT EXISTS public`)
    
    // Create migration history table (idempotent)
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.migration_history (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT chk_migration_name_format CHECK (name ~ '^[0-9]{3}_[a-zA-Z0-9_-]+\\.sql$')
      )
    `
    
    await db.query(createTableSQL)
    
    // Create index for performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_migration_history_name 
      ON public.migration_history(name)
    `)
    
    // Add comments
    await db.query(`
      COMMENT ON TABLE public.migration_history IS 'Tracks applied database migrations'
    `)
    
    console.log('✅ Database bootstrap completed')
  }

  /**
   * Get list of migration files sorted by number
   */
  private async getMigrationFiles(): Promise<MigrationFile[]> {
    try {
      const files = await readdir(this.migrationsDir)
      const sqlFiles = files.filter(f => f.endsWith('.sql') && /^[0-9]{3}_/.test(f))

      return sqlFiles
        .map(filename => {
          const match = filename.match(/^([0-9]{3})_(.+)\.sql$/)
          if (!match) throw new Error(`Invalid migration filename format: ${filename}`)
          
          return {
            filename,
            number: parseInt(match[1], 10),
            name: match[2],
            path: join(this.migrationsDir, filename)
          }
        })
        .sort((a, b) => a.number - b.number)
    } catch (error) {
      throw new Error(`Failed to read migrations directory: ${error}`)
    }
  }

  /**
   * Get applied migrations from database
   */
  private async getAppliedMigrations(): Promise<MigrationRecord[]> {
    try {
      const result = await db.query(`
        SELECT id, name, checksum, applied_at 
        FROM public.migration_history 
        ORDER BY id
      `)
      
      return result.rows
    } catch (error: any) {
      if (error.code === '42P01') {
        // Table doesn't exist - return empty array, bootstrap will create it
        return []
      }
      throw new Error(`Failed to fetch applied migrations: ${error.message}`)
    }
  }

  /**
   * Calculate SHA-256 checksum of file content
   */
  private calculateChecksum(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex')
  }

  /**
   * Apply a single migration
   */
  private async applyMigration(migration: MigrationFile): Promise<void> {
    console.log(`🔄 Applying migration: ${migration.filename}`)

    try {
      // Read migration content
      const content = await readFile(migration.path, 'utf-8')
      const checksum = this.calculateChecksum(content)

      await db.transaction(async (client) => {
        // Set search path for this transaction
        await client.query('SET search_path TO public')
        
        // Execute the migration SQL
        await client.query(content)
        
        // Record migration in history
        await client.query(`
          INSERT INTO public.migration_history (name, checksum)
          VALUES ($1, $2)
        `, [migration.filename, checksum])
      })

      console.log(`✅ Applied migration: ${migration.filename}`)

    } catch (error: any) {
      console.error(`❌ Failed to apply migration ${migration.filename}:`)
      console.error(`   Error: ${error.message}`)
      throw error
    }
  }

  /**
   * Verify migration integrity
   */
  private async verifyMigration(migration: MigrationFile, record: MigrationRecord): Promise<boolean> {
    const content = await readFile(migration.path, 'utf-8')
    const currentChecksum = this.calculateChecksum(content)
    
    if (currentChecksum !== record.checksum) {
      console.warn(`⚠️  Migration ${migration.filename} has changed since it was applied!`)
      console.warn(`   Applied checksum: ${record.checksum}`)
      console.warn(`   Current checksum: ${currentChecksum}`)
      return false
    }

    return true
  }

  /**
   * Acquire advisory lock to prevent concurrent migrations
   */
  private async acquireLock(): Promise<void> {
    const acquired = await db.acquireAdvisoryLock(this.lockId)
    if (!acquired) {
      throw new Error('Could not acquire migration lock. Another migration may be running.')
    }
    this.isLocked = true
    console.log('🔒 Migration lock acquired')
  }

  /**
   * Release advisory lock
   */
  private async releaseLock(): Promise<void> {
    if (this.isLocked) {
      await db.releaseAdvisoryLock(this.lockId)
      this.isLocked = false
      console.log('🔓 Migration lock released')
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(options: { dryRun?: boolean; verify?: boolean } = {}): Promise<void> {
    const { dryRun = false, verify = false } = options

    try {
      console.log('🔄 Starting migration runner...')

      // Ensure DATABASE_URL is set
      if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
        throw new Error('DATABASE_URL or DB_HOST must be set. Check your .env file.')
      }

      // Acquire lock for non-dry-run operations
      if (!dryRun) {
        await this.acquireLock()
      }

      // Bootstrap database (idempotent)
      if (!dryRun) {
        await this.bootstrap()
      }

      // Get available and applied migrations
      const availableMigrations = await this.getMigrationFiles()
      const appliedMigrations = dryRun ? [] : await this.getAppliedMigrations()

      console.log(`📁 Found ${availableMigrations.length} migration files`)
      console.log(`✅ ${appliedMigrations.length} migrations already applied`)

      // Create lookup map for applied migrations
      const appliedMap = new Map<string, MigrationRecord>()
      appliedMigrations.forEach(record => {
        appliedMap.set(record.name, record)
      })

      // Verify applied migrations if requested
      if (verify) {
        console.log('🔍 Verifying applied migrations...')
        for (const migration of availableMigrations) {
          const record = appliedMap.get(migration.filename)
          if (record) {
            await this.verifyMigration(migration, record)
          }
        }
      }

      // Find pending migrations
      const pendingMigrations = availableMigrations.filter(
        migration => !appliedMap.has(migration.filename)
      )

      if (pendingMigrations.length === 0) {
        console.log('✨ All migrations are up to date!')
        return
      }

      console.log(`🚀 Found ${pendingMigrations.length} pending migrations:`)
      pendingMigrations.forEach(migration => {
        console.log(`   - ${migration.filename}: ${migration.name}`)
      })

      if (dryRun) {
        console.log('🔍 Dry run - no migrations will be applied')
        return
      }

      // Apply pending migrations
      for (const migration of pendingMigrations) {
        await this.applyMigration(migration)
      }

      console.log('🎉 All migrations applied successfully!')

    } catch (error) {
      console.error('❌ Migration runner failed:', error)
      throw error
    } finally {
      // Always release lock
      await this.releaseLock()
    }
  }

  /**
   * Rollback last migration (dangerous - use with caution)
   */
  async rollbackLastMigration(): Promise<void> {
    console.warn('⚠️  ROLLBACK: This operation is dangerous and may cause data loss!')
    
    try {
      await this.acquireLock()
      
      const result = await db.query(`
        SELECT id, name, applied_at 
        FROM public.migration_history 
        ORDER BY id DESC 
        LIMIT 1
      `)

      if (result.rows.length === 0) {
        throw new Error('No migrations to rollback')
      }

      const lastMigration = result.rows[0]
      console.log(`Rolling back migration: ${lastMigration.name}`)
      
      // Remove from migration history
      await db.query(`
        DELETE FROM public.migration_history 
        WHERE id = $1
      `, [lastMigration.id])

      console.log('⚠️  Migration record removed. Manual schema rollback may be required.')
      console.log('   You may need to manually reverse the schema changes.')
      
    } finally {
      await this.releaseLock()
    }
  }

  /**
   * Reset database by removing all migration records (DANGEROUS)
   */
  async resetMigrations(): Promise<void> {
    console.warn('⚠️  RESET: This will remove ALL migration records!')
    console.warn('   The schema will remain, but migration history will be lost.')
    
    try {
      await this.acquireLock()
      
      const result = await db.query(`
        DELETE FROM public.migration_history 
        RETURNING name
      `)

      console.log(`🗑️  Removed ${result.rowCount} migration records`)
      console.log('   Database schema remains unchanged')
      console.log('   You can now re-run migrations from scratch')
      
    } finally {
      await this.releaseLock()
    }
  }

  /**
   * Bootstrap command - only create schema and migration table
   */
  async bootstrapOnly(): Promise<void> {
    console.log('🔄 Running bootstrap only...')
    await this.bootstrap()
    console.log('✅ Bootstrap completed')
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new MigrationRunner()
  const command = process.argv[2]
  
  switch (command) {
    case 'bootstrap':
      runner.bootstrapOnly().catch(error => {
        console.error('Bootstrap failed:', error)
        process.exit(1)
      })
      break

    case 'up':
      runner.runMigrations().catch(error => {
        console.error('Migration failed:', error)
        process.exit(1)
      })
      break
      
    case 'verify':
      runner.runMigrations({ verify: true }).catch(error => {
        console.error('Migration verification failed:', error)
        process.exit(1)
      })
      break
      
    case 'dry-run':
      runner.runMigrations({ dryRun: true }).catch(error => {
        console.error('Migration dry run failed:', error)
        process.exit(1)
      })
      break
      
    case 'rollback':
      runner.rollbackLastMigration().catch(error => {
        console.error('Rollback failed:', error)
        process.exit(1)
      })
      break

    case 'reset':
      runner.resetMigrations().catch(error => {
        console.error('Reset failed:', error)
        process.exit(1)
      })
      break
      
    default:
      console.log('Usage: tsx migrate.ts [command]')
      console.log('')
      console.log('Commands:')
      console.log('  bootstrap  - Create database schema and migration table only')
      console.log('  up         - Apply all pending migrations')
      console.log('  verify     - Verify applied migrations integrity')
      console.log('  dry-run    - Show pending migrations without applying')
      console.log('  rollback   - Rollback last migration (DANGEROUS)')
      console.log('  reset      - Remove all migration records (DANGEROUS)')
      console.log('')
      console.log('Examples:')
      console.log('  pnpm db:bootstrap  # Create migration table')
      console.log('  pnpm db:migrate    # Apply pending migrations')
      console.log('  pnpm db:verify     # Check migration integrity')
      process.exit(1)
  }
}

export { MigrationRunner }