/**
 * CopperCore ERP - Acceptance Test AT-SEC-003
 * 
 * Test: CEO/Director switches factory, RLS scope updates without re-login
 * 
 * Requirements:
 * - CEO can switch from Factory 1 to Factory 2 without re-authentication
 * - current_factory() returns new selection after switch
 * - Data scope changes according to new factory selection
 * - Multi-factory FM can switch between assigned factories
 * - Factory switch is transactional and emits events
 */

import { test, expect } from '@playwright/test';
import { createSupabaseServiceClient } from '../../src/modules/auth/config.js';

test.describe('AT-SEC-003: Factory switching without re-login', () => {
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
      .in('username', ['ceo', 'director', 'fm_multi', 'fm1']);

    if (users) {
      for (const user of users) {
        testUsers[user.username] = user;
      }
    }
  });

  test('CEO can switch from Factory 1 to Factory 2 without re-authentication', async () => {
    // Initial setup: CEO selects Factory 1
    await supabase
      .from('user_settings')
      .update({ selected_factory_id: testFactories.plant1 })
      .eq('user_id', testUsers.ceo.id);

    const ceoClient = createSupabaseServiceClient();

    // Verify initial factory selection
    let { data: initialContext } = await ceoClient.rpc('debug_user_context');
    let context = initialContext?.[0];
    expect(context?.current_factory_id).toBe(testFactories.plant1);
    
    console.log(`✅ CEO initial factory: ${context?.current_factory_id === testFactories.plant1 ? 'PLANT1' : 'Other'}`);

    // Switch to Factory 2 using the factory switch function
    const { data: switchResult, error: switchError } = await ceoClient
      .rpc('switch_user_factory', {
        target_factory_id: testFactories.plant2
      });

    expect(switchError).toBeNull();
    expect(switchResult?.[0]?.success).toBe(true);
    expect(switchResult?.[0]?.new_factory_id).toBe(testFactories.plant2);

    console.log(`✅ CEO factory switch result: success=${switchResult?.[0]?.success}`);

    // Verify factory selection changed
    const { data: newContext } = await ceoClient.rpc('debug_user_context');
    const updatedContext = newContext?.[0];
    expect(updatedContext?.current_factory_id).toBe(testFactories.plant2);
    
    console.log(`✅ CEO new factory: ${updatedContext?.current_factory_id === testFactories.plant2 ? 'PLANT2' : 'Other'}`);
  });

  test('Director can switch factories without re-login', async () => {
    // Initial setup: Director with no selected factory (global context)
    await supabase
      .from('user_settings')
      .update({ selected_factory_id: null })
      .eq('user_id', testUsers.director.id);

    const directorClient = createSupabaseServiceClient();

    // Verify initial global context
    let { data: initialContext } = await directorClient.rpc('debug_user_context');
    let context = initialContext?.[0];
    expect(context?.current_factory_id).toBeNull();
    expect(context?.is_global).toBe(true);

    // Switch Director to Factory 1
    const { data: switchResult, error: switchError } = await directorClient
      .rpc('switch_user_factory', {
        target_factory_id: testFactories.plant1
      });

    expect(switchError).toBeNull();
    expect(switchResult?.[0]?.success).toBe(true);

    // Verify factory selection changed
    const { data: newContext } = await directorClient.rpc('debug_user_context');
    const updatedContext = newContext?.[0];
    expect(updatedContext?.current_factory_id).toBe(testFactories.plant1);
    expect(updatedContext?.is_global).toBe(true); // Still global role

    console.log(`✅ Director switched from global to factory context: ${updatedContext?.current_factory_id === testFactories.plant1 ? 'PLANT1' : 'Other'}`);
  });

  test('Multi-factory FM can switch between assigned factories', async () => {
    const fmMultiClient = createSupabaseServiceClient();

    // Verify fm_multi is assigned to both factories
    const { data: assignments } = await supabase
      .from('user_factory_links')
      .select('factory_id, factories(code)')
      .eq('user_id', testUsers.fm_multi.id);

    const assignedFactories = assignments?.map((a: any) => a.factories?.code) || [];
    expect(assignedFactories).toContain('PLANT1');
    expect(assignedFactories).toContain('PLANT2');

    // Start with Factory 1
    const { data: switch1Result } = await fmMultiClient
      .rpc('switch_user_factory', {
        target_factory_id: testFactories.plant1
      });

    expect(switch1Result?.[0]?.success).toBe(true);

    // Verify current factory is Plant 1
    let { data: context1 } = await fmMultiClient.rpc('debug_user_context');
    expect(context1?.[0]?.current_factory_id).toBe(testFactories.plant1);

    // Switch to Factory 2
    const { data: switch2Result } = await fmMultiClient
      .rpc('switch_user_factory', {
        target_factory_id: testFactories.plant2
      });

    expect(switch2Result?.[0]?.success).toBe(true);

    // Verify current factory is now Plant 2
    const { data: context2 } = await fmMultiClient.rpc('debug_user_context');
    expect(context2?.[0]?.current_factory_id).toBe(testFactories.plant2);

    console.log(`✅ Multi-factory FM switched: PLANT1 → PLANT2`);
  });

  test('Factory switch validates user access rights', async () => {
    const fm1Client = createSupabaseServiceClient();

    // FM1 should only be assigned to Plant 1, not Plant 2
    const { data: fm1Assignments } = await supabase
      .from('user_factory_links')
      .select('factory_id, factories(code)')
      .eq('user_id', testUsers.fm1.id);

    const fm1Factories = fm1Assignments?.map((a: any) => a.factories?.code) || [];
    expect(fm1Factories).toContain('PLANT1');
    expect(fm1Factories).not.toContain('PLANT2');

    // Try to switch FM1 to Factory 2 (should fail)
    const { data: switchResult } = await fm1Client
      .rpc('switch_user_factory', {
        target_factory_id: testFactories.plant2
      });

    // Switch should fail due to access validation
    expect(switchResult?.[0]?.success).toBe(false);
    expect(switchResult?.[0]?.error_message).toBeTruthy();

    console.log(`✅ Factory switch validation: FM1 blocked from PLANT2 - ${switchResult?.[0]?.error_message}`);
  });

  test('Factory switch is transactional and creates audit log', async () => {
    const ceoClient = createSupabaseServiceClient();

    // Record initial event count
    const { data: initialEvents } = await supabase
      .from('factory_switch_events')
      .select('id')
      .eq('user_id', testUsers.ceo.id);

    // Perform factory switch
    const { data: switchResult } = await ceoClient
      .rpc('switch_user_factory', {
        target_factory_id: testFactories.plant1,
        p_ip_address: '192.168.1.100',
        p_user_agent: 'PlaywrightTest/1.0'
      });

    expect(switchResult?.[0]?.success).toBe(true);

    // Check that audit event was created
    const { data: newEvents } = await supabase
      .from('factory_switch_events')
      .select('*')
      .eq('user_id', testUsers.ceo.id)
      .order('created_at', { ascending: false })
      .limit(1);

    expect(newEvents?.length).toBe(1);
    const latestEvent = newEvents?.[0];
    expect(latestEvent?.success).toBe(true);
    expect(latestEvent?.event_type).toBe('factory_switched');
    expect(latestEvent?.to_factory_id).toBe(testFactories.plant1);
    expect(latestEvent?.ip_address).toBe('192.168.1.100');

    console.log(`✅ Factory switch created audit event: ${latestEvent?.event_type} at ${latestEvent?.created_at}`);
  });

  test('current_factory() function reflects immediate changes', async () => {
    const directorClient = createSupabaseServiceClient();

    // Test multiple rapid switches to ensure current_factory() is stable
    const factories = [testFactories.plant1, testFactories.plant2, null];
    
    for (const targetFactory of factories) {
      // Switch factory
      const { data: switchResult } = await directorClient
        .rpc('switch_user_factory', {
          target_factory_id: targetFactory
        });

      expect(switchResult?.[0]?.success).toBe(true);

      // Immediately check current_factory()
      const { data: context } = await directorClient.rpc('debug_user_context');
      const currentFactory = context?.[0]?.current_factory_id;
      
      expect(currentFactory).toBe(targetFactory);
      
      console.log(`✅ current_factory() immediately reflects change to: ${targetFactory ? (targetFactory === testFactories.plant1 ? 'PLANT1' : 'PLANT2') : 'NULL'}`);
    }
  });

  test('Data scope changes after factory switch', async () => {
    const ceoClient = createSupabaseServiceClient();

    // Switch CEO to Factory 1
    await ceoClient.rpc('switch_user_factory', {
      target_factory_id: testFactories.plant1
    });

    // Although CEO has global access, test that the context is properly set
    const { data: context1 } = await ceoClient.rpc('debug_user_context');
    expect(context1?.[0]?.current_factory_id).toBe(testFactories.plant1);

    // Query accessible factories (CEO should see all regardless of selection)
    const { data: accessible1 } = await ceoClient.rpc('user_accessible_factories');
    expect(accessible1?.length).toBeGreaterThanOrEqual(2);

    // Switch CEO to Factory 2
    await ceoClient.rpc('switch_user_factory', {
      target_factory_id: testFactories.plant2
    });

    const { data: context2 } = await ceoClient.rpc('debug_user_context');
    expect(context2?.[0]?.current_factory_id).toBe(testFactories.plant2);

    // Accessible factories should be the same (global role)
    const { data: accessible2 } = await ceoClient.rpc('user_accessible_factories');
    expect(accessible2?.length).toBe(accessible1?.length);

    console.log(`✅ CEO data scope: ${accessible1?.length} factories accessible in both contexts`);
  });

  test('Factory switch preserves authentication state', async () => {
    const ceoClient = createSupabaseServiceClient();

    // Perform multiple factory switches
    const switchSequence = [
      testFactories.plant1,
      testFactories.plant2,
      null, // global context
      testFactories.plant1
    ];

    for (let i = 0; i < switchSequence.length; i++) {
      const targetFactory = switchSequence[i];

      const { data: switchResult } = await ceoClient
        .rpc('switch_user_factory', { target_factory_id: targetFactory });

      expect(switchResult?.[0]?.success).toBe(true);
      expect(switchResult?.[0]?.user_role).toBe('CEO');

      // Verify user is still authenticated and has correct role
      const { data: context } = await ceoClient.rpc('debug_user_context');
      expect(context?.[0]?.role).toBe('CEO');
      expect(context?.[0]?.is_global).toBe(true);
    }

    console.log(`✅ Authentication state preserved through ${switchSequence.length} factory switches`);
  });

  test('Concurrent factory switches are handled safely', async () => {
    const ceoClient = createSupabaseServiceClient();

    // Attempt multiple concurrent factory switches
    const concurrentSwitches = Promise.all([
      ceoClient.rpc('switch_user_factory', { target_factory_id: testFactories.plant1 }),
      ceoClient.rpc('switch_user_factory', { target_factory_id: testFactories.plant2 }),
      ceoClient.rpc('switch_user_factory', { target_factory_id: null })
    ]);

    const results = await concurrentSwitches;
    
    // All switches should complete (either succeed or fail gracefully)
    expect(results.length).toBe(3);
    results.forEach(result => {
      expect(result.data).toBeDefined();
      expect(result.data?.[0]).toHaveProperty('success');
    });

    // Final state should be consistent
    const { data: finalContext } = await ceoClient.rpc('debug_user_context');
    expect(finalContext?.[0]).toBeDefined();

    console.log(`✅ Concurrent factory switches handled safely, final context valid`);
  });
});