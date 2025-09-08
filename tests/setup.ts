/**
 * CopperCore ERP - Test Setup
 * Global test configuration and setup for Vitest
 */

import { beforeAll, afterEach, vi } from 'vitest';
// import '@testing-library/jest-dom/vitest'; // Commented out - package not installed

// Mock environment variables for tests
beforeAll(() => {
  // Set test environment variables
  Object.defineProperty(import.meta, 'env', {
    value: {
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      MODE: 'test',
      DEV: false,
      PROD: false,
      SSR: false
    },
    writable: true
  });

  // Mock global objects
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock fetch for HTTP requests
  global.fetch = vi.fn();
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Export test utilities
export const TEST_CONSTANTS = {
  BASE_URL: 'http://localhost:3000',
  API_BASE: 'https://test.supabase.co',
  
  // Test user credentials
  VALID_USERS: {
    ceo: { username: 'ceo', password: 'admin123' },
    director: { username: 'director', password: 'dir123456' },
    fm1: { username: 'fm1', password: 'fm123456' },
    fw1: { username: 'fw1', password: 'fw123456' }
  },
  
  INVALID_CREDENTIALS: {
    wrongPassword: { username: 'ceo', password: 'wrongpass' },
    nonExistentUser: { username: 'fakeuser', password: 'any' },
    emptyUsername: { username: '', password: 'admin123' },
    emptyPassword: { username: 'ceo', password: '' }
  }
} as const;