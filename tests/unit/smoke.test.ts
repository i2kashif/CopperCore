/**
 * Smoke Test
 * Basic test to ensure Vitest is configured correctly
 */

import { describe, it, expect } from 'vitest'

describe('smoke test', () => {
  it('runs successfully', () => {
    expect(true).toBe(true)
  })
  
  it('validates environment setup', () => {
    expect(typeof process.env).toBe('object')
  })
})