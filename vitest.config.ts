import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

/**
 * CopperCore ERP - Vitest Configuration
 * Unit and integration testing configuration
 */

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    passWithNoTests: true,
    
    /* Test file patterns */
    include: [
      'src/**/*.{test,spec}.{js,ts,tsx}',
      'tests/unit/**/*.{test,spec}.{js,ts,tsx}',
      'tests/integration/**/*.{test,spec}.{js,ts,tsx}'
    ],
    
    /* Exclude patterns */
    exclude: [
      'node_modules',
      'dist',
      'tests/e2e',
      'tests/acceptance'
    ],
    
    /* Coverage configuration */
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'tests/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        'src/main.tsx',
        'src/vite-env.d.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    
    /* Test timeout */
    testTimeout: 10_000,
    
    /* Mock configuration */
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    
    /* Reporter configuration */
    reporters: [
      'verbose',
      'json',
      'junit'
    ],
    
    outputFile: {
      json: './test-results/vitest-report.json',
      junit: './test-results/junit-unit.xml'
    }
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@db': resolve(__dirname, 'db'),
      '@tests': resolve(__dirname, 'tests')
    }
  },
  
  define: {
    global: 'globalThis'
  }
});