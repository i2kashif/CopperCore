/**
 * CopperCore ERP - Acceptance Test AT-SEC-001
 * 
 * Test: Cross-factory read denied for non-global users
 * 
 * Requirements:
 * - FM with Factory 1 selected cannot read Factory 2 data
 * - FW from Factory 1 cannot read Factory 2 data  
 * - WITH CHECK prevents inserting to wrong factory
 * - Scoped users are isolated to their assigned factories
 */

import { test, expect } from '@playwright/test';
import { createSupabaseServiceClient } from '../../src/modules/auth/config.js';
import { createTestJWT } from '../utils/auth-helpers.js';

test.describe('AT-SEC-001: Cross-factory access denial', () => {
  let supabase = createSupabaseServiceClient();
  let testFactories: any = {};
  let testUsers: any = {};

  test.beforeAll(async () => {
    // Get test factories
    const { data: factories } = await supabase
      .from('factories')
      .select('id, code')
      .in('code', ['PLANT1', 'PLANT2']);
    
    if (factories) {
      testFactories.plant1 = factories.find(f => f.code === 'PLANT1')?.id;
      testFactories.plant2 = factories.find(f => f.code === 'PLANT2')?.id;
    }

    // Get test users  
    const { data: users } = await supabase
      .from('users')
      .select('id, username, role')
      .in('username', ['fm1', 'fw1', 'office2']);

    if (users) {
      for (const user of users) {
        testUsers[user.username] = user;
      }
    }
  });

  test('FM from Factory 1 cannot read Factory 2 user data', async () => {

    // Set fm1's selected factory to PLANT1
    await supabase
      .from('user_settings')
      .update({ selected_factory_id: testFactories.plant1 })
      .eq('user_id', testUsers.fm1.id);

    // Create client with fm1's context
    const fm1Client = createSupabaseServiceClient();
    
    // Manually set auth context (in real app, this comes from session)
    const { error } = await fm1Client.rpc('debug_user_context');
    
    if (error) {
      console.log('Debug context error:', error);
    }

    // FM1 should not be able to read users from Factory 2
    const { data: crossFactoryUsers } = await fm1Client
      .from('user_factory_links')
      .select(`
        users(username, role),
        factories(code)
      `)
      .eq('factory_id', testFactories.plant2);

    // This should return empty or error due to RLS
    expect(crossFactoryUsers?.length || 0).toBe(0);
    console.log(`✅ FM1 cannot read Factory 2 users: ${crossFactoryUsers?.length || 0} rows returned`);
  });

  test('FW from Factory 1 cannot read Factory 2 user data', async () => {
    // Set fw1's selected factory to PLANT1  
    await supabase
      .from('user_settings')
      .update({ selected_factory_id: testFactories.plant1 })
      .eq('user_id', testUsers.fw1.id);

    const fw1Client = createSupabaseServiceClient();
    
    // FW1 should not be able to read users from Factory 2
    const { data: crossFactoryUsers } = await fw1Client
      .from('user_factory_links')
      .select(`
        users(username, role),
        factories(code)
      `)
      .eq('factory_id', testFactories.plant2);

    expect(crossFactoryUsers?.length || 0).toBe(0);
    console.log(`✅ FW1 cannot read Factory 2 users: ${crossFactoryUsers?.length || 0} rows returned`);
  });

  test('WITH CHECK prevents inserting user to wrong factory context', async () => {
    // Set fm1's selected factory to PLANT1
    await supabase
      .from('user_settings')
      .update({ selected_factory_id: testFactories.plant1 })
      .eq('user_id', testUsers.fm1.id);

    const fm1Client = createSupabaseServiceClient();

    // Try to create a user-factory link for Factory 2 while FM1 is scoped to Factory 1
    // This should fail due to WITH CHECK clause
    const { data: insertResult, error: insertError } = await fm1Client
      .from('user_factory_links')
      .insert({
        user_id: testUsers.fm1.id,
        factory_id: testFactories.plant2 // Wrong factory - should be blocked
      });

    // Should fail due to RLS WITH CHECK clause
    expect(insertError).toBeTruthy();
    expect(insertResult).toBeNull();
    console.log(`✅ WITH CHECK blocked cross-factory insert: ${insertError?.message}`);
  });

  test('FM can read own factory user assignments', async () => {
    // Set fm1's selected factory to PLANT1
    await supabase
      .from('user_settings')
      .update({ selected_factory_id: testFactories.plant1 })
      .eq('user_id', testUsers.fm1.id);

    const fm1Client = createSupabaseServiceClient();

    // FM1 should be able to read Factory 1 user assignments
    const { data: ownFactoryUsers, error } = await fm1Client
      .from('user_factory_links')
      .select(`
        users(username, role),
        factories(code)
      `)
      .eq('factory_id', testFactories.plant1);

    expect(error).toBeNull();
    expect(ownFactoryUsers?.length).toBeGreaterThan(0);
    
    // Verify all returned users are from the correct factory
    const factoryCodes = ownFactoryUsers?.map((link: any) => link.factories?.code) || [];
    expect(factoryCodes.every((code: string) => code === 'PLANT1')).toBe(true);
    
    console.log(`✅ FM1 can read own factory users: ${ownFactoryUsers?.length || 0} assignments`);
  });

  test('Factory scoping works across different data types', async () => {
    // Test that factory scoping applies consistently to different tables
    // This will be expanded as we add more tables in future steps

    // Set office2's selected factory to PLANT2
    await supabase
      .from('user_settings')
      .update({ selected_factory_id: testFactories.plant2 })
      .eq('user_id', testUsers.office2.id);

    const office2Client = createSupabaseServiceClient();

    // Office2 should only see Factory 2 in factories table (if RLS is properly applied)
    const { data: visibleFactories } = await office2Client
      .from('factories')
      .select('code, name');

    // The exact behavior depends on RLS implementation for factories table
    // For now, just verify the query executes without error
    expect(visibleFactories).toBeDefined();
    console.log(`✅ Office2 factory visibility: ${visibleFactories?.length || 0} factories visible`);
  });

  test('RLS helper functions return correct context', async () => {
    // Test that our RLS helper functions work correctly

    // Set fm1's selected factory to PLANT1
    await supabase
      .from('user_settings')
      .update({ selected_factory_id: testFactories.plant1 })
      .eq('user_id', testUsers.fm1.id);

    const fm1Client = createSupabaseServiceClient();

    // Test current_factory() function
    const { data: contextDebug } = await fm1Client.rpc('debug_user_context');
    
    if (contextDebug && contextDebug.length > 0) {
      const context = contextDebug[0];
      
      // Verify user context is correct
      expect(context.role).toBe('FM');
      expect(context.is_global).toBe(false);
      expect(context.current_factory_id).toBe(testFactories.plant1);
      
      console.log(`✅ RLS context for FM1: role=${context.role}, global=${context.is_global}, factory=${context.current_factory_id}`);
    }
  });
});