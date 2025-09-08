/**
 * Vitest-specific mocks
 * Separated from auth-helpers to avoid Playwright conflicts
 */

import { vi } from 'vitest';

/**
 * Mock auth service for unit tests
 */
export function createMockAuthService() {
  return {
    login: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
    getCurrentSession: vi.fn(),
    sessionNeedsRefresh: vi.fn(),
    getUserFactories: vi.fn(),
    switchFactory: vi.fn(),
    onFactorySwitch: vi.fn(),
    offFactorySwitch: vi.fn()
  };
}

/**
 * Mock Supabase client for unit tests
 */
export function createMockSupabaseClient() {
  const mockAuth = {
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    refreshSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    getSession: vi.fn(),
    getUser: vi.fn()
  };

  const mockFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis()
  });

  return {
    auth: mockAuth,
    from: mockFrom,
    rpc: vi.fn().mockResolvedValue({ data: null, error: null })
  };
}

/**
 * Create mock JWT for testing
 */
export function createTestJWT(role: string, userId: string, factoryId?: string) {
  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'HS256' }));
  const payload = btoa(JSON.stringify({
    sub: userId,
    role,
    factory_id: factoryId,
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000)
  }));
  
  return `${header}.${payload}.test-signature`;
}