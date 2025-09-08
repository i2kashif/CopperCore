#!/usr/bin/env tsx
/**
 * Database Seed Script
 * Creates test users and factory assignments for development/testing
 * Direct PostgreSQL implementation replacing Supabase Auth
 */

import { db } from '../lib/db.js'
import { createHash } from 'crypto'

type UserRole = 'CEO' | 'Director' | 'FM' | 'FW' | 'Office'

interface TestUser {
  username: string
  password: string
  role: UserRole
  full_name: string
  email: string
  factories: string[] // Factory codes to assign
}

interface Factory {
  code: string
  name: string
  address?: string
}

class DatabaseSeeder {

  /**
   * Hash password for storage (simple SHA-256 for demo - use bcrypt in production)
   */
  private hashPassword(password: string): string {
    return createHash('sha256').update(password + 'coppercore-salt').digest('hex')
  }

  /**
   * Get test user configurations from environment
   */
  private getTestUsers(): TestUser[] {
    const users: TestUser[] = [
      {
        username: 'ceo',
        password: process.env.TEST_CEO_PASSWORD || 'admin123',
        role: 'CEO',
        full_name: 'Chief Executive Officer',
        email: 'ceo@coppercore.local',
        factories: [] // CEO has global access, no explicit factory assignments needed
      },
      {
        username: 'director',
        password: process.env.TEST_DIRECTOR_PASSWORD || 'dir123456',
        role: 'Director',
        full_name: 'Operations Director',
        email: 'director@coppercore.local',
        factories: [] // Director has global access
      },
      {
        username: 'fm1',
        password: process.env.TEST_FM_PASSWORD || 'fm123456',
        role: 'FM',
        full_name: 'Factory Manager - Plant 1',
        email: 'fm1@coppercore.local',
        factories: ['PLANT1'] // Assigned to Factory 1
      },
      {
        username: 'fw1',
        password: process.env.TEST_FW_PASSWORD || 'fw123456',
        role: 'FW',
        full_name: 'Factory Worker - Plant 1',
        email: 'fw1@coppercore.local',
        factories: ['PLANT1'] // Assigned to Factory 1
      },
      {
        username: 'office1',
        password: process.env.TEST_OFFICE_PASSWORD || 'office123',
        role: 'Office',
        full_name: 'Office Staff',
        email: 'office1@coppercore.local',
        factories: ['PLANT1', 'PLANT2'] // Assigned to multiple factories
      },
      {
        username: 'fm2',
        password: process.env.TEST_FM_PASSWORD || 'fm123456',
        role: 'FM',
        full_name: 'Factory Manager - Plant 2',
        email: 'fm2@coppercore.local',
        factories: ['PLANT2'] // Assigned to Factory 2
      },
      {
        username: 'fm_multi',
        password: process.env.TEST_FM_MULTI_PASSWORD || 'fm123456',
        role: 'FM',
        full_name: 'Multi-Plant Factory Manager',
        email: 'fm_multi@coppercore.local',
        factories: ['PLANT1', 'PLANT2'] // Assigned to multiple factories
      }
    ]

    // Validate required passwords are set
    const missingPasswords = users.filter(user => !user.password)
    if (missingPasswords.length > 0) {
      console.warn('⚠️  Some test passwords not set in environment:')
      missingPasswords.forEach(user => {
        console.warn(`   ${user.username}: using default password`)
      })
    }

    return users
  }

  /**
   * Get test factory configurations
   */
  private getTestFactories(): Factory[] {
    return [
      {
        code: 'PLANT1',
        name: 'Main Production Plant',
        address: 'Industrial Zone, Karachi, Pakistan'
      },
      {
        code: 'PLANT2',
        name: 'Secondary Production Plant', 
        address: 'Export Zone, Lahore, Pakistan'
      },
      {
        code: 'PLANT3',
        name: 'Quality Control Center',
        address: 'Quality District, Islamabad, Pakistan'
      }
    ]
  }

  /**
   * Create test factories
   */
  private async createFactories(): Promise<Map<string, string>> {
    console.log('🏭 Seeding factory data...')
    const factories = this.getTestFactories()
    const factoryIdMap = new Map<string, string>()
    
    for (const factory of factories) {
      const result = await db.query(`
        INSERT INTO public.factories (code, name, active)
        VALUES ($1, $2, true)
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          updated_at = now()
        RETURNING id, code
      `, [factory.code, factory.name])

      const factoryRecord = result.rows[0]
      factoryIdMap.set(factory.code, factoryRecord.id)
      console.log(`   ✅ Factory: ${factory.code} - ${factory.name}`)
    }

    return factoryIdMap
  }

  /**
   * Create test users
   */
  private async createUsers(factoryIdMap: Map<string, string>): Promise<Map<string, string>> {
    console.log('👥 Seeding user data...')
    const users = this.getTestUsers()
    const userIdMap = new Map<string, string>()

    for (const user of users) {
      const hashedPassword = this.hashPassword(user.password)

      // Insert or update user
      const userResult = await db.query(`
        INSERT INTO public.users (username, email, role, full_name, active)
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (username) DO UPDATE SET
          email = EXCLUDED.email,
          role = EXCLUDED.role,
          full_name = EXCLUDED.full_name,
          updated_at = now()
        RETURNING id, username
      `, [user.username, user.email, user.role, user.full_name])

      const userRecord = userResult.rows[0]
      userIdMap.set(user.username, userRecord.id)

      console.log(`   ✅ User: ${user.username} (${user.role})`)

      // Create factory assignments for non-global users
      if (user.factories.length > 0) {
        // Clear existing factory links
        await db.query(`
          DELETE FROM public.user_factory_links 
          WHERE user_id = $1
        `, [userRecord.id])

        // Create new factory links
        for (const factoryCode of user.factories) {
          const factoryId = factoryIdMap.get(factoryCode)
          if (factoryId) {
            await db.query(`
              INSERT INTO public.user_factory_links (user_id, factory_id, created_by)
              VALUES ($1, $2, $1)
            `, [userRecord.id, factoryId])

            console.log(`      🔗 Linked to factory: ${factoryCode}`)
          } else {
            console.warn(`      ⚠️  Factory not found: ${factoryCode}`)
          }
        }

        // Set default selected factory for the user
        const primaryFactoryId = factoryIdMap.get(user.factories[0])
        if (primaryFactoryId) {
          await db.query(`
            UPDATE public.user_settings 
            SET selected_factory_id = $1, updated_at = now()
            WHERE user_id = $2
          `, [primaryFactoryId, userRecord.id])
        }
      }
    }

    return userIdMap
  }

  /**
   * Seed database with test data
   */
  async seed(): Promise<void> {
    try {
      console.log('🌱 Starting database seed...')

      await db.transaction(async (client) => {
        // Set search path
        await client.query('SET search_path TO public')

        console.log('🌱 Seeding within transaction...')
      })

      // Create factories first (needed for user assignments)
      const factoryIdMap = await this.createFactories()

      // Create users and their factory assignments
      const userIdMap = await this.createUsers(factoryIdMap)

      // Show summary
      console.log('')
      console.log('📊 Seed Summary:')
      console.log(`   Factories: ${factoryIdMap.size}`)
      console.log(`   Users: ${userIdMap.size}`)
      console.log('')
      console.log('🎉 Database seeded successfully!')
      console.log('')
      console.log('Test Users Created:')
      console.log('   ceo / admin123        (CEO - Global Access)')
      console.log('   director / dir123456  (Director - Global Access)')
      console.log('   fm1 / fm123456        (Factory Manager - Plant 1)')
      console.log('   fw1 / fw123456        (Factory Worker - Plant 1)')
      console.log('   office1 / office123   (Office - Multi Plant)')

    } catch (error: any) {
      console.error('❌ Seed failed:', error.message)
      throw error
    }
  }

  /**
   * Clean seed data (remove test users and factories)
   */
  async clean(): Promise<void> {
    try {
      console.log('🗑️  Cleaning seed data...')

      await db.transaction(async (client) => {
        // Set search path
        await client.query('SET search_path TO public')

        // Delete factory switch events
        await client.query(`DELETE FROM public.factory_switch_events`)

        // Delete user factory links
        await client.query(`DELETE FROM public.user_factory_links`)

        // Delete user settings
        await client.query(`DELETE FROM public.user_settings`)

        // Delete users
        const userResult = await client.query(`
          DELETE FROM public.users 
          WHERE username IN ('ceo', 'director', 'fm1', 'fw1', 'office1', 'fm2', 'fm_multi')
          RETURNING username
        `)

        // Delete factories
        const factoryResult = await client.query(`
          DELETE FROM public.factories 
          WHERE code IN ('PLANT1', 'PLANT2', 'PLANT3')
          RETURNING code
        `)

        console.log(`   🗑️  Deleted ${userResult.rows.length} users`)
        console.log(`   🗑️  Deleted ${factoryResult.rows.length} factories`)
      })

      console.log('✅ Seed data cleaned successfully!')

    } catch (error: any) {
      console.error('❌ Clean failed:', error.message)
      throw error
    }
  }

  /**
   * Reset database (clean + seed)
   */
  async reset(): Promise<void> {
    console.log('🔄 Resetting database (clean + seed)...')
    await this.clean()
    await this.seed()
    console.log('✅ Database reset completed!')
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const seeder = new DatabaseSeeder()
  const command = process.argv[2]

  switch (command) {
    case 'seed':
      seeder.seed().catch(error => {
        console.error('Seed failed:', error.message)
        process.exit(1)
      })
      break

    case 'clean':
      seeder.clean().catch(error => {
        console.error('Clean failed:', error.message)
        process.exit(1)
      })
      break

    case 'reset':
      seeder.reset().catch(error => {
        console.error('Reset failed:', error.message)
        process.exit(1)
      })
      break

    default:
      console.log('Usage: tsx seed.ts [command]')
      console.log('')
      console.log('Commands:')
      console.log('  seed   - Create test users and factories')
      console.log('  clean  - Remove test data')
      console.log('  reset  - Clean and re-seed')
      console.log('')
      console.log('Examples:')
      console.log('  pnpm db:seed       # Seed test data')
      console.log('  pnpm db:seed:clean # Remove test data')
      process.exit(1)
  }
}

export { DatabaseSeeder }