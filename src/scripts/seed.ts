#!/usr/bin/env tsx
/**
 * Database Seed Script
 * Creates test users with Supabase Auth and factory assignments
 * Uses service role for user creation - passwords from environment variables
 */

import { createTestServiceClient } from '../../db/test/config.js'
import type { UserRole } from '../modules/auth/types.js'

interface TestUser {
  username: string
  password: string
  role: UserRole
  full_name: string
  factories: string[] // Factory codes to assign
}


class DatabaseSeeder {
  private supabase = createTestServiceClient()

  /**
   * Get test user configurations from environment
   */
  private getTestUsers(): TestUser[] {
    const users: TestUser[] = [
      {
        username: 'ceo',
        password: process.env.TEST_CEO_PASSWORD || '',
        role: 'CEO',
        full_name: 'Chief Executive Officer',
        factories: [] // CEO has global access, no explicit factory assignments needed
      },
      {
        username: 'director',
        password: process.env.TEST_DIRECTOR_PASSWORD || '',
        role: 'Director',
        full_name: 'Operations Director',
        factories: [] // Director has global access
      },
      {
        username: 'fm1',
        password: process.env.TEST_FM_PASSWORD || '',
        role: 'Factory Manager',
        full_name: 'Factory Manager - Plant 1',
        factories: ['PLANT1'] // Assigned to Factory 1
      },
      {
        username: 'fw1',
        password: process.env.TEST_FW_PASSWORD || '',
        role: 'Worker',
        full_name: 'Factory Worker - Plant 1',
        factories: ['PLANT1'] // Assigned to Factory 1
      },
      {
        username: 'office2',
        password: process.env.TEST_OFFICE_PASSWORD || '',
        role: 'Office',
        full_name: 'Office Staff - Plant 2',
        factories: ['PLANT2'] // Assigned to Factory 2
      },
      {
        username: 'fm_multi',
        password: process.env.TEST_FM_MULTI_PASSWORD || '',
        role: 'Factory Manager',
        full_name: 'Multi-Factory Manager',
        factories: ['PLANT1', 'PLANT2'] // Assigned to both factories
      }
    ]

    // Validate all passwords are provided
    const missingPasswords = users.filter(u => !u.password).map(u => u.username)
    if (missingPasswords.length > 0) {
      throw new Error(
        `Missing passwords for users: ${missingPasswords.join(', ')}\n` +
        'Please set environment variables: ' + 
        missingPasswords.map(u => `TEST_${u.toUpperCase()}_PASSWORD`).join(', ')
      )
    }

    return users
  }

  /**
   * Create or update factory records
   */
  private async seedFactories(): Promise<Map<string, string>> {
    console.log('🏭 Seeding factory data...')

    const factories = [
      {
        name: 'CopperCore Plant 1',
        code: 'PLANT1',
        is_active: true
      },
      {
        name: 'CopperCore Plant 2', 
        code: 'PLANT2',
        is_active: true
      }
    ]

    const factoryIdMap = new Map<string, string>()

    for (const factory of factories) {
      // Check if factory exists
      const { data: existing } = await this.supabase
        .from('factories')
        .select('id, code')
        .eq('code', factory.code)
        .single()

      if (existing) {
        console.log(`   ✅ Factory ${factory.code} already exists`)
        factoryIdMap.set(factory.code, existing.id)
      } else {
        // Create new factory
        const { data: created, error } = await this.supabase
          .from('factories')
          .insert(factory)
          .select('id, code')
          .single()

        if (error) {
          throw new Error(`Failed to create factory ${factory.code}: ${error.message}`)
        }

        console.log(`   ✅ Created factory ${factory.code}`)
        factoryIdMap.set(factory.code, created.id)
      }
    }

    return factoryIdMap
  }

  /**
   * Create Supabase Auth user
   */
  private async createAuthUser(username: string, password: string): Promise<string> {
    const email = `${username}@coppercore.local`

    // Check if auth user already exists
    const { data: existingUsers, error: listError } = await this.supabase.auth.admin.listUsers()
    
    if (listError) {
      throw new Error(`Failed to check existing users: ${listError.message}`)
    }

    const existingUser = existingUsers.users.find(u => u.email === email)
    if (existingUser) {
      console.log(`   ℹ️  Auth user ${email} already exists`)
      return existingUser.id
    }

    // Create new auth user
    const { data, error } = await this.supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification for coppercore.local
      user_metadata: {
        username // Store username in metadata for JWT claims
      }
    })

    if (error || !data.user) {
      throw new Error(`Failed to create auth user ${email}: ${error?.message}`)
    }

    console.log(`   ✅ Created auth user ${email}`)
    return data.user.id
  }

  /**
   * Create or update business user record
   */
  private async createBusinessUser(authId: string, testUser: TestUser): Promise<string> {
    // Check if business user exists by username (since auth_id column doesn't exist)
    const { data: existing } = await this.supabase
      .from('users')
      .select('id')
      .eq('username', testUser.username)
      .single()

    if (existing) {
      console.log(`   ℹ️  Business user ${testUser.username} already exists`)
      return existing.id
    }

    // Create business user
    const { data: created, error } = await this.supabase
      .from('users')
      .insert({
        username: testUser.username,
        role: testUser.role,
        is_active: true
      })
      .select('id')
      .single()

    if (error || !created) {
      throw new Error(`Failed to create business user ${testUser.username}: ${error?.message}`)
    }

    console.log(`   ✅ Created business user ${testUser.username}`)
    return created.id
  }

  /**
   * Create user-factory assignments
   */
  private async createUserFactoryLinks(userId: string, factoryIds: string[], username: string): Promise<void> {
    if (factoryIds.length === 0) {
      console.log(`   ℹ️  No factory assignments for ${username} (global access role)`)
      return
    }

    // Remove existing assignments
    await this.supabase
      .from('user_factory_assignments')
      .delete()
      .eq('user_id', userId)

    // Create new assignments
    const links = factoryIds.map(factoryId => ({
      user_id: userId,
      factory_id: factoryId,
      is_active: true
    }))

    const { error } = await this.supabase
      .from('user_factory_assignments')
      .insert(links)

    if (error) {
      throw new Error(`Failed to create factory assignments for ${username}: ${error.message}`)
    }

    console.log(`   ✅ Assigned ${username} to ${factoryIds.length} factories`)
  }

  /**
   * Set user's selected factory in user_settings
   * Note: Skipped for now since user_settings table doesn't exist yet
   */
  private async setUserSelectedFactory(userId: string, factoryIds: string[], username: string): Promise<void> {
    // For global users (CEO/Director), don't set a selected factory initially
    if (factoryIds.length === 0) {
      console.log(`   ℹ️  No default factory for ${username} (global role)`)
      return
    }

    // Skip user_settings for now since table doesn't exist
    console.log(`   ℹ️  Skipped setting selected factory for ${username} (user_settings table not available)`)
  }

  /**
   * Seed a single test user
   */
  private async seedUser(testUser: TestUser, factoryIdMap: Map<string, string>): Promise<void> {
    console.log(`👤 Seeding user: ${testUser.username} (${testUser.role})`)

    try {
      // 1. Create Supabase Auth user
      const authId = await this.createAuthUser(testUser.username, testUser.password)

      // 2. Create business user record
      const userId = await this.createBusinessUser(authId, testUser)

      // 3. Create factory assignments
      const factoryIds = testUser.factories
        .map(code => factoryIdMap.get(code))
        .filter(id => id !== undefined) as string[]

      await this.createUserFactoryLinks(userId, factoryIds, testUser.username)

      // 4. Set selected factory in user_settings
      await this.setUserSelectedFactory(userId, factoryIds, testUser.username)

      console.log(`   ✅ User ${testUser.username} seeded successfully`)

    } catch (error) {
      console.error(`   ❌ Failed to seed user ${testUser.username}:`, error)
      throw error
    }
  }

  /**
   * Clean up existing test data (for fresh seeding)
   */
  private async cleanupTestData(clean: boolean = false): Promise<void> {
    if (!clean) return

    console.log('🧹 Cleaning up existing test data...')

    // Get test user IDs to clean up
    const testUsernames = this.getTestUsers().map(u => u.username)
    
    const { data: testUsers } = await this.supabase
      .from('users')
      .select('id')
      .in('username', testUsernames)

    if (testUsers && testUsers.length > 0) {
      // Remove factory assignments
      const userIds = testUsers.map(u => u.id)
      await this.supabase
        .from('user_factory_assignments')
        .delete()
        .in('user_id', userIds)

      // Remove business users (skip auth user removal since auth_id doesn't exist)
      await this.supabase
        .from('users')
        .delete()
        .in('id', userIds)

      console.log(`   ✅ Cleaned up ${testUsers.length} existing test users`)
    }
  }

  /**
   * Main seeding function
   */
  async seed(options: { clean?: boolean } = {}): Promise<void> {
    const { clean = false } = options

    try {
      console.log('🌱 Starting database seeding...')

      // Validate environment
      const testUsers = this.getTestUsers()
      console.log(`📋 Found ${testUsers.length} test users to seed`)

      // Clean up if requested
      if (clean) {
        await this.cleanupTestData(clean)
      }

      // 1. Seed factories
      const factoryIdMap = await this.seedFactories()

      // 2. Seed users
      for (const testUser of testUsers) {
        await this.seedUser(testUser, factoryIdMap)
      }

      console.log('🎉 Database seeding completed successfully!')
      
      // Print login instructions
      console.log('\n📋 Test User Login Credentials:')
      console.log('----------------------------------------')
      testUsers.forEach(user => {
        console.log(`Username: ${user.username} | Role: ${user.role} | Factories: ${user.factories.join(', ') || 'Global Access'}`)
      })
      console.log('----------------------------------------')
      console.log('Note: All users use @coppercore.local email domain')

    } catch (error) {
      console.error('❌ Database seeding failed:', error)
      throw error
    }
  }

  /**
   * Verify seeded data
   */
  async verify(): Promise<void> {
    console.log('🔍 Verifying seeded data...')

    const testUsers = this.getTestUsers()
    
    for (const testUser of testUsers) {
      // Check business user exists
      const { data: user } = await this.supabase
        .from('users')
        .select('id, username, role, is_active')
        .eq('username', testUser.username)
        .single()

      if (!user) {
        throw new Error(`User ${testUser.username} not found`)
      }

      if (!user.is_active) {
        throw new Error(`User ${testUser.username} is not active`)
      }

      // Check factory assignments
      const { data: links } = await this.supabase
        .from('user_factory_assignments')
        .select('factory_id, factories(code)')
        .eq('user_id', user.id)
        .eq('is_active', true)

      const assignedFactories = links?.map((l: any) => l.factories?.code).filter(Boolean) || []
      
      if (testUser.factories.length !== assignedFactories.length) {
        throw new Error(`User ${testUser.username} has incorrect factory assignments`)
      }

      console.log(`   ✅ User ${testUser.username}: ${user.role}, factories: [${assignedFactories.join(', ')}]`)
    }

    console.log('✅ All seeded data verified successfully!')
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const seeder = new DatabaseSeeder()
  const command = process.argv[2]
  const options = {
    clean: process.argv.includes('--clean')
  }
  
  switch (command) {
    case 'seed':
      seeder.seed(options).catch(error => {
        console.error('Seeding failed:', error)
        process.exit(1)
      })
      break
      
    case 'verify':
      seeder.verify().catch(error => {
        console.error('Verification failed:', error)
        process.exit(1)
      })
      break
      
    case 'clean':
      seeder.seed({ clean: true }).catch(error => {
        console.error('Clean seeding failed:', error)
        process.exit(1)
      })
      break
      
    default:
      console.log('Usage: tsx seed.ts [seed|verify|clean] [--clean]')
      console.log('  seed   - Seed test users and factories')
      console.log('  verify - Verify seeded data integrity')
      console.log('  clean  - Clean existing data and reseed')
      console.log('  --clean - Clean existing data before seeding')
      console.log('')
      console.log('Required environment variables:')
      console.log('  TEST_CEO_PASSWORD, TEST_DIRECTOR_PASSWORD, TEST_FM_PASSWORD')
      console.log('  TEST_FW_PASSWORD, TEST_OFFICE_PASSWORD, TEST_FM_MULTI_PASSWORD')
      process.exit(1)
  }
}

export { DatabaseSeeder }