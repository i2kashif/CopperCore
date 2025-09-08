/**
 * CopperCore ERP - JWT Test Fixtures
 * 
 * Provides JWT tokens for testing RLS policies with different roles and factory scopes.
 * These tokens simulate what would be issued by Supabase Auth.
 */

import { createClient } from '@supabase/supabase-js';

// Test user IDs (UUIDs)
export const TEST_USERS = {
  ceo: '11111111-1111-1111-1111-111111111111',
  director: '22222222-2222-2222-2222-222222222222',
  fm_fac1: '33333333-3333-3333-3333-333333333333',
  fm_fac2: '44444444-4444-4444-4444-444444444444',
  fw_fac1: '55555555-5555-5555-5555-555555555555',
  fw_fac2: '66666666-6666-6666-6666-666666666666',
  office: '77777777-7777-7777-7777-777777777777',
} as const;

// Test factory IDs  
export const TEST_FACTORIES = {
  fac1: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  fac2: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
} as const;

// JWT Claims for each test role
export const JWT_CLAIMS = {
  ceo: {
    role: 'CEO',
    user_id: TEST_USERS.ceo,
    factory_id: null, // Global role - can access all factories
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
  },
  
  director: {
    role: 'DIRECTOR', 
    user_id: TEST_USERS.director,
    factory_id: null, // Global role - can access all factories
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + (60 * 60),
  },

  fm_fac1: {
    role: 'FM',
    user_id: TEST_USERS.fm_fac1,
    factory_id: TEST_FACTORIES.fac1,
    aud: 'authenticated', 
    exp: Math.floor(Date.now() / 1000) + (60 * 60),
  },

  fm_fac2: {
    role: 'FM',
    user_id: TEST_USERS.fm_fac2,
    factory_id: TEST_FACTORIES.fac2,
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + (60 * 60),
  },

  fw_fac1: {
    role: 'FW',
    user_id: TEST_USERS.fw_fac1,
    factory_id: TEST_FACTORIES.fac1,
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + (60 * 60),
  },

  fw_fac2: {
    role: 'FW', 
    user_id: TEST_USERS.fw_fac2,
    factory_id: TEST_FACTORIES.fac2,
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + (60 * 60),
  },

  office: {
    role: 'OFFICE',
    user_id: TEST_USERS.office,
    factory_id: null, // Office can be global or factory-scoped depending on configuration
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + (60 * 60),
  },
} as const;

/**
 * Create Supabase client with specific JWT for testing
 */
export function createTestClient(role: keyof typeof JWT_CLAIMS) {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_ANON_KEY!;
  
  const client = createClient(supabaseUrl, supabaseKey);
  
  // Set the JWT token to simulate authenticated user
  const claims = JWT_CLAIMS[role];
  const jwt = btoa(JSON.stringify({ 
    typ: 'JWT',
    alg: 'HS256' 
  })) + '.' + 
  btoa(JSON.stringify(claims)) + '.' +
  'test-signature'; // Note: signature validation disabled in test env
  
  // This would be set by Supabase Auth in real usage
  // Note: In real implementation, we'd use proper session from Supabase Auth
  // For testing, we'll set the token directly on requests
  (client as any).auth.session = () => ({
    access_token: jwt,
    refresh_token: 'test-refresh-token',
    user: {
      id: claims.user_id,
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    }
  });
  
  return client;
}

/**
 * RLS Test Helper - verify a user can/cannot access certain rows
 */
export async function testRLSAccess(
  role: keyof typeof JWT_CLAIMS,
  tableName: string,
  expectedRowCount: number | 'any',
  description: string
) {
  const client = createTestClient(role);
  
  try {
    const { data, error } = await client
      .from(tableName)
      .select('*');
      
    if (error) throw error;
    
    if (expectedRowCount === 'any') {
      console.log(`✅ ${description} - ${role} can access ${tableName} (${data?.length || 0} rows)`);
    } else if (data?.length === expectedRowCount) {
      console.log(`✅ ${description} - ${role} sees exactly ${expectedRowCount} rows from ${tableName}`);
    } else {
      console.log(`❌ ${description} - ${role} expected ${expectedRowCount} rows but got ${data?.length || 0}`);
    }
    
    return data;
  } catch (error) {
    console.log(`❌ ${description} - ${role} failed to access ${tableName}:`, error);
    return null;
  }
}

// Export types for TypeScript support
export type TestRole = keyof typeof JWT_CLAIMS;
export type TestUserId = typeof TEST_USERS[keyof typeof TEST_USERS];
export type TestFactoryId = typeof TEST_FACTORIES[keyof typeof TEST_FACTORIES];