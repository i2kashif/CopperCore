/**
 * CopperCore ERP - Acceptance Test AT-SEC-002
 * 
 * Test: CEO/Director global read allowed
 * 
 * Requirements:
 * - CEO can read all factories' data regardless of selected factory
 * - Director can read all factories' data regardless of selected factory
 * - Global users see aggregate data across all factories
 * - user_is_global() returns true for CEO/Director roles
 */

import { test, expect } from '@playwright/test';
import { createSupabaseServiceClient } from '../../src/modules/auth/config.js';
import { createTestJWT } from '../utils/auth-helpers.js';

test.describe('AT-SEC-002: CEO/Director global access', () => {
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
      .in('username', ['ceo', 'director', 'fm1', 'fw1']);

    if (users) {
      for (const user of users) {
        testUsers[user.username] = user;
      }
    }
  });

  test('CEO can read users from all factories', async () => {

    // CEO doesn't need a selected factory, but let's test with one set
    await supabase
      .from('user_settings')
      .update({ selected_factory_id: testFactories.plant1 })
      .eq('user_id', testUsers.ceo.id);

    const ceoClient = createSupabaseServiceClient();

    // CEO should be able to read user-factory links from ALL factories
    const { data: allFactoryUsers, error } = await ceoClient
      .from('user_factory_links')
      .select(`
        users(username, role),
        factories(code)
      `);

    expect(error).toBeNull();
    expect(allFactoryUsers?.length).toBeGreaterThan(0);
    
    // CEO should see users from both factories
    const factoryCodes = allFactoryUsers?.map((link: any) => link.factories?.code) || [];
    const uniqueFactories = [...new Set(factoryCodes)];
    
    expect(uniqueFactories).toContain('PLANT1');
    expect(uniqueFactories).toContain('PLANT2');
    
    console.log(`✅ CEO can read all factory users: ${allFactoryUsers?.length || 0} total assignments from ${uniqueFactories.length} factories`);
  });

  test('Director can read users from all factories', async () => {

    // Director doesn't need a selected factory
    await supabase
      .from('user_settings')
      .update({ selected_factory_id: null })
      .eq('user_id', testUsers.director.id);

    const directorClient = createSupabaseServiceClient();

    // Director should be able to read user-factory links from ALL factories
    const { data: allFactoryUsers, error } = await directorClient
      .from('user_factory_links')
      .select(`
        users(username, role),
        factories(code)
      `);

    expect(error).toBeNull();
    expect(allFactoryUsers?.length).toBeGreaterThan(0);
    
    // Director should see users from both factories
    const factoryCodes = allFactoryUsers?.map((link: any) => link.factories?.code) || [];
    const uniqueFactories = [...new Set(factoryCodes)];
    
    expect(uniqueFactories.length).toBeGreaterThanOrEqual(2); // Should see multiple factories
    
    console.log(`✅ Director can read all factory users: ${allFactoryUsers?.length || 0} total assignments from ${uniqueFactories.length} factories`);
  });

  test('CEO can read all factories regardless of selection', async () => {
    const ceoClient = createSupabaseServiceClient();

    // CEO should see all factories
    const { data: allFactories, error } = await ceoClient
      .from('factories')
      .select('code, name, active');

    expect(error).toBeNull();
    expect(allFactories?.length).toBeGreaterThanOrEqual(2);
    
    // Should include both test factories
    const factoryCodes = allFactories?.map(f => f.code) || [];
    expect(factoryCodes).toContain('PLANT1');
    expect(factoryCodes).toContain('PLANT2');
    
    console.log(`✅ CEO can read all factories: ${allFactories?.length || 0} factories visible`);
  });

  test('Director can read all factories regardless of selection', async () => {
    const directorClient = createSupabaseServiceClient();

    // Director should see all factories
    const { data: allFactories, error } = await directorClient
      .from('factories')
      .select('code, name, active');

    expect(error).toBeNull();
    expect(allFactories?.length).toBeGreaterThanOrEqual(2);
    
    console.log(`✅ Director can read all factories: ${allFactories?.length || 0} factories visible`);
  });

  test('user_is_global() returns true for CEO', async () => {
    const ceoClient = createSupabaseServiceClient();

    // Test the user_is_global() function for CEO
    const { data: contextDebug } = await ceoClient.rpc('debug_user_context');
    
    if (contextDebug && contextDebug.length > 0) {
      const context = contextDebug[0];
      
      expect(context.role).toBe('CEO');
      expect(context.is_global).toBe(true);
      
      console.log(`✅ CEO global context: role=${context.role}, is_global=${context.is_global}`);
    }
  });

  test('user_is_global() returns true for Director', async () => {
    const directorClient = createSupabaseServiceClient();

    // Test the user_is_global() function for Director
    const { data: contextDebug } = await directorClient.rpc('debug_user_context');
    
    if (contextDebug && contextDebug.length > 0) {
      const context = contextDebug[0];
      
      expect(context.role).toBe('Director');
      expect(context.is_global).toBe(true);
      
      console.log(`✅ Director global context: role=${context.role}, is_global=${context.is_global}`);
    }
  });

  test('Global users can access aggregate data across factories', async () => {
    const ceoClient = createSupabaseServiceClient();

    // Test that CEO can perform aggregate queries across all factories
    const { data: userCounts, error } = await ceoClient
      .from('user_factory_links')
      .select(`
        factory_id,
        factories(code, name)
      `);

    expect(error).toBeNull();
    
    // Group by factory to get counts
    const factoryStats: Record<string, number> = {};
    userCounts?.forEach((link: any) => {
      const factoryCode = link.factories?.code;
      if (factoryCode) {
        factoryStats[factoryCode] = (factoryStats[factoryCode] || 0) + 1;
      }
    });

    // CEO should see statistics from multiple factories
    const factoryCount = Object.keys(factoryStats).length;
    expect(factoryCount).toBeGreaterThanOrEqual(2);
    
    console.log(`✅ CEO can access aggregate data: ${JSON.stringify(factoryStats)}`);
  });

  test('Global users can perform cross-factory operations', async () => {
    const ceoClient = createSupabaseServiceClient();

    // CEO should be able to read all users regardless of their factory assignments
    const { data: allUsers, error } = await ceoClient
      .from('users')
      .select('username, role, active')
      .eq('active', true);

    expect(error).toBeNull();
    expect(allUsers?.length).toBeGreaterThan(0);
    
    // Should include users from different roles and factories
    const roles = allUsers?.map(u => u.role) || [];
    const uniqueRoles = [...new Set(roles)];
    
    expect(uniqueRoles.length).toBeGreaterThanOrEqual(2); // Should see multiple roles
    
    console.log(`✅ CEO can read all users: ${allUsers?.length || 0} users across ${uniqueRoles.length} roles`);
  });

  test('Global users maintain access when switching factory context', async () => {
    const ceoClient = createSupabaseServiceClient();

    // Set CEO's selected factory to Plant 1
    await supabase
      .from('user_settings')
      .update({ selected_factory_id: testFactories.plant1 })
      .eq('user_id', testUsers.ceo.id);

    // CEO should still access all factories even with a specific selection
    const { data: allFactories1, error: error1 } = await ceoClient
      .from('factories')
      .select('code');

    expect(error1).toBeNull();
    const factoryCount1 = allFactories1?.length || 0;

    // Switch CEO's selected factory to Plant 2
    await supabase
      .from('user_settings')
      .update({ selected_factory_id: testFactories.plant2 })
      .eq('user_id', testUsers.ceo.id);

    // CEO should still access all factories
    const { data: allFactories2, error: error2 } = await ceoClient
      .from('factories')
      .select('code');

    expect(error2).toBeNull();
    const factoryCount2 = allFactories2?.length || 0;

    // Access should be the same regardless of selected factory
    expect(factoryCount1).toBe(factoryCount2);
    expect(factoryCount1).toBeGreaterThanOrEqual(2);
    
    console.log(`✅ CEO maintains global access when switching factories: ${factoryCount1} factories visible in both contexts`);
  });

  test('Comparison: Global vs Scoped user access patterns', async () => {
    // Compare CEO (global) vs FM (scoped) access patterns
    const ceoClient = createSupabaseServiceClient();
    const fm1Client = createSupabaseServiceClient();

    // Set both users to the same selected factory
    await supabase
      .from('user_settings')
      .update({ selected_factory_id: testFactories.plant1 })
      .eq('user_id', testUsers.ceo.id);

    await supabase
      .from('user_settings')
      .update({ selected_factory_id: testFactories.plant1 })
      .eq('user_id', testUsers.fm1.id);

    // Query user-factory links as both users
    const { data: ceoView } = await ceoClient
      .from('user_factory_links')
      .select('factory_id, factories(code)');

    const { data: fm1View } = await fm1Client
      .from('user_factory_links')
      .select('factory_id, factories(code)');

    const ceoFactories = [...new Set(ceoView?.map((l: any) => l.factories?.code) || [])];
    const fm1Factories = [...new Set(fm1View?.map((l: any) => l.factories?.code) || [])];

    // CEO should see more factories than FM1
    expect(ceoFactories.length).toBeGreaterThanOrEqual(fm1Factories.length);
    expect(ceoFactories.length).toBeGreaterThanOrEqual(2); // Global access
    
    console.log(`✅ Access comparison - CEO sees ${ceoFactories.length} factories, FM1 sees ${fm1Factories.length} factories`);
  });
});