import { z } from 'zod'
import type { UserRole } from './types'

/**
 * Common validation schemas
 */

// UUID validation
export const uuidSchema = z.string().uuid()

// Factory code validation (3-4 uppercase letters)
export const factoryCodeSchema = z.string().regex(/^[A-Z]{3,4}$/, 'Factory code must be 3-4 uppercase letters')

// Username validation (3-50 alphanumeric, underscore, hyphen)
export const usernameSchema = z.string().regex(/^[a-zA-Z0-9_-]{3,50}$/, 'Username must be 3-50 characters, alphanumeric with underscore/hyphen')

// Email validation
export const emailSchema = z.string().email()

// Name validation (1-100 characters, letters, spaces, hyphens)
export const nameSchema = z.string().regex(/^[a-zA-Z\s-]{1,100}$/, 'Name must be 1-100 characters, letters/spaces/hyphens only')

// Role validation
export const roleSchema = z.enum(['CEO', 'DIRECTOR', 'FACTORY_MANAGER', 'FACTORY_WORKER', 'OFFICE'] as const)

// Date validation (ISO format)
export const isoDateSchema = z.string().datetime()

// Factory validation schemas
export const createFactorySchema = z.object({
  code: factoryCodeSchema,
  name: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional(),  // Made optional
  postal_code: z.string().max(20).optional(),  // Made optional
  country: z.string().min(1).max(100).default('Pakistan'),
  phone: z.string().max(50).optional(),
  email: emailSchema.optional(),
  contact_person: nameSchema.optional(),
  is_active: z.boolean().default(true),
  fiscal_year_start: isoDateSchema.optional()  // Made truly optional, no default
})

export const updateFactorySchema = createFactorySchema.partial().extend({
  version: z.number().int().positive()
})

// User validation schemas
export const createUserSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  first_name: nameSchema,
  last_name: nameSchema,
  role: roleSchema,
  is_active: z.boolean().default(true),
  factory_ids: z.array(uuidSchema).min(0).max(10) // Users can be assigned to multiple factories
})

export const updateUserSchema = createUserSchema.partial().extend({
  version: z.number().int().positive()
})

// User-Factory assignment schemas
export const createUserFactoryAssignmentSchema = z.object({
  user_id: uuidSchema,
  factory_id: uuidSchema,
  is_active: z.boolean().default(true)
})

export const updateUserFactoryAssignmentSchema = z.object({
  is_active: z.boolean(),
  version: z.number().int().positive()
})

// Audit event schema
export const auditEventSchema = z.object({
  entity_type: z.string().min(1).max(100),
  entity_id: uuidSchema,
  action: z.enum(['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT']),
  factory_id: uuidSchema.optional(),
  before_values: z.record(z.unknown()).optional(),
  after_values: z.record(z.unknown()).optional(),
  reason: z.string().max(1000).optional(),
  ip_address: z.string().max(45).optional(),
  user_agent: z.string().max(500).optional()
})

// List query validation
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  sort_by: z.string().max(50).optional(),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
  factory_id: uuidSchema.optional(),
  is_active: z.coerce.boolean().optional()
})

// Password validation (for user creation/update)
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase, uppercase, and number')

/**
 * Validation helper functions
 */

export function validateFactoryScope(userFactoryIds: string[], targetFactoryId: string, isGlobal: boolean): boolean {
  if (isGlobal) return true
  return userFactoryIds.includes(targetFactoryId)
}

export function isGlobalRole(role: UserRole): boolean {
  return role === 'CEO' || role === 'DIRECTOR'
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'CEO' || role === 'DIRECTOR'
}

export function canManageFactories(role: UserRole): boolean {
  return role === 'CEO' || role === 'DIRECTOR'
}

export function canOverrideQC(role: UserRole): boolean {
  return role === 'CEO' || role === 'DIRECTOR'
}

/**
 * Error response helpers
 */
export function createErrorResponse(code: string, message: string, details?: unknown) {
  return {
    success: false,
    error: {
      code,
      message,
      details
    }
  }
}

export function createValidationErrorResponse(errors: z.ZodError) {
  return createErrorResponse('VALIDATION_ERROR', 'Validation failed', errors.errors)
}

export function createSuccessResponse<T>(data: T, meta?: unknown) {
  return {
    success: true,
    data,
    meta
  }
}
