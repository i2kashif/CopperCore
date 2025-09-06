// Global test setup
import { beforeAll, afterAll } from 'vitest'

beforeAll(async () => {
  // Setup test environment
  process.env.NODE_ENV = 'test'
})

afterAll(async () => {
  // Cleanup after all tests
})