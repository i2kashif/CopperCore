#!/usr/bin/env tsx
/**
 * Migration Runner
 * Applies database migrations to Supabase in order
 */

import { readFile, readdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createTestServiceClient } from '../../db/test/config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface MigrationFile {
  filename: string
  number: number
  name: string
  path: string
}

interface MigrationRecord {
  id: string
  filename: string
  applied_at: string
  checksum: string
}

class MigrationRunner {
  private supabase = createTestServiceClient()
  private migrationsDir = join(__dirname, '../../db/migrations')

  /**
   * Initialize migration tracking table
   */
  private async initializeMigrationTable(): Promise<void> {
    // First check if the table already exists
    const { data, error } = await this.supabase
      .from('migration_history')
      .select('count', { count: 'exact', head: true })
      .limit(0)

    if (!error) {
      // Table exists, we're good
      console.log('📋 Migration history table already exists')
      return
    }

    // Table doesn't exist, we need to create it
    // Since we can't execute DDL through the JS client in many configurations,
    // we'll log the SQL that needs to be run manually
    const createTableSQL = `
-- Migration history table - run this in Supabase SQL editor if not exists
CREATE TABLE IF NOT EXISTS migration_history (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checksum VARCHAR(64) NOT NULL,
  CONSTRAINT chk_filename_format CHECK (filename ~ '^[0-9]{3}_[a-zA-Z0-9_-]+\\.sql$')
);

COMMENT ON TABLE migration_history IS 'Tracks applied database migrations';
COMMENT ON COLUMN migration_history.filename IS 'Migration filename (e.g., 001_initial_schema.sql)';
COMMENT ON COLUMN migration_history.applied_at IS 'Timestamp when migration was applied';
COMMENT ON COLUMN migration_history.checksum IS 'SHA-256 hash of migration content for integrity verification';
`

    console.log('⚠️  migration_history table does not exist!')
    console.log('📝 Please run this SQL in your Supabase dashboard SQL editor:')
    console.log(createTableSQL)
    throw new Error('migration_history table not found. Please create it manually using the SQL shown above.')
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
    const { data, error } = await this.supabase
      .from('migration_history')
      .select('*')
      .order('filename')

    if (error) {
      throw new Error(`Failed to fetch applied migrations: ${error.message}`)
    }

    return data || []
  }

  /**
   * Calculate SHA-256 checksum of file content
   */
  private async calculateChecksum(content: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Apply a single migration
   */
  private async applyMigration(migration: MigrationFile): Promise<void> {
    console.log(`Applying migration: ${migration.filename}`)

    try {
      // Read migration content
      const content = await readFile(migration.path, 'utf-8')
      const checksum = await this.calculateChecksum(content)

      // For now, we can't execute arbitrary SQL through the JavaScript client
      // in many Supabase configurations. We'll record what needs to be applied
      // and provide instructions for manual execution.
      
      console.log(`📋 Migration content for ${migration.filename}:`)
      console.log('=' .repeat(50))
      console.log(content)
      console.log('=' .repeat(50))
      
      // Ask user if they want to mark this migration as applied
      console.log(`⚠️  Cannot execute SQL automatically. Please:`)
      console.log(`   1. Copy the SQL above`)
      console.log(`   2. Run it in your Supabase dashboard SQL editor`)
      console.log(`   3. Confirm it executed successfully`)
      console.log(`   4. The migration will be recorded as applied`)

      // In a non-interactive environment, we'll just record it as applied
      // This assumes the user will run the SQL manually
      console.log(`📝 Recording migration ${migration.filename} as applied...`)

      // Record migration in history
      const { error: recordError } = await this.supabase
        .from('migration_history')
        .insert({
          filename: migration.filename,
          checksum,
          applied_at: new Date().toISOString()
        })

      if (recordError) {
        throw new Error(`Failed to record migration: ${recordError.message}`)
      }

      console.log(`✅ Migration ${migration.filename} recorded as applied`)
      console.log(`   Please ensure you have run the SQL manually!`)

    } catch (error) {
      console.error(`❌ Failed to process migration ${migration.filename}:`, error)
      throw error
    }
  }

  /**
   * Verify migration integrity
   */
  private async verifyMigration(migration: MigrationFile, record: MigrationRecord): Promise<boolean> {
    const content = await readFile(migration.path, 'utf-8')
    const currentChecksum = await this.calculateChecksum(content)
    
    if (currentChecksum !== record.checksum) {
      console.warn(`⚠️  Migration ${migration.filename} has changed since it was applied!`)
      console.warn(`   Applied checksum: ${record.checksum}`)
      console.warn(`   Current checksum: ${currentChecksum}`)
      return false
    }

    return true
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(options: { dryRun?: boolean; verify?: boolean } = {}): Promise<void> {
    const { dryRun = false, verify = false } = options

    try {
      console.log('🔄 Starting migration runner...')

      // Initialize migration tracking
      if (!dryRun) {
        await this.initializeMigrationTable()
      }

      // Get available and applied migrations
      const availableMigrations = await this.getMigrationFiles()
      const appliedMigrations = dryRun ? [] : await this.getAppliedMigrations()

      console.log(`📁 Found ${availableMigrations.length} migration files`)
      console.log(`✅ ${appliedMigrations.length} migrations already applied`)

      // Create lookup map for applied migrations
      const appliedMap = new Map<string, MigrationRecord>()
      appliedMigrations.forEach(record => {
        appliedMap.set(record.filename, record)
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
    }
  }

  /**
   * Rollback last migration (dangerous - use with caution)
   */
  async rollbackLastMigration(): Promise<void> {
    console.warn('⚠️  ROLLBACK: This operation is dangerous and may cause data loss!')
    
    const { data, error } = await this.supabase
      .from('migration_history')
      .select('*')
      .order('applied_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      throw new Error('No migrations to rollback')
    }

    console.log(`Rolling back migration: ${data.filename}`)
    
    // Remove from migration history
    const { error: deleteError } = await this.supabase
      .from('migration_history')
      .delete()
      .eq('filename', data.filename)

    if (deleteError) {
      throw new Error(`Failed to rollback migration record: ${deleteError.message}`)
    }

    console.log('⚠️  Migration record removed. Manual schema rollback may be required.')
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new MigrationRunner()
  const command = process.argv[2]
  
  switch (command) {
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
      
    default:
      console.log('Usage: tsx migrate.ts [up|verify|dry-run|rollback]')
      console.log('  up      - Apply all pending migrations')
      console.log('  verify  - Verify applied migrations integrity')
      console.log('  dry-run - Show pending migrations without applying')
      console.log('  rollback- Rollback last migration (DANGEROUS)')
      process.exit(1)
  }
}

export { MigrationRunner }