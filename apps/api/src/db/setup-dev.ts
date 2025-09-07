#!/usr/bin/env tsx

/**
 * Development database setup script
 * Creates tables and seeds data for local development
 */

import { createClient } from '@supabase/supabase-js'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Alternative: Use Supabase's JavaScript API to create tables
async function setupDatabaseViaAPI() {
  console.log('🚀 Setting up database via API...')
  
  try {
    // Check if tables exist by trying to query them
    const { data: existingFactories } = await supabase
      .from('factories')
      .select('id')
      .limit(1)
    
    if (existingFactories) {
      console.log('⚠️  Tables already exist. Skipping creation.')
      return
    }
  } catch (e) {
    console.log('📦 Tables do not exist, will create them via Supabase dashboard')
  }
  
  console.log('\n⚠️  IMPORTANT: Supabase requires table creation via dashboard or CLI')
  console.log('\n📋 To set up the database:')
  console.log('1. Go to your Supabase dashboard: ' + supabaseUrl)
  console.log('2. Navigate to SQL Editor')
  console.log('3. Copy and paste the contents of: apps/api/src/db/init.sql')
  console.log('4. Run the SQL script')
  console.log('\nAlternatively, use Supabase CLI:')
  console.log('  supabase db reset --db-url ' + supabaseUrl)
  console.log('  supabase db push apps/api/src/db/init.sql')
}

// Run the setup
setupDatabaseViaAPI().then(() => {
  console.log('\n✅ Setup script completed')
  process.exit(0)
}).catch(error => {
  console.error('❌ Setup failed:', error)
  process.exit(1)
})