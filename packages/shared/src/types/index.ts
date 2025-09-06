import { z } from 'zod'

// Base factory scoping schema
export const factoryIdSchema = z.string().uuid()

// Core entity schemas following PRD-v1.5.md
export const workOrderSchema = z.object({
  id: z.string().uuid(),
  factory_id: factoryIdSchema,
  wo_number: z.string(),
  product_family_id: z.string().uuid(),
  sku_id: z.string().uuid(),
  target_quantity: z.number().positive(),
  current_quantity: z.number().min(0),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  version: z.number().int().min(1),
})

export const packingUnitSchema = z.object({
  id: z.string().uuid(),
  factory_id: factoryIdSchema,
  pu_code: z.string(),
  work_order_id: z.string().uuid(),
  inventory_lot_id: z.string().uuid(),
  quantity: z.number().positive(),
  unit: z.string(),
  status: z.enum(['CREATED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED']),
  qc_status: z.enum(['PENDING', 'PASS', 'HOLD', 'FAIL']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  version: z.number().int().min(1),
})

export const dispatchNoteSchema = z.object({
  id: z.string().uuid(),
  factory_id: factoryIdSchema,
  dn_number: z.string(),
  customer_id: z.string().uuid().optional(),
  destination_factory_id: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'DISPATCHED', 'DELIVERED', 'CANCELLED']),
  dispatch_date: z.string().date(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  version: z.number().int().min(1),
})

export const grnSchema = z.object({
  id: z.string().uuid(),
  factory_id: factoryIdSchema,
  grn_number: z.string(),
  dispatch_note_id: z.string().uuid().optional(),
  source_factory_id: z.string().uuid().optional(),
  receipt_date: z.string().date(),
  status: z.enum(['PENDING', 'RECEIVED', 'DISCREPANCY']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  version: z.number().int().min(1),
})

// User and authentication schemas
export const userRoleSchema = z.enum(['CEO', 'DIRECTOR', 'FACTORY_MANAGER', 'FACTORY_WORKER'])

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  factory_id: factoryIdSchema.nullable(),
  role: userRoleSchema,
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

// Export types
export type WorkOrder = z.infer<typeof workOrderSchema>
export type PackingUnit = z.infer<typeof packingUnitSchema>
export type DispatchNote = z.infer<typeof dispatchNoteSchema>
export type GRN = z.infer<typeof grnSchema>
export type UserRole = z.infer<typeof userRoleSchema>
export type User = z.infer<typeof userSchema>

// API response wrapper
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    meta: z.object({
      total: z.number().optional(),
      page: z.number().optional(),
      limit: z.number().optional(),
    }).optional(),
  })

export type ApiResponse<T> = {
  data: T
  meta?: {
    total?: number
    page?: number
    limit?: number
  }
}